import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { createCategory, deleteCategory } from '../../../services/categories.service'
import { categoryPayload } from '../../../data/payloads'
import { rememberIfCreated } from '../../../utils/cleanup'
import { logResponse } from '../../../utils/log'

/** Agrupa los tests de creación de categorías (POST /api/categories) */
test.describe('Categories API - POST /api/categories', () => {
  const createdIds: string[] = []

  /** Limpieza: borra (soft delete) toda categoría que haya creado la prueba */
  test.afterEach(async ({ request, authToken }) => {
    for (const id of createdIds.splice(0)) {
      const response = await deleteCategory(request, authToken, id)
      expect(response.status(), `Cleanup of category ${id}`).toBe(200)
    }
  })

  /** Caso de prueba: crear una categoría propia con nombre y descripción */
  test('should create a category when name and description are valid', async ({ request, authToken }) => {
    let response: APIResponse
    let body
    const payload = categoryPayload()

    await test.step('Send request to create category', async () => {
      response = await createCategory(request, authToken, payload)
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(201)
    })

    await test.step('Validate response structure', async () => {
      body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body.name).toBe(payload.name)
      expect(body.description).toBe(payload.description)
      expect(body.isDefault).toBe(false)
    })
  })

  /** Caso de prueba: error cuando falta el nombre */
  test('should fail with 400 when name is missing', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request without name', async () => {
      response = await createCategory(request, authToken, { description: 'Sin nombre' })
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(400)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.details).toContainEqual({ path: 'body.name', message: 'El nombre es obligatorio' })
    })
  })

  /** Caso de prueba: error cuando no se envía token */
  test('should fail with 401 when token is missing', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send request without token', async () => {
      response = await createCategory(request, undefined, categoryPayload())
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

  /** Caso de prueba: error cuando el token no es válido */
  test('should fail with 401 when token is invalid', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send request with invalid token', async () => {
      response = await createCategory(request, 'invalid.token.value', categoryPayload())
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(401)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe('Token inválido o expirado')
    })
  })
})
