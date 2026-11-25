# Base de datos de pruebas

Guía para crear una base **separada de la real** y correr contra ella el backend, las pruebas de API (Playwright), la colección de Postman y las pruebas E2E del front, sin tocar nunca los datos reales.

> **Regla:** todo lo que crea o borra datos (pruebas de API, E2E, Postman del registro) corre **solo** contra esta base. `npm test` (Vitest) no necesita base de datos.

## Cómo te protege el proyecto (y qué no puede hacer)

| Protección | Qué hace |
|---|---|
| `.env.test` en `.gitignore` | El archivo con las credenciales de pruebas nunca se sube. |
| `TEST_MODE=true` (dentro de `.env.test`) | Activa la guarda `src/config/testDbGuard.ts` en el servidor (`npm run dev:test`), en los scripts `db:test:*` y en las pruebas de API. |
| Guarda de identidad | Compara el proyecto de Supabase (o `host/base`) de `DATABASE_URL` y `DIRECT_URL` con los del `.env` real. Si coinciden, **se detiene**. Nunca imprime contraseñas. |
| Las cuatro variables obligatorias | Si falta `DATABASE_URL` o `DIRECT_URL`, la guarda se detiene: la CLI de Prisma y `dotenv` usarían en silencio el valor del `.env` real. |
| `E2E_TEST_DB_CONFIRMED=true` | Confirmación explícita tuya antes de correr pruebas que crean datos. |
| Sin reutilizar servidores | En modo prueba Playwright **no** reutiliza un servidor que ya esté en el puerto 3000 (podría estar conectado a la base real); si el puerto está ocupado, falla. |
| Limpieza acotada | Solo borra usuarios cuyo correo termina en `@e2e.crezia.test` **y** cuya identificación empieza por `E2E`. |

**Límite honesto:** la guarda solo puede demostrar que la base **no es la real** (no puede saber que "es la de pruebas"). Por eso existe la confirmación manual. Si pones en `.env.test` una tercera base que sí te importa, la guarda no lo detecta.

## 1. Crear el segundo proyecto de Supabase

