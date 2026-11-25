# Crezia API

API REST de finanzas personales. Cada usuario registra sus cuentas bancarias, sus ingresos y gastos por categoría y sus metas de ahorro; el saldo de las cuentas y el progreso de las metas se calculan a partir de los movimientos.

**Stack:** Node + TypeScript, Express 5, Prisma 7, PostgreSQL en Supabase, Vitest, zod y JWT (jsonwebtoken + bcrypt).

## Estructura (Clean Architecture)

```
src/
├── domain/          Entidades, errores e interfaces de repositorios. No importa nada de las otras capas, ni Prisma ni Express.
├── application/     Casos de uso y reglas de negocio (acceso, saldo, progreso). Solo importa domain; nunca Prisma ni Express.
├── infrastructure/  Prisma, repositorios, bcrypt, JWT y container.ts (une todo). No importa presentation.
├── presentation/    Rutas, controladores, middlewares y schemas de zod. Llama a los casos de uso; no importa Prisma.
├── generated/       Cliente de Prisma generado por `prisma generate`. No se edita a mano.
├── app.ts           Crea la app de Express y monta las rutas.
└── server.ts        Punto de entrada: lee el .env y levanta el servidor.
```

Los casos de uso reciben los repositorios por constructor, así las pruebas corren con repositorios en memoria y sin base de datos.

## Instalación y configuración

**Requisitos:** Node 20 o superior y un proyecto de Supabase (PostgreSQL).

```powershell
npm install
Copy-Item .env.example .env
```

`npm install` también ejecuta `prisma generate`. Llena el `.env`:

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión de la API en ejecución. Usa el **pooler de transacciones** de Supabase: puerto **6543** y `?pgbouncer=true` al final. |
| `DIRECT_URL` | Conexión de la CLI de Prisma (migraciones y seed). Usa el **pooler de sesión**: puerto **5432**. |
| `JWT_SECRET` | Clave para firmar los tokens. Debe ser larga y aleatoria; sin ella la API no arranca. |
| `JWT_EXPIRES_IN` | Duración del token (por ejemplo `1d`, `12h`). Por defecto `1d`. |
| `PORT` | Puerto del servidor. Por defecto `3000`. En producción lo inyecta la plataforma. |
| `CORS_ORIGINS` | Orígenes del front que pueden llamar a la API desde un navegador, separados por comas (`https://app.ejemplo.com`). Sin comodines. Si no se define: `http://localhost:5173` y `http://127.0.0.1:5173`. **Obligatoria en producción.** |
| `TRUST_PROXY` | Número de proxies delante de la API. Vacío en local. Ver "Despliegue". |

`.env.example` lista todas las variables, y la sección "Despliegue" dice cuáles van en producción y cuáles **no** deben existir allí.

Las dos URL se copian desde Supabase → *Connect*. Para generar un `JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> El `.env` nunca se sube al repositorio.

### Base de datos

La base de datos se maneja **solo con migraciones** (`prisma/migrations`). El diseño completo está en `docs/db/crezia_schema_v2.sql`.

```powershell
npm run db:migrate   # prisma migrate dev: crea y aplica migraciones (desarrollo; se niega con NODE_ENV=production)
npm run db:deploy    # prisma migrate deploy: solo aplica las pendientes (es lo que se usa al desplegar)
npm run db:seed      # prisma db seed: carga los datos de prueba (se niega con NODE_ENV=production)
```

## Cómo correr

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con recarga automática (`tsx watch`). |
| `npm test` | Pruebas unitarias con Vitest (no necesitan base de datos). |
| `npm run test:api` | Pruebas de API con Playwright contra el servidor real (ver abajo). Las que **crean datos** (registro) usan `npm run test:api:test`, solo con la base de pruebas. |
| `npm run build` | `prisma generate` + compilación de TypeScript a `dist/`. |
| `npm start` | Corre la versión compilada (`dist/server.js`). |
| `docker compose up --build` | API + PostgreSQL local en Docker, con migraciones y datos de prueba (ver "Despliegue"). |

Para comprobar que está arriba: `GET http://localhost:3000/api/health` → `{ "status": "ok" }`.

## Usuario de prueba (seed)

**Correo:** `test@crezia.com` · **Contraseña:** `Test123*`

