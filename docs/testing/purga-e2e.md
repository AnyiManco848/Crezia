# Purga de filas E2E en la base de pruebas

Los E2E del front crean categorías, cuentas, metas y movimientos y los borran **por la API**, que solo hace *soft delete* (`deleted_at`). Las filas quedan en `crezia_test` y se acumulan en cada corrida. Este script las borra de verdad.

## Uso

Desde la raíz del repo, en PowerShell:

```powershell
$env:E2E_TEST_DB_CONFIRMED = "true"        # confirmas que .env.test apunta a la base de PRUEBAS
npm run db:test:purge-e2e -- --dry-run     # simulacro: solo cuenta, no borra
npm run db:test:purge-e2e                  # borra y muestra cuántas filas por tabla
```

Imprime, por ejemplo:

```
Filas E2E purgadas (borrado definitivo):
  movimientos: 1
  metas:       1
  cuentas:     1
  categorías:  2
```

Es idempotente: una segunda pasada imprime ceros.

## Qué borra (y qué no)

Solo filas que cumplen **todo** esto:

| Tabla | Condición |
|---|---|
| `movements` | `deleted_at` no nulo **y** `description` empieza por `E2E ` |
| `goals` | `deleted_at` no nulo **y** `name` empieza por `E2E ` |
| `bank_accounts` | `deleted_at` no nulo, `bank_name` empieza por `E2E ` y ningún movimiento la referencia |
| `categories` | `deleted_at` no nulo, tiene dueño (`user_id` no nulo: las del sistema no), `name` empieza por `E2E ` y ningún movimiento, meta o notificación la referencia |

- El orden respeta las llaves foráneas: movimientos → metas → cuentas → categorías, todo en **una transacción**. Una cuenta o categoría que otra fila (no E2E) todavía referencia se **deja** en lugar de fallar.
- **No toca `users`**: el usuario semilla `test@crezia.com` y cualquier otro usuario quedan intactos. Los usuarios `@e2e.crezia.test` los limpia aparte `scripts/test-db-clean-e2e-users.ts` (lo usa `register.spec.ts`).
- **No toca nada activo**: una fila E2E sin `deleted_at` (por ejemplo, de una prueba interrumpida) no se borra.
- **No toca las filas de las pruebas de API** (`PW …`): esas tienen otro prefijo y también se acumulan con `deleted_at`. Si se quisieran purgar, habría que ampliar el prefijo a propósito.

## Protecciones

- `npm run db:test:purge-e2e` ejecuta antes `npm run db:test:check` (carga `.env.test` y compara la base con la del `.env` real) y el script llama a `assertApiTestRun`: exige `TEST_MODE=true`, que `DATABASE_URL` y `DIRECT_URL` existan y **no sean** los de la base real, y `E2E_TEST_DB_CONFIRMED=true`. Si algo falla, no borra nada.
- Comprobado el 2026-11-25: sin `E2E_TEST_DB_CONFIRMED` el script se niega con «Falta E2E_TEST_DB_CONFIRMED=true».
- Código: `purgeE2eSoftDeletedRows` en `utils/testDb.ts` y `scripts/test-db-purge-e2e.ts`.

## Comprobado

Con la base en 31/24 categorías, 11/10 cuentas, 11/10 metas y 130/125 movimientos (total / borradas), tras dos corridas de E2E que dejaron filas con `deleted_at`, el script borró 2 movimientos, 2 metas, 1 cuenta y 4 categorías y la base volvió **exactamente** a esos conteos; el usuario semilla siguió en 1. Una segunda pasada borró 0. Nota: en el simulacro las categorías salen de menos (2 frente a 4) porque todavía hay movimientos y metas que las referencian y que el simulacro no borra; el borrado real las cuenta bien.
