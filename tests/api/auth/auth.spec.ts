import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { login } from '../../../services/auth.service'
import { testUser } from '../../../data/users'
import { logResponse } from '../../../utils/log'

const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos'

/** Agrupa los tests del login (POST /api/auth/login) */
test.describe('Auth API - POST /api/auth/login', () => {

  /** Caso de prueba: login exitoso con el usuario de prueba; devuelve token y user sin passwordHash */
  test('should return token and user when credentials are valid', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send login request with valid credentials', async () => {
      response = await login(request, testUser)
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(200)
    })

    await test.step('Validate response structure', async () => {
      body = await response.json()
      expect(typeof body.token).toBe('string')
      expect(body.token.split('.')).toHaveLength(3)
      expect(body.user).toMatchObject({ email: testUser.email })
      expect(body.user).toHaveProperty('id')
      expect(body.user).not.toHaveProperty('passwordHash')
    })
  })

  /** Caso de prueba: contraseña incorrecta para un correo que sí existe */
  test('should fail with 401 when password is wrong', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send login request with wrong password', async () => {
      response = await login(request, { email: testUser.email, password: 'WrongPassword123*' })
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(401)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe(INVALID_CREDENTIALS_MESSAGE)
    })
  })

  /** Caso de prueba: correo inexistente; debe dar el mismo mensaje que la contraseña incorrecta */
  test('should fail with 401 and the same message when email does not exist', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send login request with non-existent email', async () => {
      response = await login(request, { email: `no-existe-${Date.now()}@crezia.com`, password: testUser.password })
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(401)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('UNAUTHORIZED')
      expect(body.error.message).toBe(INVALID_CREDENTIALS_MESSAGE)
    })
  })

  /** Caso de prueba: correo con formato inválido */
  test('should fail with 400 when email format is invalid', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send login request with invalid email', async () => {
      response = await login(request, { email: 'correo-invalido', password: testUser.password })
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(400)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.details).toContainEqual({ path: 'body.email', message: 'El correo no es válido' })
    })
  })

  /** Caso de prueba: petición sin el campo password */
  test('should fail with 400 when password is missing', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send login request without password', async () => {
      response = await login(request, { email: testUser.email })
      await logResponse(response)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(400)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.details).toContainEqual({ path: 'body.password', message: 'La contraseña es obligatoria' })
    })
  })
})
