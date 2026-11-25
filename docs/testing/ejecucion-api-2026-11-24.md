# Ejecución de las pruebas de API — 2026-11-24

- **Fecha:** 2026-11-24 (las ejecuciones se hicieron entre las 22:00 y las 22:25, hora de Colombia).
- **Base usada:** PostgreSQL **local** `crezia_test` (localhost:5432, zona horaria del servidor `America/Bogota`). Nunca la base real ni Supabase.
- **Comando:** `npm run test:api:test` con `E2E_TEST_DB_CONFIRMED=true` (carga `.env.test`, verifica con `db:test:check` que la base no es la real y levanta el backend de pruebas).

## Totales

| Momento | Pruebas | Pasan | Fallan | Omitidas |
|---|---:|---:|---:|---:|
| Primera ejecución (antes de los arreglos) | 77 | 72 | 4 | 1 |
| Después de los arreglos | 79 | 77 | 1 | 1 |

Las 2 pruebas de más son las nuevas de DEF-002 (`tests/api/auth/register-adult-boundary.spec.ts`), que pasan.
Además, `tests/infrastructure/PrismaUserRepository.test.ts` (Vitest, 6 pruebas) pasa y no cuenta en esta tabla.

## Fallas iniciales: causa y clasificación

| # | Prueba | Causa | Clasificación | Acción |
|---|---|---|---|---|
| 1 | `register.spec.ts:106` «rejects a person under 18 and accepts one who turns 18 today» | La API calcula la edad con la fecha UTC; `chk_users_adult` usa `CURRENT_DATE` de la sesión de la base (`America/Bogota`). Entre las 19:00 y las 24:00 locales difieren en un día: la API acepta, la base rechaza (`23514`) y salía 500. | **Defecto del producto** (DEF-002, severidad baja; no se manifiesta en la Supabase real, que está en UTC). El entorno lo deja a la vista. | Error `23514` convertido en 400. Arreglo de fondo (migración) pendiente. |
| 2 | `movements-summary.spec.ts:72` | `POST /api/movements` sin cuenta y sin `currencyCode` devuelve 400 «La moneda es obligatoria cuando el movimiento no tiene cuenta bancaria» (regla documentada, `resolveCurrency`). El helper `add` no enviaba moneda. | **Defecto de la prueba** (desactualizada). El producto es correcto. | Helper `add` con `currencyCode: 'COP'` por defecto. |
| 3 | `movements-summary.spec.ts:104` | Misma causa que la 2. | **Defecto de la prueba.** | Mismo arreglo. |
| 4 | `movements-summary.spec.ts:122` | Misma causa que la 2. | **Defecto de la prueba.** | Mismo arreglo. |

Las fechas antiguas (2001) **no** eran el problema: con la moneda enviada se crean con 201.

## Prueba omitida: límite de intentos del registro

- **Prueba:** `register.spec.ts:158` «answers 429 with Retry-After once the limit is exceeded, even for invalid attempts».
- **Por qué se omite:** se omite a propósito (`test.skip(!limit, …)`) cuando no está definida `E2E_REGISTER_RATE_LIMIT_MAX`. La ejecución normal mantiene el límite alto (`REGISTER_RATE_LIMIT_MAX=1000` en `.env.test`) para que el resto de la suite pueda registrar usuarios; esta prueba solo tiene sentido contra un backend arrancado con un límite bajo.
- **Cómo se corre:** `npm run test:api:ratelimit` (script `scripts/test-api-ratelimit.cjs`). Pasa la guarda de base de pruebas, arranca el backend con límite 5 (configurable con `RATE_LIMIT_TEST_MAX`, 1–100) solo para ese proceso y corre únicamente esa prueba. No modifica `.env.test` ni afecta la ejecución normal. Sigue exigiendo `E2E_TEST_DB_CONFIRMED=true`.
- **Resultado (2026-11-24):** 1 prueba, pasa.
- **Sin la confirmación** (`E2E_TEST_DB_CONFIRMED` sin definir) la prueba falla en la guarda, como debe.

## Resultado final de la suite completa

- 79 pruebas: **77 pasan, 1 falla, 1 se omite**.
- **La falla que queda** es `register.spec.ts:106` (la misma de DEF-002): ahora responde **400** en lugar de 500 el día límite y la prueba espera 201. Es dependiente de la hora (ventana 19:00–24:00 con la base local en hora de Colombia). **No se modificó** a la espera de tu decisión; opciones: aceptar «201 o 400 con mensaje claro» el día límite, o esperar el arreglo de fondo (migración).
- **La omitida** es la del límite de intentos (se corre con `npm run test:api:ratelimit`).
- Las 3 fallas de `movements-summary` pasan.

## Cambios hechos a partir de esta ejecución

- `src/infrastructure/repositories/PrismaUserRepository.ts`: conversión de `chk_users_adult` (23514) en `ValidationError` 400.
- `tests/infrastructure/PrismaUserRepository.test.ts` (nuevo), `tests/api/auth/register-adult-boundary.spec.ts` (nuevo).
- `tests/api/movements/movements-summary.spec.ts`: helper `add` con COP por defecto y mensaje de error con el cuerpo de la respuesta.
- `scripts/test-api-ratelimit.cjs` y script `test:api:ratelimit` en `package.json`.
- Sin cambios en `birthDateForAge`, en migraciones ni en `docs/db/crezia_schema_v2.sql`.