El seed crea:
- **Monedas:** COP y USD.
- **Categorías del sistema:** Salario, Alimentación, Transporte, Vivienda, Salud, Entretenimiento y Ahorro.
- **Usuario de prueba** con una cuenta **Bancolombia** de ahorros en COP.
- **5 movimientos** del mes actual: nómina (+3.500.000), arriendo (−1.200.000), mercado (−85.000), taxi (−12.000) y aporte a la meta (−400.000 en Ahorro). Saldo resultante: 1.803.000.
- **Meta "Viaje a Cartagena"** en la categoría Ahorro: objetivo 2.000.000, desde el día 1 del mes actual y por 6 meses.

Si el usuario ya existe, el seed solo asegura monedas y categorías y no duplica nada.

## Endpoints

Todas las rutas empiezan por `/api`. Salvo el login y el health, **todas requieren** `Authorization: Bearer <token>`; sin token o con token inválido responden **401**.

- Los **PATCH** son parciales: envía solo los campos que cambian (al menos uno).
- Los **DELETE** hacen soft delete y responden **200** con un mensaje.
- Un `:id` que no es UUID responde **400**.
- Los campos que no están en el schema (`userId`, `source`, `balance`...) se ignoran.
- Montos: número o texto con hasta 2 decimales (`85000` o `"85000.50"`); se devuelven como texto (`"85000.50"`). Fechas: `AAAA-MM-DD`.

### Paginación de cuentas, categorías y metas

`GET /api/categories`, `GET /api/bank-accounts` y `GET /api/goals` están paginados. **El cuerpo sigue siendo un array**; los totales viajan en las cabeceras de la respuesta:

| Query | Por defecto | Reglas |
|---|---|---|
| `page` | `1` | Entero ≥ 1 |
| `limit` | `50` | Entero entre 1 y 100 |

| Cabecera | Significado |
|---|---|
| `X-Total-Count` | Total de elementos que cumplen la consulta, sin contar la paginación |
| `X-Page` | Página devuelta |
| `X-Limit` | Tamaño de página aplicado |

- Un `page` o `limit` inválido responde **400** `VALIDATION_ERROR` (por ejemplo `limit=101`, `limit=0` o `page=abc`).
- Una página más allá de la última responde **200** con un array vacío y el mismo `X-Total-Count`.
- Sin parámetros se devuelven solo los primeros 50 elementos: para ver todos hay que pedir más páginas hasta cubrir `X-Total-Count`.
- El saldo de cada cuenta y el progreso de cada meta se calculan solo para los elementos de la página devuelta.
- El orden es estable (se desempata por `id`): categorías, sistema primero y luego por nombre; cuentas, por banco y fecha de creación; metas, por fecha fin y fecha de creación.
- Las cabeceras están expuestas con `cors({ exposedHeaders })`, así que un front en otro origen puede leerlas con `response.headers.get('X-Total-Count')`.
- **`GET /api/movements` no cambia:** mantiene su formato `{ data, page, limit, total }` y `limit` por defecto 20.

```
GET /api/bank-accounts?page=2&limit=20
→ 200  X-Total-Count: 57  X-Page: 2  X-Limit: 20   (cuerpo: array de hasta 20 cuentas)
```