1. En [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Nómbralo, por ejemplo, `crezia-test`, elige la misma región y una contraseña **distinta** de la del proyecto real. Guárdala: la necesitas en el paso 2.
2. Espera a que el proyecto termine de crearse.
3. Entra al proyecto → **Connect** (botón superior) y copia dos cadenas:
   - **Transaction pooler** (puerto `6543`) → será `DATABASE_URL` (añade `?pgbouncer=true` al final si no lo trae).
   - **Session pooler** (puerto `5432`) → será `DIRECT_URL`.
4. En ambas cadenas el usuario es `postgres.<ref-del-proyecto-de-pruebas>`. Comprueba que ese `<ref>` es **distinto** del de tu `.env` real.

## 2. Crear `.env.test`

En la raíz del repo (PowerShell):

```powershell
Copy-Item .env.test.example .env.test
notepad .env.test
```

Rellena **las cuatro variables** y deja `TEST_MODE=true`:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Transaction pooler del proyecto de **pruebas** (puerto 6543, `?pgbouncer=true`). |
| `DIRECT_URL` | Session pooler del proyecto de **pruebas** (puerto 5432). |
| `JWT_SECRET` | Cualquier texto largo; distinto del real. |
| `JWT_EXPIRES_IN` | `1d` |
| `PORT` | `3000` |
| `TEST_MODE` | `true` (obligatoria) |
| `REGISTER_RATE_LIMIT_MAX` | `1000` (sube el límite de registros para que las pruebas no lo alcancen). |
| `LOGIN_RATE_LIMIT_MAX` | Opcional. Con `TEST_MODE=true` y sin esta variable el login usa un límite alto controlado (1000); no hace falta añadirla a `.env.test`. |

Verifica la guarda (no toca la base, solo compara identidades):

```powershell
npm run db:test:check
```

Debe decir `Base de pruebas verificada...`. Si dice que apunta a la misma base que tu `.env`, cambia las URLs.

## 3. Migraciones y seed en la base de pruebas

```powershell
npm run db:test:migrate   # prisma migrate deploy: aplica las migraciones existentes (no borra nada)
npm run db:test:seed      # monedas, categorías por defecto y el usuario test@crezia.com / Test123*
```

Ambos comandos ejecutan primero `db:test:check`. Usan `migrate deploy` (aplica migraciones ya creadas), **nunca** `migrate dev` ni `migrate reset`. Para crear una migración nueva se sigue usando la base de desarrollo, como siempre.

## 4. Correr el backend contra la base de pruebas

```powershell
npm run dev:test
```

Carga `.env.test` (con `tsx --env-file`) y, como `TEST_MODE=true`, el servidor aplica la guarda al arrancar. Déjalo corriendo en una terminal si vas a usar Postman o los E2E del front. Cierra antes cualquier servidor normal (`npm run dev`) que esté en el puerto 3000.

## 5. Pruebas de API con Playwright (backend)

```powershell
$env:E2E_TEST_DB_CONFIRMED = "true"     # confirmas que .env.test apunta a la base de PRUEBAS
npm run test:api:test                   # todas las pruebas de tests/api
npm run test:api:test -- tests/api/auth/register.spec.ts   # solo el registro
```

`test:api:test` verifica la guarda, carga `.env.test`, levanta el backend con `npm run dev:test` (si el puerto 3000 está libre) y corre las pruebas. Las del registro limpian con Prisma al terminar (`utils/testDb.ts`).

**Prueba del límite de intentos (429):** el límite está alto en `.env.test`, así que esa prueba va aparte y sola:

```powershell
# 1. Para el servidor de pruebas y arranca otro con límite bajo
$env:REGISTER_RATE_LIMIT_MAX = "5"       # Node no sobrescribe una variable ya definida: gana sobre .env.test
npm run dev:test
# 2. En otra terminal
$env:E2E_TEST_DB_CONFIRMED = "true"
$env:E2E_REGISTER_RATE_LIMIT_MAX = "5"
npx playwright test tests/api/auth/register.spec.ts -g "rate limit"
```

**Prueba del 429 del login (D-9):** va aparte y con su propio comando. Levanta su backend con límite bajo (5 por defecto, `LOGIN_RATE_LIMIT_TEST_MAX` para cambiarlo) y no crea usuarios:

```powershell
$env:E2E_TEST_DB_CONFIRMED = "true"
npm run test:api:ratelimit:login
```

Cuando termines con la del registro: `Remove-Item Env:REGISTER_RATE_LIMIT_MAX, Env:E2E_REGISTER_RATE_LIMIT_MAX` y reinicia con el límite normal. (Si en esa misma ventana ya gastaste intentos, el contador es por IP y por 15 minutos: reinicia el servidor para ponerlo en cero.)

## 6. Postman (registro)

1. Importa `docs/postman/crezia-register.postman_collection.json`.
2. Con `npm run dev:test` corriendo, ejecútala en orden con *Run collection* (la primera petición crea el correo y la identificación que usan la segunda y la tercera).
3. Cada ejecución **crea usuarios** `@e2e.crezia.test`. Límpialos (sección 8) o déjalos: no estorban, tienen datos únicos.

## 7. Pruebas E2E del front

Con `npm run dev:test` corriendo:

```powershell
cd frontend
$env:E2E_TEST_DB_CONFIRMED = "true"
$env:E2E_EMAIL = "test@crezia.com"
$env:E2E_PASSWORD = "Test123*"
npm run e2e
```

## 8. Limpiar los usuarios de prueba

Los usuarios del registro no se pueden borrar desde la API. Las pruebas de Playwright los borran solas (`afterAll`). Si usaste Postman o una ejecución se interrumpió, ejecuta en el **SQL Editor del proyecto de pruebas** (nunca en el real):

```sql
DELETE FROM users
WHERE email LIKE '%@e2e.crezia.test' AND document_id LIKE 'E2E%';
```

La condición doble evita borrar otros usuarios. Si algún usuario tuviera datos asociados (cuentas, movimientos), la base rechaza el borrado por las llaves foráneas y no se pierde nada: los usuarios del registro nunca tienen datos.

## 9. Restablecer la base de pruebas

Lo más simple y seguro es **crear un proyecto de pruebas nuevo** y repetir las secciones 1 a 3. Si prefieres vaciar el actual, hazlo a mano en el SQL Editor del proyecto **de pruebas** (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) y repite la sección 3. Es destructivo: confirma antes en qué proyecto estás. Estos comandos no forman parte de ningún script del repo a propósito.

## Qué no cubre esta guía

- No hay una base de pruebas en Postgres local; podría usarse con el mismo mecanismo (la guarda compara `host:puerto/base`), pero no se probó.
- Las pruebas de API existentes de otros recursos (categorías, cuentas, metas, movimientos) también crean datos: con `test:api:test` ya corren contra la base de pruebas.
