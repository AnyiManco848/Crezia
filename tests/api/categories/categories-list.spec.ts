import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { listCategories } from '../../../services/categories.service'
import { logResponse } from '../../../utils/log'

/** Agrupa los tests de paginación del listado (GET /api/categories): el cuerpo es un array y los totales van en headers */
test.describe('Categories API - GET /api/categories pagination', () => {
  /** Caso de prueba: sin parámetros usa page=1 y limit=50 y responde un array */
  test('should return an array with the default pagination headers', async ({ request, authToken }) => {
    let response: APIResponse

    await test.step('Send request without pagination params', async () => {
      response = await listCategories(request, authToken)
      await logResponse(response)
    })

    await test.step('Validate status, body and headers', async () => {
      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeLessThanOrEqual(50)
      expect(response.headers()['x-page']).toBe('1')
      expect(response.headers()['x-limit']).toBe('50')
      expect(Number(response.headers()['x-total-count'])).toBeGreaterThanOrEqual(body.length)
    })
  })

  /** Caso de prueba: limit=1 devuelve como máximo un elemento y lo refleja en X-Limit */
  test('should honor limit and page', async ({ request, authToken }) => {
    let response: APIResponse

    await test.step('Send request with page=1 and limit=1', async () => {
      response = await listCategories(request, authToken, { page: 1, limit: 1 })
      await logResponse(response)
    })

    await test.step('Validate status, body and headers', async () => {
      expect(response.status()).toBe(200)
      expect((await response.json()).length).toBeLessThanOrEqual(1)
      expect(response.headers()['x-page']).toBe('1')
      expect(response.headers()['x-limit']).toBe('1')
    })
  })

  /** Caso de prueba: una página más allá del final devuelve un array vacío con el total intacto */
  test('should return an empty array for a page beyond the last one', async ({ request, authToken }) => {
    let response: APIResponse

    await test.step('Send request with a very high page', async () => {
      response = await listCategories(request, authToken, { page: 100000, limit: 100 })
      await logResponse(response)
    })

    await test.step('Validate status and body', async () => {
      expect(response.status()).toBe(200)
      expect(await response.json()).toEqual([])
      expect(response.headers()['x-page']).toBe('100000')
    })
  })

  /** Caso de prueba: error cuando limit o page no son válidos */
  for (const query of [{ limit: 101 }, { limit: 0 }, { limit: 'abc' }, { page: 0 }]) {
    test(`should fail with 400 when the query is ${JSON.stringify(query)}`, async ({ request, authToken }) => {
      let response: APIResponse

      await test.step('Send request with invalid pagination params', async () => {
        response = await listCategories(request, authToken, query)
        await logResponse(response)
      })

      await test.step('Validate error response', async () => {
        expect(response.status()).toBe(400)
        expect((await response.json()).error.code).toBe('VALIDATION_ERROR')
      })
    })
  }

  /** Caso de prueba: error cuando no se envía el token */
  test('should fail with 401 when the token is missing', async ({ request }) => {
    const response = await listCategories(request, undefined)
    expect(response.status()).toBe(401)
  })
})