### Auth

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{ name, documentId, birthDate, email, password, phone?, preferredCurrencyCode? }` | 201 `{ token, user }` · 400 · 409 mensaje genérico · 429 `Retry-After` (10 intentos por IP cada 15 min) |
| POST | `/api/auth/login` | No | `{ "email": "test@crezia.com", "password": "Test123*" }` | 200 `{ token, user }` · 400 · 401 credenciales incorrectas |

### Categorías

Lista las del sistema y las propias.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/categories` | Sí | — (ver [paginación](#paginación-de-cuentas-categorías-y-metas)) | 200 (array) · 400 |
| GET | `/api/categories/:id` | Sí | — | 200 · 404 |
| POST | `/api/categories` | Sí | `{ "name": "Mascotas", "description": "Comida y veterinario" }` | 201 · 400 |
| PATCH | `/api/categories/:id` | Sí | `{ "description": "Solo veterinario" }` | 200 · 400 · 403 categoría del sistema · 404 |
| DELETE | `/api/categories/:id` | Sí | — | 200 `{ "message": "Categoría eliminada con éxito" }` · 403 · 404 |

### Cuentas bancarias

Cada cuenta se devuelve con su `balance` calculado. `accountType`: `Savings`, `Checking`, `Credit`, `Other`.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/bank-accounts` | Sí | — (ver [paginación](#paginación-de-cuentas-categorías-y-metas)) | 200 (array) · 400 |
| GET | `/api/bank-accounts/:id` | Sí | — | 200 · 404 |
| POST | `/api/bank-accounts` | Sí | `{ "bankName": "Nequi", "accountAlias": "Gastos", "accountType": "Savings", "currencyCode": "COP" }` | 201 · 400 (incluye moneda inexistente o inactiva) |
| PATCH | `/api/bank-accounts/:id` | Sí | `{ "accountAlias": "Nómina" }` | 200 · 400 · 404 · 409 cambio de moneda con movimientos |
| DELETE | `/api/bank-accounts/:id` | Sí | — | 200 `{ "message": "Cuenta bancaria eliminada con éxito" }` · 404 |

### Movimientos

`type`: `Income` o `Expense`. `paymentMethod`: `Cash`, `Transfer`, `CreditCard`, `DebitCard`, `Other`. `bankAccountId` es opcional (por ejemplo, efectivo); si va, la moneda se toma de la cuenta, y si no va, `currencyCode` es obligatoria. Los creados por la API quedan con `source: "Manual"`.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/movements` | Sí | — (ver filtros) | 200 `{ data, page, limit, total }` · 400 |
| GET | `/api/movements/summary` | Sí | — (ver [resumen](#resumen-de-movimientos-del-panel)) | 200 · 400 · 401 |
| GET | `/api/movements/:id` | Sí | — | 200 · 404 |
| POST | `/api/movements` | Sí | `{ "bankAccountId": "<uuid>", "categoryId": "<uuid>", "type": "Expense", "amount": 85000, "date": "2026-10-15", "paymentMethod": "DebitCard", "description": "Mercado" }` | 201 · 400 |
| PATCH | `/api/movements/:id` | Sí | `{ "amount": "90000", "description": "Mercado del mes" }` | 200 · 400 · 404 |
| DELETE | `/api/movements/:id` | Sí | — | 200 `{ "message": "Movimiento eliminado con éxito" }` · 404 |

**Filtros de la lista (query, todos opcionales):** `type`, `categoryId`, `bankAccountId`, `from` y `to` (fechas inclusivas, `from` ≤ `to`), `page` (por defecto 1) y `limit` (por defecto 20, máximo 100). Orden: fecha descendente.

```
GET /api/movements?type=Expense&from=2026-10-01&to=2026-10-31&page=1&limit=20
```

#### Resumen de movimientos del Panel

`GET /api/movements/summary` devuelve los totales de **todo** el periodo (no de una página de la lista), solo del usuario del token.

| Query | Obligatorio | Reglas |
|---|---|---|
| `from` | Sí | Fecha `AAAA-MM-DD`, inclusiva |
| `to` | Sí | Fecha `AAAA-MM-DD`, inclusiva; `from` ≤ `to`; el periodo no puede superar **366 días** |
| `currencyCode` | No | 3 letras; por defecto `COP` |

```
GET /api/movements/summary?from=2026-11-01&to=2026-11-30
→ 200 { "from": "2026-11-01", "to": "2026-11-30", "currencyCode": "COP",
        "totalIncome": "7000000.00", "totalExpense": "916224.00",
        "balance": "6083776.00", "movementCount": 15 }
```

- Una sola moneda por respuesta: los movimientos en otra moneda no se suman (no hay tasas de cambio).
- Los movimientos borrados no cuentan. Sin movimientos devuelve ceros y `movementCount: 0` (200).
- `balance` = ingresos − egresos y puede ser negativo (`"-120000.00"`).
- 400 `VALIDATION_ERROR`: falta `from` o `to`, fecha mal formada, `from` posterior a `to`, periodo mayor a 366 días o moneda inválida. 401 sin token.
- Un `userId` en la query se ignora: el dueño sale siempre del token.

**400 en movimientos:** monto ≤ 0, categoría que no es del sistema ni del usuario (o está borrada), cuenta ajena o borrada, moneda distinta a la de la cuenta, o falta la moneda cuando no hay cuenta. Los movimientos de una cuenta borrada siguen apareciendo en la lista, pero no se pueden crear nuevos en ella.

### Metas de ahorro

Cada meta se devuelve con su progreso: `accumulated`, `remaining` (texto con 2 decimales) y `percentage` (número de 0 a 100). `reason`: `Travel`, `Vehicle`, `Education`, `EmergencyFund`, `HomePurchase`, `Technology`, `DebtPayment`, `Other`. `status`: `Active`, `Completed`, `Cancelled`, `Overdue`; toda meta nueva empieza en `Active`, y el estado solo se cambia por PATCH.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/goals` | Sí | — (ver [paginación](#paginación-de-cuentas-categorías-y-metas)) | 200 (array) · 400 |
| GET | `/api/goals/:id` | Sí | — | 200 · 404 |
| POST | `/api/goals` | Sí | `{ "categoryId": "<uuid>", "name": "Viaje a Japón", "reason": "Travel", "targetAmount": 15000000, "currencyCode": "COP", "startDate": "2026-10-16", "endDate": "2027-12-31" }` | 201 · 400 · 409 |
| PATCH | `/api/goals/:id` | Sí | `{ "targetAmount": "18000000", "status": "Completed" }` | 200 · 400 · 404 · 409 |
| DELETE | `/api/goals/:id` | Sí | — | 200 `{ "message": "Meta eliminada con éxito" }` · 404 |

**400 en metas:** `targetAmount` ≤ 0; fecha fin igual o anterior a la de inicio; al crear, fecha fin en el pasado; categoría inválida; moneda inexistente o inactiva; `reason: "Other"` sin `reasonOther`, o `reasonOther` con otro motivo.

## Reglas importantes

- **Soft delete:** DELETE llena `deleted_at`, `deleted_by` y `updated_by`; nada se borra físicamente y las consultas ignoran lo borrado.
- **Saldo de una cuenta** = Σ `Income` − Σ `Expense` de sus movimientos no borrados. Se calcula, no se guarda.
- **Progreso de una meta** = Σ de los movimientos `Expense` del usuario en la categoría de la meta, con fecha entre `start_date` y `end_date` (inclusive), sin borrados. `remaining = target − accumulated` (mínimo 0) y `percentage = accumulated / target × 100` (tope 100, 2 decimales). Ahorrar para una meta se registra como un gasto en su categoría.
- El dinero se suma en **centavos enteros** para evitar errores de punto flotante.
- **Categorías del sistema:** son de solo lectura; editarlas o borrarlas da **403**.
- **Recurso ajeno:** ver, editar o borrar algo de otro usuario da **404**, para no revelar que existe.
- **Una meta activa por categoría:** no puede haber dos metas `Active`/`Overdue` en la misma categoría → **409** (al crear, al cambiar la categoría o al reactivar).
- **Moneda de una cuenta:** no se puede cambiar si la cuenta tiene movimientos → **409**.

**Formato de errores** (siempre el mismo): `{ "error": { "code", "message", "details?" } }`. Los códigos son `VALIDATION_ERROR` (400), `INVALID_JSON` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409) e `INTERNAL_ERROR` (500). `details` solo aparece en errores de validación:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [{ "path": "body.amount", "message": "El monto debe ser mayor a 0" }]
  }
}
```

## Pruebas de API con Playwright

Prueban los `POST` de login, categorías, cuentas, movimientos y metas (casos exitosos y de error) haciendo peticiones HTTP reales; no usan navegador.

```
playwright.config.ts   baseURL http://localhost:3000; arranca `npm run dev` si el servidor no está corriendo
fixtures/              auth.fixture.ts: `authToken` (login una vez por worker) y `apiRequest`
services/              Una función por llamada HTTP (crear, borrar, consultar); los tests no arman URLs
data/                  Usuario de prueba y payloads válidos reutilizables
utils/                 Header Authorization, log de la respuesta (oculta el token) y apoyo a la limpieza
tests/api/<recurso>/   Los specs (*.spec.ts); Vitest no los recoge porque solo corre tests/**/*.test.ts
```

```powershell
npm run test:api                         # todas
npx playwright test tests/api/goals      # una carpeta
npx playwright show-report               # reporte HTML del último run
```

- Usan la **base de datos real** del `.env` con el usuario del seed, así que necesitan el seed aplicado. No reinician ni borran la base.
- Todo lo que crean lleva un nombre único con prefijo `PW` y se borra (soft delete) al terminar cada prueba o cada archivo.
- Variables opcionales para usar otro usuario: `TEST_EMAIL` y `TEST_PASSWORD` (por ejemplo `$env:TEST_EMAIL="otro@crezia.com"`).

## Frontend (React + Vite + TypeScript)

Vive en `frontend/` con su propio `package.json`. Necesita Node 20 o superior y el backend corriendo. Las pantallas que aún no existen muestran "Esta sección aún no está disponible" (ver `docs/generated/plan-skills.md`).

```
frontend/src/
├── domain/          Tipos alineados con el backend y lógica pura (iniciales del nombre). No importa React.
├── application/     Validación de formularios con zod (mismas reglas y mensajes que el backend). No importa React.
├── infrastructure/  Cliente HTTP único, adaptador de paginación, sesión (sessionStorage) y servicios por recurso.
└── presentation/    React: rutas protegidas, tema claro/oscuro, layout, componentes y una carpeta por pantalla (features/).
```

**Pantallas hechas:** login, registro, Panel (`GET /api/movements/summary`), Movimientos (lista paginada con filtros), Cuentas, Categorías y Metas, las cuatro con crear, editar y eliminar. La encuesta financiera y Mi perfil quedan fuera de alcance por ahora (ver `docs/generated/plan-skills.md`).

**Montos:** el usuario puede escribir `85000`, `85000,50` o `85000.50`. Un punto seguido de exactamente 3 dígitos (`85.000`) se rechaza con un mensaje en lugar de adivinar si son miles o decimales. COP se muestra sin decimales (diseño aprobado), así que se redondea solo al mostrar.

### Instalar y correr

```powershell
cd frontend
npm install
Copy-Item .env.example .env      # y ajusta VITE_API_URL si la API no está en http://localhost:3000
npm run dev                      # http://localhost:5173
```

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | URL base de la API (por defecto `http://localhost:3000` en desarrollo). Vite expone al navegador todo lo que empiece por `VITE_`: **nunca pongas secretos ahí**. En el build de producción es **obligatoria**, `https` y no local (ver "Despliegue"). |

### Backend y front juntos

Dos terminales en PowerShell:

```powershell
# Terminal 1, en la raíz del repo: API en http://localhost:3000
npm run dev

# Terminal 2, en frontend/: front en http://localhost:5173
npm run dev
```

La API solo acepta los orígenes de `CORS_ORIGINS` (por defecto `http://localhost:5173` y `http://127.0.0.1:5173`, el servidor de Vite) y expone las cabeceras `X-Total-Count`, `X-Page`, `X-Limit` y `Retry-After`, así que no hace falta proxy. Entra con el usuario del seed (ver "Usuario de prueba").

### Comandos del front

| Comando (en `frontend/`) | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga (HMR). |
| `npm run build` | Chequeo de tipos (`tsc`) y build de producción en `frontend/dist/`. Falla si `VITE_API_URL` falta, no es https o es local (para probarlo en tu equipo, ver "Despliegue"). |
| `npm run preview` | Sirve el build en `http://localhost:4173`. |
| `npm run typecheck` / `npm run lint` | Tipos y ESLint. |
| `npm test` | Pruebas con Vitest y Testing Library (no necesitan backend ni base de datos). |
| `npm run e2e` | Pruebas de punta a punta con Playwright (ver abajo; **solo contra la base de pruebas**). |
| `npm run mock:api`, `npm run visual:capture`, `npm run visual:axe` | API simulada, capturas de todas las pantallas y revisión con axe (ver `frontend/scripts/README.md`). |

### Sesión y seguridad

- El token JWT se guarda en `sessionStorage` (sobrevive a recargas, se borra al cerrar la pestaña). Cualquier respuesta 401 cierra la sesión y lleva al login. Al cerrar sesión se vacía la caché de datos.
- `index.html` lleva una Content-Security-Policy (`<meta>`) que prohíbe scripts en línea y `eval`; solo permite la API de `VITE_API_URL` y Google Fonts. En desarrollo se relaja lo mínimo que Vite necesita (HMR). El script del tema es un archivo externo y síncrono (`public/theme-init.js`) para aplicar el tema antes de pintar sin necesitar `unsafe-inline`.
- Una `<meta>` no puede fijar `frame-ancestors` ni las cabeceras de seguridad: `frontend/vercel.json` las fija en Vercel, y también la reescritura a `index.html` para cualquier ruta (el front usa rutas sin `#`). Si se despliega en otro servidor, hay que reproducir ambas cosas.
- El tema (claro, oscuro, sistema) se guarda en `localStorage` con la clave `crezia-theme`.

### Pruebas E2E del front (base de datos de pruebas)

Crean y borran datos, así que **nunca** se corren contra la base real. Usa un segundo proyecto de Supabase (o un Postgres local) y un archivo `.env.test` (ya está en `.gitignore`).

```powershell
# En la raíz del repo (pasos completos y protecciones: docs/generated/test-database.md)
Copy-Item .env.test.example .env.test        # completa las CUATRO variables con la BD de PRUEBAS y deja TEST_MODE=true
npm run db:test:check                         # comprueba que NO es la base real
npm run db:test:migrate                       # migrate deploy en la BD de pruebas
npm run db:test:seed                          # monedas, categorías y test@crezia.com

npm run dev:test                              # backend contra la BD de pruebas (déjalo corriendo)

# En otra terminal, en frontend/
$env:E2E_TEST_DB_CONFIRMED = "true"           # confirmas que el backend usa la BD de pruebas
$env:E2E_EMAIL = "test@crezia.com"            # usuario del seed
$env:E2E_PASSWORD = "Test123*"
npm run e2e
```

Sin `E2E_TEST_DB_CONFIRMED=true`, sin credenciales o sin backend respondiendo, las pruebas se saltan con un aviso. Si falta alguna variable en `.env.test`, Node usaría el valor del `.env` real: por eso se piden las cuatro.

## Despliegue (Railway + Vercel + Supabase)

Esta sección **prepara** el despliegue; no hay nada desplegado todavía. La lista de verificación previa y la prueba del flujo principal están en [`docs/despliegue.md`](docs/despliegue.md).

| Pieza | Dónde | Cómo |
|---|---|---|
| API | Railway | Se construye con el `Dockerfile` de la raíz. |
| Front | Vercel | Carpeta `frontend/`, build de Vite. |
| Base de datos | Supabase | Ya existe; las migraciones se aplican con `npm run db:deploy`. |

> Los nombres de los ajustes de los paneles de Railway y Vercel que aparecen abajo salen de lo que se conoce de esas plataformas **y no se han comprobado en este repositorio**: donde dice *Comprueba en el panel*, confirma que el ajuste existe con ese nombre antes de fiarte.

### Variables de entorno de la API

El servidor, cuando corre con `NODE_ENV=production`, **se niega a arrancar** si hay un `TEST_MODE`, un `PERF_MODE`, un `JWT_SECRET` corto o de ejemplo, si falta `DATABASE_URL` o `CORS_ORIGINS`, si `CORS_ORIGINS` contiene localhost o si están definidos los límites del registro (`src/config/productionGuard.ts`). El detalle de cada variable está en `.env.example`.

| Variable | Railway (producción) | Valor / nota |
|---|---|---|
| `DATABASE_URL` | **Sí** | Pooler de transacciones de Supabase: puerto `6543` y `?pgbouncer=true`. |
| `DIRECT_URL` | **Sí** | Pooler de sesión de Supabase, puerto `5432`. No la usa el servidor en ejecución, pero **sí** `prisma migrate deploy` (el comando previo al despliegue) y `prisma generate`. |
| `JWT_SECRET` | **Sí** | Al menos 32 caracteres aleatorios, distinto del de desarrollo. Se guarda solo en Railway. |
| `JWT_EXPIRES_IN` | Opcional | Por defecto `1d`. |
| `NODE_ENV` | **Sí** (`production`) | El `Dockerfile` ya lo fija; no lo cambies. Es lo que activa la guarda de producción. |
| `CORS_ORIGINS` | **Sí** | La URL de Vercel del front, sin barra final: `https://tu-proyecto.vercel.app`. Varias, separadas por comas. Sin comodines ni localhost. |
| `TRUST_PROXY` | **Sí** | Número de proxies delante de la API. Suele ser `1` en Railway, **pero compruébalo** (ver abajo). Nunca `true`. |
| `PORT` | **No la definas** | Railway la inyecta. La API la lee del entorno (3000 si no existe). *Comprueba en el panel* que aparece entre las variables del servicio. |
| `DB_POOL_MAX`, `DB_POOL_CONNECTION_TIMEOUT_MS` | Opcional | Ajuste fino del pool de conexiones. Supabase limita las conexiones del pooler: no subas `DB_POOL_MAX` sin revisar el plan. |
| `UV_THREADPOOL_SIZE` | Opcional | Hilos de bcrypt. Si no se define, la API usa el número de CPU que ve el contenedor (entre 4 y 32), que en un contenedor puede ser el del servidor completo, no el de tu plan. |

**Variables que NO deben existir en producción:**

| Variable | Por qué |
|---|---|
| `TEST_MODE` | Activa las protecciones de la base de pruebas. La API lo rechaza en producción. |
| `PERF_MODE` y todas las `PERF_*` | Solo para pruebas de carga locales. |
| `REGISTER_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_WINDOW_MS` | Subir el límite del registro (`.env.test` usa 1000) quita la protección contra registros masivos. En producción valen los de por defecto: 10 intentos cada 15 minutos por IP. |
| `E2E_*` | Credenciales de las pruebas E2E. |
| Un `JWT_SECRET` de ejemplo | `change-me…`, `test-only-secret…`, etc. |
| Cualquier URL de la base de **pruebas** o de la local de Docker | Producción solo habla con el proyecto de Supabase real. |

### Imagen Docker (API)

El `Dockerfile` tiene varias etapas: compila TypeScript, instala solo las dependencias de producción y deja una imagen final con el código compilado, `node_modules`, `prisma/` (migraciones) y nada más. Corre como el usuario `node` (no root), no copia ningún `.env` (`.dockerignore`) y no lleva secretos: la configuración entra como variables de entorno al arrancar. Incluye un `HEALTHCHECK` de Docker contra `GET /api/health`.

```powershell
docker build --target runtime -t crezia-api .
```

La etapa `tools` existe solo para `docker-compose` (el seed necesita `tsx`) y **no** es la imagen de producción. Railway usa la última etapa del archivo (`runtime`); *comprueba en el panel* (Settings → Build) que detecta el `Dockerfile` de la raíz.

### Migraciones en cada despliegue

Solo se aplica `prisma migrate deploy` (`npm run db:deploy`), que ejecuta las migraciones pendientes de `prisma/migrations` y nada más: no crea migraciones ni borra datos.

- **Recomendado:** configurarlo como comando previo al despliegue de Railway (*Comprueba en el panel*: Settings → Deploy → "Pre-deploy Command"): `npm run db:deploy`. Si la migración falla, el despliegue no continúa y la versión anterior sigue sirviendo. Necesita `DIRECT_URL` entre las variables del servicio.
- Si ese ajuste no existe en tu plan, la alternativa es aplicar las migraciones a mano desde tu equipo **antes** de desplegar (con la `DIRECT_URL` de producción en tu sesión, nunca en un archivo) y hacer copia de seguridad antes (ver `docs/despliegue.md`).
- **`migrate dev` y `reset` no se usan en producción:** el `Dockerfile` solo arranca `node dist/server.js`, y los scripts `db:migrate` (`migrate dev`) y `db:seed` se niegan a correr con `NODE_ENV=production`. Esa protección cubre el contenedor; **no** impide que alguien ejecute `prisma migrate reset` desde su equipo con la URL de producción. Esa regla sigue siendo tuya (ver `CLAUDE.md`).
- **El seed no se ejecuta en producción:** crea el usuario `test@crezia.com` con una contraseña conocida. Las monedas (COP, USD) y las categorías del sistema deben existir en la base; ver `docs/despliegue.md`.

### Proxy y límite de intentos (`TRUST_PROXY`)

El límite del registro cuenta por IP. Detrás de Railway la API ve primero la IP del proxy de la plataforma; `TRUST_PROXY` le dice cuántos proxies confiar para leer la IP real del cliente (`X-Forwarded-For`).

- **Valor:** en plataformas con un solo proxy de borde suele ser `1`. **No lo asumas para Railway**: confírmalo con la prueba de abajo.
- **Si es demasiado bajo (0 / vacío):** todos los usuarios comparten la IP del proxy y el límite de 10 intentos es de todos a la vez. En los logs aparece un aviso de `express-rate-limit` (`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`).
- **Si es demasiado alto:** un cliente puede inventar su `X-Forwarded-For` y saltarse el límite.
- **Cómo comprobarlo (ya desplegado):**
  1. Revisa los logs del servicio tras la primera petición: no debe aparecer ningún aviso `ERR_ERL_*`.
  2. Envía 11 `POST /api/auth/register` seguidos (con el cuerpo vacío basta; todos los intentos cuentan) cada uno con una cabecera `X-Forwarded-For` distinta e inventada. Con el valor correcto, el undécimo da **429**, porque la cabecera inventada se ignora. Si nunca llega el 429, el valor es demasiado alto.
  3. Con tu IP bloqueada, prueba desde otra red (por ejemplo el celular con datos): debe poder intentar. Si también recibe 429, el valor es demasiado bajo.
  Esta prueba gasta tu cupo de 15 minutos.

### Chequeo de salud

`GET /api/health` responde `200 {"status":"ok"}` sin token, sin tocar la base de datos y sin pasar por el límite del registro; sirve como chequeo de salud. Como no consulta la base, el servicio figura "sano" aunque la base esté caída. En Railway: *Comprueba en el panel* (Settings → Deploy → "Healthcheck Path") y escribe `/api/health`.

### Front en Vercel

| Ajuste de Vercel | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` (ejecuta `tsc` y `vite build`) |
| Output Directory | `dist` |
| Install Command | `npm install` (o `npm ci`) |
| Environment Variable | `VITE_API_URL` = la URL pública **https** de la API en Railway, sin barra final |

- `VITE_API_URL` se incorpora al *bundle* en el **build**: si la cambias, hay que volver a desplegar. El build de producción **falla** si falta, si no es `https` o si apunta a localhost (`frontend/src/build/csp.ts`), y esa misma URL es la única que la Content-Security-Policy deja contactar (`connect-src`). En producción la CSP no menciona localhost.
- `frontend/vercel.json` define: (1) la reescritura a `index.html` para que `/panel`, `/movimientos`… funcionen al recargar (los archivos reales, como `/assets/…`, no se reescriben); (2) cabeceras de seguridad (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `frame-ancestors 'none'`, `Permissions-Policy`); (3) caché larga para `/assets/`. *Comprueba tras el primer despliegue* que recargar `/metas` no da 404 y que las cabeceras llegan (`curl -I https://tu-proyecto.vercel.app/`).
- Para probar el build de producción en tu equipo contra una API local: `$env:VITE_ALLOW_LOCAL_API = "true"; $env:VITE_API_URL = "http://localhost:3000"; npm run build; npm run preview`. Nunca definas `VITE_ALLOW_LOCAL_API` en Vercel.
- Cada vez que cambie el dominio del front, actualiza `CORS_ORIGINS` en Railway (las vistas previas de Vercel de cada rama tienen otra URL y la API las rechazará, a propósito).

### Todo en local con Docker (`docker-compose.yml`)

Para tener la API y una base PostgreSQL vacía en tu equipo, sin Supabase:

```powershell
docker compose up --build        # API en http://localhost:3000 (PostgreSQL en 127.0.0.1:5433)
docker compose down              # detener (conserva los datos)
docker compose down -v           # detener y BORRAR la base local
```

Aplica las migraciones, carga las monedas, las categorías y el usuario `test@crezia.com` (ver "Usuario de prueba") y arranca la API. Es seguro respecto a Supabase: todos los valores están escritos en el archivo (no lee tu `.env`, ni siquiera con `${...}`), la única base es el servicio `db`, y el puerto de la base solo se publica en `127.0.0.1`. Las contraseñas de ese archivo son de desarrollo; no las reutilices. El front local (`npm run dev` en `frontend/`, puerto 5173) puede usarla tal cual.

## Probar en Postman

1. Crea un *environment* con las variables `baseUrl` = `http://localhost:3000/api` y `token` (vacía).
2. Haz `POST {{baseUrl}}/auth/login` con el usuario de prueba. Para guardar el token automáticamente, pega esto en la pestaña *Scripts → Post-response* del login:

   ```js
   const body = pm.response.json();
   if (pm.response.code === 200 && body.token) {
     pm.environment.set('token', body.token);
   }
   ```

3. En la colección, en *Authorization*, elige **Bearer Token** con el valor `{{token}}` y deja cada petición en *Inherit auth from parent*. Si no usas el script, copia el `token` de la respuesta del login y pégalo en esa variable.
4. Usa las rutas sin repetir `/api`, por ejemplo `{{baseUrl}}/movements`.

### Colección del resumen del Panel

El archivo [`docs/postman/crezia-dashboard-summary.postman_collection.json`](docs/postman/crezia-dashboard-summary.postman_collection.json) solo trae las peticiones del resumen (`GET /movements/summary`) con sus pruebas (`pm.test`). No hay colección del resto de la API.

1. En Postman: *Import* y elige el archivo.
2. Crea un *environment* con `baseUrl` = `http://localhost:3000/api`, `email` y `password` (el usuario de prueba); `token` se llena sola. **No guardes credenciales reales en el archivo.**
3. Ejecuta primero *Login* y luego las demás, o usa *Run collection*.

Qué comprueban las pruebas: 200 con la estructura y el balance = ingresos − egresos (en centavos), un mes sin datos con ceros, y los casos 400 (periodo mayor a 366 días, `from` posterior a `to`, moneda inválida) y 401 (sin token).

## Limitaciones conocidas

- **El progreso de las metas no filtra por moneda:** una meta en USD suma también los gastos en COP de su categoría.
- **El estado `Overdue` se puede poner a mano** con PATCH; todavía no hay un proceso que marque las metas vencidas.

## Ramas y commits

- `master`: versión estable.
- `develop`: integración.
- `feature/<nombre>`: una rama por funcionalidad, que sale de `develop` y vuelve a ella por pull request; las pruebas van en la misma rama.
- Commits en inglés con **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`...).
