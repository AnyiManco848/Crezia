import { APIResponse } from '@playwright/test'
import { test, expect } from '../../../fixtures/auth.fixture'
import { createBankAccount, deleteBankAccount } from '../../../services/bank-accounts.service'
import { bankAccountPayload } from '../../../data/payloads'
import { rememberIfCreated } from '../../../utils/cleanup'
import { logResponse } from '../../../utils/log'

/** Agrupa los tests de creación de cuentas bancarias (POST /api/bank-accounts) */
test.describe('Bank Accounts API - POST /api/bank-accounts', () => {
  const createdIds: string[] = []

  /** Limpieza: borra (soft delete) toda cuenta que haya creado la prueba */
  test.afterEach(async ({ request, authToken }) => {
    for (const id of createdIds.splice(0)) {
      const response = await deleteBankAccount(request, authToken, id)
      expect(response.status(), `Cleanup of bank account ${id}`).toBe(200)
    }
  })

  /** Caso de prueba: crear una cuenta válida; una cuenta nueva arranca con saldo "0.00" */
  test('should create a bank account with balance 0.00 when data is valid', async ({ request, authToken }) => {
    let response: APIResponse
    let body
    const payload = bankAccountPayload()

    await test.step('Send request to create bank account', async () => {
      response = await createBankAccount(request, authToken, payload)
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
        bankName: payload.bankName,
        accountAlias: payload.accountAlias,
        accountType: payload.accountType,
        currencyCode: payload.currencyCode,
        balance: '0.00',
      })
    })
  })

  /** Caso de prueba: error cuando accountType no es uno de los permitidos */
  test('should fail with 400 when accountType is invalid', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request with invalid accountType', async () => {
      response = await createBankAccount(request, authToken, bankAccountPayload({ accountType: 'Investment' }))
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
        path: 'body.accountType',
        message: 'El tipo de cuenta debe ser uno de: Savings, Checking, Credit, Other',
      })
    })
  })

  /** Caso de prueba: error cuando la moneda no tiene formato de 3 letras */
  test('should fail with 400 when currencyCode format is invalid', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request with malformed currencyCode', async () => {
      response = await createBankAccount(request, authToken, bankAccountPayload({ currencyCode: 'CO1' }))
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
        path: 'body.currencyCode',
        message: 'La moneda debe ser un código de 3 letras (por ejemplo COP)',
      })
    })
  })

  /** Caso de prueba: error cuando la moneda tiene buen formato pero no existe */
  test('should fail with 400 when currencyCode does not exist', async ({ request, authToken }) => {
    let response: APIResponse
    let body

    await test.step('Send request with non-existent currencyCode', async () => {
      response = await createBankAccount(request, authToken, bankAccountPayload({ currencyCode: 'XYZ' }))
      await logResponse(response)
      await rememberIfCreated(response, createdIds)
    })

    await test.step('Validate HTTP status code', async () => {
      expect(response.status()).toBe(400)
    })

    await test.step('Validate error response', async () => {
      body = await response.json()
      expect(body.error.code).toBe('VALIDATION_ERROR')
      expect(body.error.message).toBe('La moneda XYZ no existe o no está activa')
      expect(body.error.details[0].path).toBe('body.currencyCode')
    })
  })

  /** Caso de prueba: error cuando no se envía token */
  test('should fail with 401 when token is missing', async ({ request }) => {
    let response: APIResponse
    let body

    await test.step('Send request without token', async () => {
      response = await createBankAccount(request, undefined, bankAccountPayload())
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
