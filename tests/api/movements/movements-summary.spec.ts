import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { createMovement, deleteMovement, getMovementSummary } from '../../../services/movements.service'
import { createCategory, deleteCategory } from '../../../services/categories.service'
import { categoryPayload, movementPayload } from '../../../data/payloads'
import { logResponse } from '../../../utils/log'

// Periods in the year 2001 (one per test group) so the user's real movements never fall inside them
// and the totals can be asserted exactly.
const EMPTY = { from: '2001-01-01', to: '2001-01-31' }
const TOTALS = { from: '2001-03-01', to: '2001-03-31' }
const MANY = { from: '2001-05-01', to: '2001-05-31' }
const USD = { from: '2001-06-01', to: '2001-06-30' }

/** Agrupa los tests del resumen de movimientos (GET /api/movements/summary) */
test.describe('Movements API - GET /api/movements/summary', () => {
  const createdIds: string[] = []
  let categoryId: string

  /** Preparación: crea una categoría propia para los movimientos */
  test.beforeAll(async ({ apiRequest, authToken }) => {
    const category = await createCategory(apiRequest, authToken, categoryPayload())
    expect(category.status(), 'Setup: create category').toBe(201)
    categoryId = (await category.json()).id
  })

  /** Limpieza: borra los movimientos creados en cada prueba */
  test.afterEach(async ({ request, authToken }) => {
    for (const id of createdIds.splice(0)) {
      const response = await deleteMovement(request, authToken, id)
      expect(response.status(), `Cleanup of movement ${id}`).toBe(200)
    }
  })

  /** Limpieza final: borra la categoría de la preparación */
  test.afterAll(async ({ apiRequest, authToken }) => {
    if (categoryId) expect((await deleteCategory(apiRequest, authToken, categoryId)).status()).toBe(200)
  })

  /** Crea un movimiento y guarda su id para borrarlo al terminar */
  async function add(request: Parameters<typeof createMovement>[0], token: string, overrides: object) {
    const response = await createMovement(request, token, movementPayload({ categoryId, ...overrides }))
    expect(response.status(), 'Setup: create movement').toBe(201)
    const { id } = await response.json()
    createdIds.push(id)
    return id as string
  }

  /** Caso de prueba: un periodo sin movimientos responde ceros y movementCount 0 */
  test('should return zeros when the period has no movements', async ({ request, authToken }) => {
    let response: APIResponse

    await test.step('Send request for an empty period', async () => {
      response = await getMovementSummary(request, authToken, EMPTY)
      await logResponse(response)
    })

    await test.step('Validate status and body', async () => {
      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual({
        ...EMPTY,
        currencyCode: 'COP',
        totalIncome: '0.00',
        totalExpense: '0.00',
        balance: '0.00',
        movementCount: 0,
      })
    })
  })

  /** Caso de prueba: suma ingresos y egresos, incluye los días límite y deja fuera lo de fuera del periodo */
  test('should add income and expenses, include both limit days and leave out other dates', async ({
    request,
    authToken,
  }) => {
    let response: APIResponse

    await test.step('Create movements inside and outside the period', async () => {
      await add(request, authToken, { type: 'Income', amount: '100000.10', date: '2001-03-01' })
      await add(request, authToken, { type: 'Expense', amount: '40000.05', date: '2001-03-31' })
      await add(request, authToken, { type: 'Expense', amount: '999.00', date: '2001-02-28' })
      await add(request, authToken, { type: 'Expense', amount: '888.00', date: '2001-04-01' })
    })

    await test.step('Send request for the period', async () => {
      response = await getMovementSummary(request, authToken, TOTALS)
      await logResponse(response)
    })

    await test.step('Validate the totals', async () => {
      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual({
        ...TOTALS,
        currencyCode: 'COP',
        totalIncome: '100000.10',
        totalExpense: '40000.05',
        balance: '60000.05',
        movementCount: 2,
      })
    })
  })

  /** Caso de prueba: los movimientos borrados no suman */
  test('should not count a deleted movement', async ({ request, authToken }) => {
    let deletedId: string

    await test.step('Create two movements and delete one', async () => {
      await add(request, authToken, { type: 'Expense', amount: '1000.00', date: '2001-03-10' })
      deletedId = await add(request, authToken, { type: 'Expense', amount: '5000.00', date: '2001-03-11' })
      expect((await deleteMovement(request, authToken, deletedId)).status()).toBe(200)
      createdIds.splice(createdIds.indexOf(deletedId), 1)
    })

    await test.step('Validate that only the active one counts', async () => {
      const body = await (await getMovementSummary(request, authToken, TOTALS)).json()
      expect(body.totalExpense).toBe('1000.00')
      expect(body.movementCount).toBe(1)
    })
  })

  /** Caso de prueba: cubre todos los movimientos del periodo, aunque la lista pagine de a 20 */
  test('should cover more movements than one page of the list', async ({ request, authToken }) => {
    test.slow()

    await test.step('Create 21 movements', async () => {
      for (let i = 0; i < 21; i++) {
        await add(request, authToken, { type: 'Expense', amount: '1000.00', date: '2001-05-15' })
      }
    })

    await test.step('Validate that the summary covers the 21', async () => {
      const response = await getMovementSummary(request, authToken, MANY)
      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.movementCount).toBe(21)
      expect(body.totalExpense).toBe('21000.00')
    })
  })

  /** Caso de prueba: una sola moneda por respuesta; COP por defecto */
  test('should only add the movements of the requested currency', async ({ request, authToken }) => {
    await test.step('Create a COP and a USD movement without account', async () => {
      await add(request, authToken, { type: 'Expense', amount: '1000.00', currencyCode: 'COP', date: '2001-06-10' })
      await add(request, authToken, { type: 'Expense', amount: '50.00', currencyCode: 'USD', date: '2001-06-10' })
    })

    await test.step('Validate COP by default and USD when requested', async () => {
      const cop = await (await getMovementSummary(request, authToken, USD)).json()
      expect(cop).toMatchObject({ currencyCode: 'COP', totalExpense: '1000.00', movementCount: 1 })

      const usd = await (await getMovementSummary(request, authToken, { ...USD, currencyCode: 'usd' })).json()
      expect(usd).toMatchObject({ currencyCode: 'USD', totalExpense: '50.00', movementCount: 1 })
    })
  })

  /** Caso de prueba: error 400 cuando el periodo o la moneda no son válidos */
  for (const [name, query] of [
    ['from is missing', { to: '2001-03-31' }],
    ['to is missing', { from: '2001-03-01' }],
    ['the date is malformed', { from: 'hoy', to: '2001-03-31' }],
    ['from is later than to', { from: '2001-03-31', to: '2001-03-01' }],
    ['the period is longer than 366 days', { from: '2001-01-01', to: '2002-01-02' }],
    ['the currency is invalid', { ...TOTALS, currencyCode: 'XX' }],
  ] as const) {
    test(`should fail with 400 when ${name}`, async ({ request, authToken }) => {
      let response: APIResponse

      await test.step('Send request with an invalid query', async () => {
        response = await getMovementSummary(request, authToken, query)
        await logResponse(response)
      })

      await test.step('Validate error response', async () => {
        expect(response.status()).toBe(400)
        expect((await response.json()).error.code).toBe('VALIDATION_ERROR')
      })
    })
  }

  /** Caso de prueba: la ruta no se confunde con GET /api/movements/:id */
  test('should not answer "invalid id" for the summary route', async ({ request, authToken }) => {
    const response = await getMovementSummary(request, authToken, TOTALS)

    expect(response.status()).toBe(200)
  })

  /** Caso de prueba: error cuando no se envía el token */
  test('should fail with 401 when the token is missing', async ({ request }) => {
    const response = await getMovementSummary(request, undefined, TOTALS)

    expect(response.status()).toBe(401)
  })
})
