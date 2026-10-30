import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { createMovement, deleteMovement } from '../../../services/movements.service'
import { createCategory, deleteCategory } from '../../../services/categories.service'
import { createBankAccount, deleteBankAccount } from '../../../services/bank-accounts.service'
import { NON_EXISTENT_ID, bankAccountPayload, categoryPayload, movementPayload } from '../../../data/payloads'
import { rememberIfCreated } from '../../../utils/cleanup'
import { logResponse } from '../../../utils/log'

/** Agrupa los tests de creación de movimientos (POST /api/movements) */
test.describe('Movements API - POST /api/movements', () => {
  const createdIds: string[] = []
  let categoryId: string
  let bankAccountId: string

  /** Preparación: crea una categoría y una cuenta propias para los movimientos */
  test.beforeAll(async ({ apiRequest, authToken }) => {
    const category = await createCategory(apiRequest, authToken, categoryPayload())
    expect(category.status(), 'Setup: create category').toBe(201)
    categoryId = (await category.json()).id

    const account = await createBankAccount(apiRequest, authToken, bankAccountPayload())
    expect(account.status(), 'Setup: create bank account').toBe(201)
    bankAccountId = (await account.json()).id
  })

  /** Limpieza: borra los movimientos creados en cada prueba */
  test.afterEach(async ({ request, authToken }) => {
    for (const id of createdIds.splice(0)) {
      const response = await deleteMovement(request, authToken, id)
      expect(response.status(), `Cleanup of movement ${id}`).toBe(200)
    }
  })

  /** Limpieza final: borra la cuenta y la categoría de la preparación */
  test.afterAll(async ({ apiRequest, authToken }) => {
    if (bankAccountId) expect((await deleteBankAccount(apiRequest, authToken, bankAccountId)).status()).toBe(200)
    if (categoryId) expect((await deleteCategory(apiRequest, authToken, categoryId)).status()).toBe(200)
  })

  /** Caso de prueba: crear un gasto con cuenta y categoría válidas */
  test('should create an Expense when account and category are valid', async ({ request, authToken }) => {
    let response: APIResponse
    let body
    const payload = movementPayload({ categoryId, bankAccountId })

    await test.step('Send request to create movement', async () => {
      response = await createMovement(request, authToken, payload)
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(201)
    })

    await test.step('Validate response structure', async () => {
      body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body).toMatchObject({
        categoryId,
        bankAccountId,
        type: 'Expense',
        amount: '45000.50',
        currencyCode: 'COP',
        date: payload.date,
        paymentMethod: payload.paymentMethod,
        source: 'Manual',
        description: payload.description,
      })
    })
  })

  /** Casos de prueba: montos que no son mayores a 0 o tienen más de 2 decimales */
  const invalidAmounts = [
    { title: 'amount is negative', amount: '-100', message: 'El monto debe ser mayor a 0' },
    { title: 'amount is zero', amount: '0', message: 'El monto debe ser mayor a 0' },
    {
      title: 'amount has more than 2 decimals',
      amount: '100.123',
      message: 'El monto admite hasta 12 dígitos enteros y 2 decimales',
    },
  ]

  for (const { title, amount, message } of invalidAmounts) {
    test(`should fail with 400 when ${title}`, async ({ request, authToken }) => {
      let response: APIResponse
      let body

      await test.step(`Send request with amount ${amount}`, async () => {
        response = await createMovement(request, authToken, movementPayload({ categoryId, bankAccountId, amount }))
        await logResponse(response)
        await rememberIfCreated(response, createdIds)
      })

      await test.step('Validate HTTP status code', async () => {
        expect(response.status()).toBe(400)
      })

      await test.step('Validate error response', async () => {
        body = await response.json()
        expect(body.error.code).toBe('VALIDATION_ERROR')
        expect(body.error.details).toContainEqual({ path: 'body.amount', message })
      })
    })
  }

  /** Caso de prueba: error cuando la categoría no existe */
  test('should fail with 400 when category does not exist', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request with non-existent categoryId', async () => {
      response = await createMovement(request, authToken, movementPayload({ categoryId: NON_EXISTENT_ID, bankAccountId }))
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(400)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.details).toContainEqual({
        path: 'body.categoryId',
        message: 'La categoría no existe, fue eliminada o no te pertenece',
      })
    })
  })

  /** Caso de prueba: error cuando falta categoryId */
  test('should fail with 400 when categoryId is missing', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request without categoryId', async () => {
      response = await createMovement(request, authToken, movementPayload({ bankAccountId }))
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(400)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.details).toContainEqual({
        path: 'body.categoryId',
        message: 'La categoría es obligatoria y debe ser un UUID válido',
      })
    })
  })

  /** Caso de prueba: error cuando no se envía token */
  test('should fail with 401 when token is missing', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send request without token', async () => {
      response = await createMovement(request, undefined, movementPayload({ categoryId, bankAccountId }))
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(401)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Falta el token de autenticación')
    })
  })
})
