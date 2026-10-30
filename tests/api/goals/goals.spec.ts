import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { createGoal, deleteGoal } from '../../../services/goals.service'
import { createCategory, deleteCategory } from '../../../services/categories.service'
import { categoryPayload, goalPayload, isoDate } from '../../../data/payloads'
import { rememberIfCreated } from '../../../utils/cleanup'
import { logResponse } from '../../../utils/log'

/** Agrupa los tests de creación de metas de ahorro (POST /api/goals) */
test.describe('Goals API - POST /api/goals', () => {
  const createdIds: string[] = []
  let categoryId: string

  /** Preparación: crea una categoría propia sin metas (la categoría Ahorro del seed ya tiene una meta activa) */
  test.beforeAll(async ({ apiRequest, authToken }) => {
    const category = await createCategory(apiRequest, authToken, categoryPayload())
    expect(category.status(), 'Setup: create category').toBe(201)
    categoryId = (await category.json()).id
  })

  /** Limpieza: borra las metas creadas en cada prueba, para que la categoría quede libre */
  test.afterEach(async ({ request, authToken }) => {
    for (const id of createdIds.splice(0)) {
      const response = await deleteGoal(request, authToken, id)
      expect(response.status(), `Cleanup of goal ${id}`).toBe(200)
    }
  })

  /** Limpieza final: borra la categoría de la preparación */
  test.afterAll(async ({ apiRequest, authToken }) => {
    if (categoryId) expect((await deleteCategory(apiRequest, authToken, categoryId)).status()).toBe(200)
  })

  /** Caso de prueba: crear una meta válida; arranca Active y con el progreso calculado */
  test('should create an Active goal with computed progress when data is valid', async ({ request, authToken }) => {
    let response: APIResponse
    let body
    const payload = goalPayload({ categoryId })

    await test.step('Send request to create goal', async () => {
      response = await createGoal(request, authToken, payload)
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
        name: payload.name,
        reason: 'Travel',
        reasonOther: null,
        targetAmount: '1500000.00',
        currencyCode: 'COP',
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: 'Active',
        // The category is new and has no movements.
        accumulated: '0.00',
        remaining: '1500000.00',
        percentage: 0,
      })
    })
  })

  /** Caso de prueba: error cuando la fecha fin ya pasó */
  test('should fail with 400 when endDate is in the past', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request with past endDate', async () => {
      response = await createGoal(
        request,
        authToken,
        goalPayload({ categoryId, startDate: isoDate(-60), endDate: isoDate(-30) }),
      )
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
        path: 'body.endDate',
        message: 'La fecha fin no puede estar en el pasado',
      })
    })
  })

  /** Casos de prueba: fecha fin igual o anterior a la fecha inicio */
  const invalidRanges = [
    { title: 'endDate equals startDate', startDate: isoDate(10), endDate: isoDate(10) },
    { title: 'endDate is before startDate', startDate: isoDate(20), endDate: isoDate(10) },
  ]

  for (const { title, startDate, endDate } of invalidRanges) {
    test(`should fail with 400 when ${title}`, async ({ request, authToken }) => {
      let response: APIResponse
      let body

      await test.step(`Send request with startDate ${startDate} and endDate ${endDate}`, async () => {
        response = await createGoal(request, authToken, goalPayload({ categoryId, startDate, endDate }))
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
          path: 'body.endDate',
          message: 'La fecha fin debe ser posterior a la fecha inicio',
        })
      })
    })
  }

  /** Caso de prueba: error cuando el motivo es Other y no se describe en reasonOther */
  test('should fail with 400 when reason is Other without reasonOther', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request with reason Other and no reasonOther', async () => {
      response = await createGoal(request, authToken, goalPayload({ categoryId, reason: 'Other' }))
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
        path: 'body.reasonOther',
        message: 'Describe el motivo cuando el motivo es Other',
      })
    })
  })

  /** Caso de prueba: conflicto al crear una segunda meta activa en la misma categoría */
  test('should fail with 409 when the category already has an active goal', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Create the first active goal', async () => {
      const first = await createGoal(request, authToken, goalPayload({ categoryId }))
      await logResponse(first)
      await rememberIfCreated(first, createdIds)
      expect(first.status()).toBe(201)
    })

    await test.step('Send request to create a second goal in the same category', async () => {
      response = await createGoal(request, authToken, goalPayload({ categoryId }))
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(409)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('CONFLICT')
      expect(body.error.message).toBe(
        'Ya tienes una meta activa en esta categoría. Complétala, cancélala o elimínala antes de crear otra',
      )
    })
  })

  /** Caso de prueba: error cuando no se envía token */
  test('should fail with 401 when token is missing', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send request without token', async () => {
      response = await createGoal(request, undefined, goalPayload({ categoryId }))
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
