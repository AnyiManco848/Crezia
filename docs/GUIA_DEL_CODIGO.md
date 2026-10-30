# Guía del código de Crezia API

Esta guía explica el código **tal como está hoy** (rama `develop`). Cada afirmación cita el archivo, y la línea cuando ayuda, para que puedas abrirlo y comprobarlo.

> Convención: `archivo.ts:12` quiere decir "línea 12 de ese archivo".

---

## 1. Qué hace el proyecto

1. Es una **API REST de finanzas personales**: cada usuario inicia sesión y maneja sus categorías, cuentas bancarias, movimientos (ingresos y gastos) y metas de ahorro.
2. **No guarda** el saldo de las cuentas ni el progreso de las metas: los **calcula** cada vez a partir de los movimientos.
3. Está hecha con Node + TypeScript + Express 5, usa Prisma 7 sobre PostgreSQL (Supabase) y sigue una Clean Architecture de 4 capas.

---

## 2. Dónde arranca el proyecto

Hay tres archivos que trabajan juntos:

| Archivo | Qué hace | Cuándo se ejecuta |
|---|---|---|
| `src/server.ts` | Punto de entrada. Lee el `.env`, arma todo y pone el servidor a escuchar. | Primero (es el que lanza `npm run dev`). |
| `src/infrastructure/container.ts` | **Fabrica todos los objetos**: el cliente de Prisma, los repositorios, el servicio JWT, bcrypt y los casos de uso. Los "conecta" entre sí. | Segundo: lo llama `server.ts`. |
| `src/app.ts` | **Crea la app de Express**: middlewares globales, rutas y manejo de errores. Recibe el contenedor ya armado. | Tercero: lo llama `server.ts` pasándole el contenedor. |

### Paso a paso: desde `npm run dev` hasta "listening"

1. **`npm run dev`** ejecuta el script `"dev": "tsx watch src/server.ts"` (`package.json:7`). `tsx` corre TypeScript directamente (sin compilar a `dist/`) y `watch` reinicia el servidor cuando guardas un archivo.
2. **`src/server.ts:1`** → `import 'dotenv/config'` carga las variables del archivo `.env` en `process.env`. Va primero para que todo lo demás ya las tenga disponibles.
3. **`src/server.ts:2-3`** importa `createApp` y `createContainer`. Al importarse, Node carga en cascada todos los archivos que esos módulos importan (controladores, rutas, casos de uso…), pero todavía no crea nada.
4. **`src/server.ts:5`** calcula el puerto: `process.env.PORT` o `3000` si no existe.
5. **`src/server.ts:7`** ejecuta `createApp(createContainer())`. JavaScript evalúa primero lo de adentro, así que:
   - **`createContainer()`** (`container.ts:47`):
     1. `createPrismaClient()` (`container.ts:48` → `src/infrastructure/prisma/client.ts:5`): si no hay `DATABASE_URL`, lanza el error `DATABASE_URL is not set` y el servidor **no arranca**. Si existe, crea un `PrismaClient` con el adaptador `PrismaPg`.
     2. `JwtTokenService.fromEnv()` (`container.ts:49` → `JwtTokenService.ts:15`): lee `JWT_SECRET` y `JWT_EXPIRES_IN` (por defecto `1d`). Si `JWT_SECRET` está vacío, lanza `JWT_SECRET is not set` (`JwtTokenService.ts:12`) y el servidor **no arranca**.
     3. Crea los 6 repositorios de Prisma (`container.ts:50-55`), todos usando el mismo cliente `prisma`.
     4. Crea los casos de uso pasándoles los repositorios por el constructor (`container.ts:57-88`) y devuelve un objeto con la forma de la interfaz `Container` (`container.ts:38-45`).
   - **`createApp(container)`** (`app.ts:16`):
     1. `express()` crea la app (`app.ts:17`).
     2. Registra los middlewares globales `cors()` y `express.json()` (`app.ts:18-19`).
     3. Registra `GET /api/health` (`app.ts:21-23`).
     4. Monta los 5 routers, creando cada controlador con sus casos de uso (`app.ts:25-38`).
     5. Registra `notFound` y `errorHandler` al final (`app.ts:40-41`).
6. **`.listen(port, …)`** (`server.ts:7-9`) abre el puerto y, cuando ya está escuchando, imprime `Crezia API listening on http://localhost:3000`.

> Detalle: crear el `PrismaClient` no abre todavía la conexión; Prisma se conecta a la base cuando llega la primera consulta. Por eso el servidor puede arrancar aunque la base esté caída, y el error aparecería en la primera petición.

---

## 3. Mapa de carpetas

```
Crezia/
├── package.json            Dependencias y scripts (dev, build, start, test, db:migrate, db:seed).
├── tsconfig.json           Configuración de TypeScript: compila src/ a dist/, modo strict, excluye tests/.
├── vitest.config.ts        Configuración de Vitest: corre tests/**/*.test.ts en entorno node.
├── prisma.config.ts        Configuración de Prisma 7: dónde está el schema, las migraciones, el seed y la URL de la CLI (DIRECT_URL).
├── .env.example            Plantilla de variables de entorno (sin valores reales).
├── .env                    Tus valores reales. Está en .gitignore: nunca se sube.
├── .gitignore              Ignora node_modules/, dist/, .env, coverage/ y generated/.
├── README.md               Documentación de uso: instalación, endpoints, reglas, Postman.
├── CLAUDE.md               Instrucciones del proyecto para Claude Code.
│
├── docs/
│   ├── db/crezia_schema_v2.sql   Diseño original de la base de datos (DDL). Es la referencia del diseño.
│   └── GUIA_DEL_CODIGO.md        Esta guía.
│
├── prisma/
│   ├── schema.prisma             Modelos de la base (13 tablas y 13 enums) traducidos del SQL de docs/.
│   ├── seed.ts                   Carga datos de prueba (monedas, categorías del sistema, un usuario, una cuenta, movimientos y una meta).
│   └── migrations/
│       ├── migration_lock.toml   Indica que el proveedor es postgresql.
│       └── 20261014000000_init/migration.sql   La única migración: crea todo (tablas, índices, CHECKs y triggers).
│
├── src/
│   ├── server.ts           Punto de entrada: carga .env, arma el contenedor y levanta el servidor.
│   ├── app.ts              Crea la app de Express y monta middlewares y rutas.
│   │
│   ├── domain/             CAPA 1 — El "qué" del negocio. No importa nada de las otras capas.
│   │   ├── entities/       Tipos de los datos (User, Category, BankAccount, Movement, Goal) y reglas pequeñas (isSystemCategory, isPositiveAmount…).
│   │   ├── repositories/   Interfaces (contratos) de acceso a datos. Solo dicen QUÉ se puede hacer, no CÓMO.
│   │   └── errors.ts       Errores del dominio (ValidationError, NotFoundError…) con mensajes en español.
│   │
│   ├── application/        CAPA 2 — Casos de uso y reglas de negocio. Solo usa domain.
│   │   ├── services.ts     Interfaces PasswordHasher y TokenService (bcrypt y JWT se implementan afuera).
│   │   ├── money.ts        toCents / fromCents: dinero en centavos enteros.
│   │   ├── auth/           LoginUseCase.
│   │   ├── categories/     5 casos de uso + categoryAccess.ts (quién puede ver/editar) + index.ts (agrupa).
│   │   ├── bankAccounts/   5 casos de uso + bankAccountAccess.ts + balance.ts (cálculo del saldo) + index.ts.
│   │   ├── movements/      5 casos de uso + movementAccess.ts (validaciones de cuenta, categoría y moneda) + index.ts.
│   │   └── goals/          5 casos de uso + goalAccess.ts (validaciones de metas) + progress.ts (cálculo del progreso) + index.ts.
│   │
│   ├── infrastructure/     CAPA 3 — El "cómo": Prisma, bcrypt, JWT. Implementa las interfaces de domain/application.
│   │   ├── container.ts    Composition root: crea y conecta todos los objetos.
│   │   ├── prisma/client.ts      Crea el PrismaClient con el adaptador de pg.
│   │   ├── prisma/softDelete.ts  Helper softDeleteRow (UPDATE con deleted_at = now()).
│   │   ├── repositories/   Prisma*Repository: implementaciones reales de los repositorios.
│   │   └── security/       BcryptPasswordHasher y JwtTokenService.
│   │
│   ├── presentation/       CAPA 4 — HTTP: lo que habla con Express.
│   │   ├── routes/         Un archivo por recurso: define URL + middlewares + método del controller.
│   │   ├── controllers/    Reciben la petición, llaman al caso de uso y responden JSON.
│   │   ├── middlewares/    auth (token), validate (zod), errorHandler + notFound.
│   │   ├── schemas/        Schemas de zod que validan body, params y query.
│   │   └── types/express.d.ts   Agrega req.user al tipo Request de Express.
│   │
│   └── generated/prisma/   Cliente de Prisma generado por `prisma generate`. No se edita a mano y está en .gitignore.
│
└── tests/
    ├── helpers/            Repositorios en memoria y mocks de req/res para probar sin base de datos.
    ├── application/        Pruebas de casos de uso y cálculos (auth, categories, bankAccounts, movements, goals).
    └── presentation/       Pruebas de middlewares (auth, validate, errorHandler) y de schemas de zod.
```

**Regla de dependencias** (de afuera hacia adentro): `presentation` → `application` → `domain`, e `infrastructure` → `application` / `domain`. `domain` y `application` nunca importan Prisma ni Express.

> Dos excepciones permitidas que vale la pena notar: `presentation/schemas/movementSchemas.ts:2-3` y `goalSchemas.ts:2` importan constantes de `application` (mensajes, límites de paginación), y `infrastructure/repositories/PrismaGoalRepository.ts:1` importa el mensaje `ACTIVE_GOAL_CONFLICT_MESSAGE` de `application`. Las dos van "hacia adentro", así que respetan la regla.

---

## 4. Dónde están las interfaces y los tipos

### 4.1 Interfaces de repositorios (`src/domain/repositories/`)

Son **contratos**: dicen qué métodos existen. La versión real usa Prisma; la de pruebas guarda todo en arreglos.

| Interfaz | Archivo | Para qué sirve | Implementación Prisma | Implementación de pruebas |
|---|---|---|---|---|
| `UserRepository` | `UserRepository.ts:3` | Buscar un usuario por correo **con** su hash de contraseña (para el login). | `PrismaUserRepository` (`src/infrastructure/repositories/PrismaUserRepository.ts`) | **No hay clase en memoria.** `tests/application/auth/LoginUseCase.test.ts:25` crea un objeto falso con `vi.fn`. |
| `CategoryRepository` | `CategoryRepository.ts:24` | Listar visibles, buscar por id, crear, editar y borrar (soft) categorías. | `PrismaCategoryRepository` | `InMemoryCategoryRepository` (`tests/helpers/InMemoryCategoryRepository.ts`) |
| `BankAccountRepository` | `BankAccountRepository.ts:34` | CRUD de cuentas + `sumMovementsByAccount` (totales para el saldo) + `hasMovements`. | `PrismaBankAccountRepository` | `InMemoryBankAccountRepository` (`tests/helpers/InMemoryBankAccountRepository.ts`) |
| `CurrencyRepository` | `CurrencyRepository.ts:1` | Saber si un código de moneda existe y está activo. | `PrismaCurrencyRepository` | `InMemoryCurrencyRepository` (está en el mismo archivo `tests/helpers/InMemoryBankAccountRepository.ts:106`) |
| `MovementRepository` | `MovementRepository.ts:54` | Listar con filtros y paginación, buscar, crear, editar y borrar (soft) movimientos. | `PrismaMovementRepository` | `InMemoryMovementRepository` (`tests/helpers/InMemoryMovementRepository.ts`) |
| `GoalRepository` | `GoalRepository.ts:41` | CRUD de metas + `existsActiveInCategory` + `sumContributions` (progreso). | `PrismaGoalRepository` | `InMemoryGoalRepository` (`tests/helpers/InMemoryGoalRepository.ts`) |

**Tipos de datos que acompañan a los repositorios** (son los "DTOs" que entran y salen del repositorio):

| Tipo | Archivo | Para qué |
|---|---|---|
| `CreateCategoryData`, `UpdateCategoryData` | `CategoryRepository.ts:3`, `:12` | Datos para crear / editar una categoría (incluyen `createdBy`, `updatedBy`). |
| `SoftDeleteData` | `CategoryRepository.ts:19` | `{ deletedBy }`. Se define aquí y se reexporta en los otros repositorios. |
| `CreateBankAccountData`, `UpdateBankAccountData` | `BankAccountRepository.ts:7`, `:17` | Crear / editar cuenta. |
| `MovementTotal` | `BankAccountRepository.ts:27` | Una fila de totales: cuenta + tipo (Income/Expense) + suma. |
| `CreateMovementData`, `UpdateMovementData` | `MovementRepository.ts:6`, `:21` | Crear / editar movimiento. |
| `MovementFilters` | `MovementRepository.ts:34` | Filtros opcionales: `type`, `categoryId`, `bankAccountId`, `from`, `to`. |
| `Pagination` | `MovementRepository.ts:42` | `{ skip, take }` (cuántos saltar y cuántos traer). |
| `MovementPage` | `MovementRepository.ts:47` | `{ data, total }`: la página y el total sin paginar. |
| `CreateGoalData`, `UpdateGoalData` | `GoalRepository.ts:6`, `:21` | Crear / editar meta. |
| `GoalTotal` | `GoalRepository.ts:35` | `{ goalId, amount }`: lo acumulado por meta. |

### 4.2 Entidades (`src/domain/entities/`)

No las "implementa" ninguna clase: son **formas de datos**. Los repositorios devuelven objetos con esa forma.

| Tipo / interfaz | Archivo | Para qué |
|---|---|---|
| `UserRole` (tipo) | `User.ts:1` | `'User' \| 'Admin'`. |
| `User` | `User.ts:4` | Usuario "público": **sin** contraseña. Es lo que devuelve el login. |
| `UserWithCredentials` | `User.ts:14` | `User` + `passwordHash`. Solo se usa dentro del login. |
| `Category` | `Category.ts:2` | Categoría. `userId: null` = categoría del sistema. Función `isSystemCategory` en `:12`. |
| `AccountType` (tipo) + `ACCOUNT_TYPES` | `BankAccount.ts:1-3` | Tipos de cuenta. La constante también la usa zod. |
| `BankAccount` | `BankAccount.ts:6` | Cuenta bancaria (sin saldo). |
| `BankAccountWithBalance` | `BankAccount.ts:19` | Cuenta + `balance` calculado (texto con 2 decimales). |
| `MovementType`, `PaymentMethod`, `MovementSource` (tipos) | `Movement.ts:5-7` | Valores permitidos, sacados de las constantes de `:1-3`. |
| `Movement` | `Movement.ts:11` | Movimiento. `amount` es texto (`"85000.00"`) y `date` es `"AAAA-MM-DD"`. Función `isPositiveAmount` en `:32`. |
| `GoalReason`, `GoalStatus` (tipos) | `Goal.ts:13-14` | Motivos y estados de meta. `ACTIVE_GOAL_STATUSES` (`:18`) = Active y Overdue. |
| `Goal` | `Goal.ts:25` | Meta de ahorro (sin progreso). |
| `GoalProgress` | `Goal.ts:44` | `accumulated`, `remaining`, `percentage`. |
| `GoalWithProgress` | `Goal.ts:52` | `Goal` + `GoalProgress`. |
| `ErrorDetail` | `src/domain/errors.ts:1` | `{ path, message }` de cada error de validación. |

**Clases de error** (`src/domain/errors.ts`): `DomainError` (abstracta, `:6`), y sus hijas `ValidationError` (`:15`), `UnauthorizedError` (`:26`), `ForbiddenError` (`:34`), `NotFoundError` (`:42`), `ConflictError` (`:50`). Cada una tiene un `code` y un mensaje por defecto en español.

### 4.3 Servicios de la capa application (`src/application/services.ts`)

| Interfaz | Línea | Para qué | Implementación real | En pruebas |
|---|---|---|---|---|
| `PasswordHasher` | `:3` | `hash` y `compare` de contraseñas. | `BcryptPasswordHasher` (`src/infrastructure/security/BcryptPasswordHasher.ts`) | Objeto falso con `vi.fn` en `LoginUseCase.test.ts:26`. |
| `TokenPayload` | `:8` | `{ userId }`: lo que lleva el token. | — (es solo un tipo) | — |
| `TokenService` | `:12` | `sign` (crear token) y `verify` (validarlo). | `JwtTokenService` (`src/infrastructure/security/JwtTokenService.ts`) | Falso con `vi.fn` en `LoginUseCase.test.ts:30`; **real** con un secreto de prueba en `tests/presentation/middlewares/auth.test.ts:8`. |

### 4.4 DTOs de entrada y salida de los casos de uso (`src/application/`)

| Tipo | Archivo | Para qué |
|---|---|---|
| `LoginInput`, `LoginOutput` | `auth/LoginUseCase.ts:6`, `:11` | Entrada `{ email, password }`; salida `{ token, user }`. |
| `CreateCategoryInput`, `UpdateCategoryInput` | `categories/CreateCategoryUseCase.ts:4`, `UpdateCategoryUseCase.ts:5` | Lo que el usuario puede mandar. |
| `CreateBankAccountInput`, `UpdateBankAccountInput` | `bankAccounts/CreateBankAccountUseCase.ts:6`, `UpdateBankAccountUseCase.ts:9` | Ídem para cuentas. |
| `CreateMovementInput`, `UpdateMovementInput` | `movements/CreateMovementUseCase.ts:8`, `UpdateMovementUseCase.ts:15` | Ídem para movimientos. |
| `ListMovementsInput`, `MovementList` | `movements/ListMovementsUseCase.ts:8`, `:13` | Filtros + `page`/`limit`; respuesta `{ data, page, limit, total }`. |
| `CreateGoalInput`, `UpdateGoalInput` | `goals/CreateGoalUseCase.ts:17`, `UpdateGoalUseCase.ts:21` | Ídem para metas. |
| `BalanceEntry` | `bankAccounts/balance.ts:6` | Entrada mínima para calcular un saldo. |
| `ContributionEntry` | `goals/progress.ts:6` | Entrada mínima para saber si un movimiento cuenta para una meta. |
| `CategoryUseCases`, `BankAccountUseCases`, `MovementUseCases`, `GoalUseCases` | `*/index.ts` de cada carpeta | Agrupan los 5 casos de uso (`list`, `get`, `create`, `update`, `delete`) que recibe cada controller. |
| `Container` | `src/infrastructure/container.ts:38` | Todo lo que `app.ts` necesita: `tokenService` y los grupos de casos de uso. |

### 4.5 Tipos de infraestructura

| Tipo | Archivo | Para qué |
|---|---|---|
| `SoftDeletableTable` | `src/infrastructure/prisma/softDelete.ts:4` | Las únicas 4 tablas que puede borrar `softDeleteRow`. |
| `MovementRow`, `GoalRow` | `PrismaMovementRepository.ts:30`, `PrismaGoalRepository.ts:30` | Forma exacta de la fila que devuelve Prisma, antes de convertirla a la entidad. |

### 4.6 Tipos de presentación

| Tipo | Archivo | Para qué |
|---|---|---|
| `RequestSchemas` | `src/presentation/middlewares/validate.ts:5` | `{ body?, params?, query? }`: qué schemas de zod usar. |
| `IdParams` | `schemas/commonSchemas.ts:7` | `{ id }` validado como UUID. |
| `LoginBody` | `schemas/authSchemas.ts:8` | Body del login. |
| `CreateCategoryBody`, `UpdateCategoryBody` | `schemas/categorySchemas.ts:30-31` | Bodies de categorías. |
| `CreateBankAccountBody`, `UpdateBankAccountBody` | `schemas/bankAccountSchemas.ts:46-47` | Bodies de cuentas. |
| `CreateMovementBody`, `UpdateMovementBody`, `ListMovementsQuery` | `schemas/movementSchemas.ts:86-88` | Bodies y query de movimientos. |
| `CreateGoalBody`, `UpdateGoalBody` | `schemas/goalSchemas.ts:66-67` | Bodies de metas. |

Todos estos tipos se generan **solos** desde el schema con `z.infer<typeof …>`: si cambias el schema, el tipo cambia.

### 4.7 La extensión de `Request` de Express

`src/presentation/types/express.d.ts:2-8` agrega a **todas** las peticiones de Express el campo opcional `user?: { id: string }`. Lo llena el middleware `auth` (`auth.ts:14`) y lo leen los controllers con `req.user!.id`. El `!` le dice a TypeScript "confía, aquí siempre existe", porque todas esas rutas pasan antes por `auth`.

### 4.8 Tipos de las pruebas (`tests/helpers/`)

`StoredCategory`, `StoredBankAccount`, `StoredMovement`, `StoredGoal`: la entidad + columnas de auditoría (`createdBy`, `deletedAt`…), porque el repositorio en memoria necesita recordar qué está borrado.

> Ojo: hay **dos** `StoredMovement` distintos: uno en `InMemoryBankAccountRepository.ts:20` (solo cuenta, tipo, monto y borrado, para el saldo) y otro en `InMemoryMovementRepository.ts:13` (el movimiento completo).

---

## 5. Rutas y endpoints

Las rutas se montan en `src/app.ts:21-38` y se definen en `src/presentation/routes/`. En total hay **22 endpoints**.

| Método | URL completa | Archivo de rutas | Controller → método | Caso de uso | Token | Schema de zod |
|---|---|---|---|---|---|---|
| GET | `/api/health` | `src/app.ts:21` (en línea) | — (función anónima) | — | No | — |
| POST | `/api/auth/login` | `authRoutes.ts:8` | `AuthController.login` | `LoginUseCase` | No | body: `loginBodySchema` |
| GET | `/api/categories` | `categoryRoutes.ts:13` | `CategoryController.list` | `ListCategoriesUseCase` | Sí | — |
| GET | `/api/categories/:id` | `categoryRoutes.ts:14` | `CategoryController.get` | `GetCategoryUseCase` | Sí | params: `idParamsSchema` |
| POST | `/api/categories` | `categoryRoutes.ts:15` | `CategoryController.create` | `CreateCategoryUseCase` | Sí | body: `createCategoryBodySchema` |
| PATCH | `/api/categories/:id` | `categoryRoutes.ts:16` | `CategoryController.update` | `UpdateCategoryUseCase` | Sí | params: `idParamsSchema` + body: `updateCategoryBodySchema` |
| DELETE | `/api/categories/:id` | `categoryRoutes.ts:17` | `CategoryController.delete` | `DeleteCategoryUseCase` | Sí | params: `idParamsSchema` |
| GET | `/api/bank-accounts` | `bankAccountRoutes.ts:13` | `BankAccountController.list` | `ListBankAccountsUseCase` | Sí | — |
| GET | `/api/bank-accounts/:id` | `bankAccountRoutes.ts:14` | `BankAccountController.get` | `GetBankAccountUseCase` | Sí | params: `idParamsSchema` |
| POST | `/api/bank-accounts` | `bankAccountRoutes.ts:15` | `BankAccountController.create` | `CreateBankAccountUseCase` | Sí | body: `createBankAccountBodySchema` |
| PATCH | `/api/bank-accounts/:id` | `bankAccountRoutes.ts:16` | `BankAccountController.update` | `UpdateBankAccountUseCase` | Sí | params: `idParamsSchema` + body: `updateBankAccountBodySchema` |
| DELETE | `/api/bank-accounts/:id` | `bankAccountRoutes.ts:17` | `BankAccountController.delete` | `DeleteBankAccountUseCase` | Sí | params: `idParamsSchema` |
| GET | `/api/movements` | `movementRoutes.ts:17` | `MovementController.list` | `ListMovementsUseCase` | Sí | query: `listMovementsQuerySchema` |
| GET | `/api/movements/:id` | `movementRoutes.ts:18` | `MovementController.get` | `GetMovementUseCase` | Sí | params: `idParamsSchema` |
| POST | `/api/movements` | `movementRoutes.ts:19` | `MovementController.create` | `CreateMovementUseCase` | Sí | body: `createMovementBodySchema` |
| PATCH | `/api/movements/:id` | `movementRoutes.ts:20` | `MovementController.update` | `UpdateMovementUseCase` | Sí | params: `idParamsSchema` + body: `updateMovementBodySchema` |
| DELETE | `/api/movements/:id` | `movementRoutes.ts:21` | `MovementController.delete` | `DeleteMovementUseCase` | Sí | params: `idParamsSchema` |
| GET | `/api/goals` | `goalRoutes.ts:13` | `GoalController.list` | `ListGoalsUseCase` | Sí | — |
| GET | `/api/goals/:id` | `goalRoutes.ts:14` | `GoalController.get` | `GetGoalUseCase` | Sí | params: `idParamsSchema` |
| POST | `/api/goals` | `goalRoutes.ts:15` | `GoalController.create` | `CreateGoalUseCase` | Sí | body: `createGoalBodySchema` |
| PATCH | `/api/goals/:id` | `goalRoutes.ts:16` | `GoalController.update` | `UpdateGoalUseCase` | Sí | params: `idParamsSchema` + body: `updateGoalBodySchema` |
| DELETE | `/api/goals/:id` | `goalRoutes.ts:17` | `GoalController.delete` | `DeleteGoalUseCase` | Sí | params: `idParamsSchema` |

Todos los archivos de rutas están en `src/presentation/routes/` y los controllers en `src/presentation/controllers/`. Los schemas de `:id` viven en `schemas/commonSchemas.ts`; los demás en `schemas/<recurso>Schemas.ts`.

**Lo que NO existe todavía** (para que no lo busques): no hay registro de usuarios (`/register`), ni endpoints de usuario/perfil, monedas, correos, contenido educativo ni notificaciones, aunque esas tablas sí existen en la base.

**Respuestas de éxito:** GET y PATCH → 200 con el recurso; POST → 201 (`res.status(201)`); DELETE → 200 con `{ message: "… eliminada/o con éxito" }`.

---

## 6. Recorrido completo de una petición

### 6.1 `POST /api/movements` (crear un gasto)

Ejemplo de petición:

```http
POST /api/movements
Authorization: Bearer <token>
Content-Type: application/json

{ "bankAccountId": "<uuid de tu cuenta>", "categoryId": "<uuid>", "type": "Expense",
  "amount": 85000, "date": "2026-10-15", "paymentMethod": "DebitCard", "description": "Mercado" }
```

Por dónde pasa, en orden:

1. **`src/app.ts:18` — `cors()`**: agrega cabeceras CORS para que un frontend en otro dominio pueda llamar a la API.
2. **`src/app.ts:19` — `express.json()`**: convierte el texto del body en un objeto JS (`req.body`). Si el JSON está mal escrito, Express genera un error con `type: 'entity.parse.failed'` que termina en el `errorHandler` como **400 `INVALID_JSON`** (`errorHandler.ts:34`).
3. **`src/app.ts:34-37`**: la URL empieza por `/api/movements`, así que Express entra al router de `movementRoutes(...)`.
4. **`src/presentation/routes/movementRoutes.ts:15` — `router.use(auth(tokens))`**: corre el middleware de autenticación:
   - `auth.ts:9` busca la cabecera `Authorization: Bearer <token>` con la expresión regular de `auth.ts:5`. Si no está → `UnauthorizedError('Falta el token de autenticación')` → **401**.
   - `auth.ts:13` llama a `tokens.verify(...)` → `JwtTokenService.ts:30-38` usa `jwt.verify` con algoritmo HS256. Si el token es inválido o expiró → **401** `'Token inválido o expirado'`.
   - `auth.ts:14` guarda `req.user = { id: userId }` y sigue (`next()`).
5. **`movementRoutes.ts:19` — `validate({ body: createMovementBodySchema })`**: el middleware `validate.ts:12-38`:
   - Llama a `createMovementBodySchema.safeParse(req.body)` (`validate.ts:21`). El schema está en `movementSchemas.ts:35-44`.
   - En el camino, zod **transforma** los datos: `amount: 85000` se vuelve el texto `"85000"` (`commonSchemas.ts:17`), `currencyCode` se pasa a mayúsculas, se quitan espacios y se **eliminan** las llaves desconocidas (por ejemplo si mandas `userId` o `source`).
   - Si hay errores, junta todos con su `path` (ej. `body.amount`) y lanza `ValidationError` → **400** con `details` (`validate.ts:31`).
   - Si todo está bien, reemplaza `req.body` por el valor limpio (`validate.ts:33`).
6. **`src/presentation/controllers/MovementController.ts:19-21` — `create`**: llama a `this.useCases.create.execute(req.body, req.user!.id)`. Ese `useCases.create` es el `CreateMovementUseCase` que armó `container.ts:77`.
7. **`src/application/movements/CreateMovementUseCase.ts:30-53` — `execute`** aplica las reglas de negocio, en este orden:
   1. `ensurePositiveAmount(amount)` (`movementAccess.ts:40`): el monto debe ser > 0 → si no, 400.
   2. `ensureUsableCategory(...)` (`movementAccess.ts:45`): usa `findVisibleCategory` (`categoryAccess.ts:9`), que llama a `PrismaCategoryRepository.findById`. La categoría debe ser del sistema o tuya y no estar borrada → si no, **400** en `body.categoryId`.
   3. Si mandaste `bankAccountId`: `ensureUsableBankAccount(...)` (`movementAccess.ts:59`) → `findOwnedBankAccount` (`bankAccountAccess.ts:11`) → `PrismaBankAccountRepository.findById`. Debe ser tuya y no estar borrada → si no, **400** en `body.bankAccountId`.
   4. `resolveCurrency(...)` (`movementAccess.ts:74`): con cuenta, la moneda **se toma de la cuenta** (si mandas otra distinta → 400). Sin cuenta, `currencyCode` es obligatoria y se revisa con `PrismaCurrencyRepository.isActive`.
   5. `this.movements.create({...})` con `source: 'Manual'` y `createdBy`/`updatedBy` = tu id (`CreateMovementUseCase.ts:39-52`).
8. **`src/infrastructure/repositories/PrismaMovementRepository.ts:80-86` — `create`**: convierte la fecha `"2026-10-15"` a `Date` en medianoche UTC (`toDbDate`, `:33`), ejecuta `prisma.movement.create(...)` (un `INSERT`) y convierte la fila de vuelta con `toMovement` (`:37`): el `Decimal` de Prisma pasa a `"85000.00"` y la fecha a `"2026-10-15"`.
9. **De vuelta en el controller** (`MovementController.ts:20`): `res.status(201).json(movimiento)` → el cliente recibe **201** con el movimiento creado.

**¿Y si algo falla en los pasos 6-8?** Los controllers no tienen `try/catch`. Express 5 detecta que la función `async` falló (promesa rechazada) y pasa el error a `next(err)`. Ese error salta `notFound` (que no es manejador de errores) y llega a `errorHandler` (`errorHandler.ts:26`), que lo traduce a un código HTTP con `statusFor` (`:11-18`).

### 6.2 `POST /api/auth/login` (versión corta)

1. `cors()` y `express.json()` (`app.ts:18-19`).
2. `app.ts:25` entra a `authRoutes`. **No hay middleware `auth`** aquí (aún no tienes token).
3. `authRoutes.ts:8` → `validate({ body: loginBodySchema })`: correo con formato válido y contraseña no vacía (`authSchemas.ts:3-6`).
4. `AuthController.login` (`AuthController.ts:8-11`) → `loginUseCase.execute(req.body)`.
5. `LoginUseCase.execute` (`LoginUseCase.ts:27-36`):
   - `users.findByEmailWithCredentials(email)` → `PrismaUserRepository.ts:8-21` busca un usuario no borrado con ese correo, trayendo el `passwordHash`.
   - Si no existe → 401 `'Correo o contraseña incorrectos'`.
   - `hasher.compare(password, passwordHash)` → `bcrypt.compare` (`BcryptPasswordHasher.ts:11-13`). Si no coincide → **el mismo** 401, para no revelar qué correos existen.
   - Quita el `passwordHash` del objeto (`LoginUseCase.ts:34`) y firma el token con `tokens.sign({ userId })` (`:35` → `JwtTokenService.ts:22-28`).
6. El controller responde **200** `{ token, user }`.

---

## 7. Middlewares

| Middleware | Archivo | Dónde se aplica | Qué hace |
|---|---|---|---|
| `cors()` | librería `cors`, registrado en `src/app.ts:18` | Global (todas las peticiones) | Permite llamadas desde otros orígenes (frontend). |
| `express.json()` | Express, registrado en `src/app.ts:19` | Global | Convierte el body JSON en `req.body`. |
| `auth(tokens)` | `src/presentation/middlewares/auth.ts:7` | Con `router.use` en `categoryRoutes.ts:11`, `bankAccountRoutes.ts:11`, `movementRoutes.ts:15`, `goalRoutes.ts:11`. **No** en `authRoutes` ni en `/api/health`. | Valida el token Bearer y llena `req.user`. |
| `validate(schemas)` | `src/presentation/middlewares/validate.ts:12` | Por ruta, dentro de cada archivo de rutas (ver tabla de la sección 5). | Valida y limpia `body`, `params` y `query` con zod. |
| `notFound` | `src/presentation/middlewares/errorHandler.ts:21` | Global, después de todos los routers (`app.ts:40`). | Si ninguna ruta respondió → 404 `La ruta X no existe`. |
| `errorHandler` | `src/presentation/middlewares/errorHandler.ts:26` | Global, el **último** (`app.ts:41`). | Convierte cualquier error en JSON `{ error: { code, message, details? } }` con su código HTTP. |

**Orden en una ruta protegida** (por ejemplo `PATCH /api/goals/:id`):

```
cors → express.json → [router /api/goals] auth → validate → GoalController.update
                                                    │ (si algo lanza error)
                                                    └──────────────→ errorHandler
```

Consecuencias de ese orden que vale la pena saber:
- `auth` va **antes** de `validate`: si mandas un `:id` inválido **y** sin token, recibes **401**, no 400.
- Como `auth` se pone con `router.use`, también corre para sub-rutas que no existen dentro de ese prefijo: `GET /api/goals/a/b` sin token da **401**; con token da **404** (lo atrapa `notFound`).

**Tabla de traducción de errores** (`errorHandler.ts:11-18` y `:34-40`):

| Error | HTTP | `code` |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| JSON mal formado | 400 | `INVALID_JSON` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| Cualquier otro (bug, BD caída…) | 500 | `INTERNAL_ERROR` (el detalle solo se imprime en consola, `:39`) |

---

## 8. Casos de uso

Todos reciben sus repositorios por el **constructor** y tienen un método `execute`. Viven en `src/application/<recurso>/`.

### Auth

| Caso de uso | Archivo | Regla de negocio |
|---|---|---|
| `LoginUseCase` | `auth/LoginUseCase.ts` | Compara la contraseña con bcrypt; correo inexistente y contraseña errada dan **el mismo** mensaje 401; nunca devuelve el hash; firma un JWT con el id del usuario. |

### Categorías (`categories/`)

| Caso de uso | Archivo | Regla de negocio |
|---|---|---|
| `ListCategoriesUseCase` | `ListCategoriesUseCase.ts` | Devuelve las del sistema (`userId` null) + las tuyas, sin borradas. Orden: sistema primero, luego por nombre (`PrismaCategoryRepository.ts:28`). |
| `GetCategoryUseCase` | `GetCategoryUseCase.ts` | Usa `findVisibleCategory` (`categoryAccess.ts:9`): categoría de otro usuario → **404**. |
| `CreateCategoryUseCase` | `CreateCategoryUseCase.ts` | El dueño siempre es el usuario autenticado y `isDefault` siempre es `false`, aunque el cliente mande otra cosa. |
| `UpdateCategoryUseCase` | `UpdateCategoryUseCase.ts` | Usa `findOwnedCategory` (`categoryAccess.ts:22`): las del sistema son de solo lectura → **403**. |
| `DeleteCategoryUseCase` | `DeleteCategoryUseCase.ts` | Igual que editar (403 para las del sistema) y luego soft delete. |

### Cuentas bancarias (`bankAccounts/`)

| Caso de uso | Archivo | Regla de negocio |
|---|---|---|
| `ListBankAccountsUseCase` | `ListBankAccountsUseCase.ts` | Trae tus cuentas y **en una sola consulta agrupada** los totales de movimientos; calcula el saldo de cada una (`balance.ts:25`). |
| `GetBankAccountUseCase` | `GetBankAccountUseCase.ts` | Cuenta ajena → 404 (`bankAccountAccess.ts:11`). Devuelve la cuenta con su saldo. |
| `CreateBankAccountUseCase` | `CreateBankAccountUseCase.ts` | La moneda debe existir y estar activa (`ensureActiveCurrency`, `bankAccountAccess.ts:31`) → si no, 400. Una cuenta nueva sale con `balance: "0.00"`. |
| `UpdateBankAccountUseCase` | `UpdateBankAccountUseCase.ts` | Cambiar la moneda solo si es activa y **la cuenta no tiene movimientos** → si tiene, **409** (`:32`). Mandar la misma moneda está permitido. |
| `DeleteBankAccountUseCase` | `DeleteBankAccountUseCase.ts` | Soft delete de la cuenta. Sus movimientos **no** se tocan. |

**Fórmula del saldo** (`balance.ts:14-22`): Σ Income − Σ Expense de los movimientos no borrados, calculado en centavos.

### Movimientos (`movements/`)

| Caso de uso | Archivo | Regla de negocio |
|---|---|---|
| `ListMovementsUseCase` | `ListMovementsUseCase.ts` | Solo tus movimientos no borrados, con filtros, orden por fecha descendente y paginación (`page` ≥ 1, `limit` entre 1 y 100). Incluye movimientos de cuentas borradas. |
| `GetMovementUseCase` | `GetMovementUseCase.ts` | Movimiento ajeno → 404 (`movementAccess.ts:27`). |
| `CreateMovementUseCase` | `CreateMovementUseCase.ts` | Monto > 0; categoría visible; cuenta tuya y no borrada; moneda = la de la cuenta (o obligatoria y activa si no hay cuenta); `source` siempre `Manual`. Ver sección 6.1. |
| `UpdateMovementUseCase` | `UpdateMovementUseCase.ts` | Solo valida lo que **realmente cambia** (`:41-64`): así puedes reenviar campos iguales de un movimiento cuya categoría se borró después. Si cambia cuenta, moneda, monto o tipo, la cuenta debe seguir siendo usable. `bankAccountId: null` lo desliga de la cuenta. |
| `DeleteMovementUseCase` | `DeleteMovementUseCase.ts` | Movimiento ajeno → 404; si es tuyo, soft delete. |

### Metas de ahorro (`goals/`)

| Caso de uso | Archivo | Regla de negocio |
|---|---|---|
| `ListGoalsUseCase` | `ListGoalsUseCase.ts` | Tus metas no borradas + su progreso, calculado en **una sola** consulta SQL (`sumContributions`). Orden: fecha fin ascendente. |
| `GetGoalUseCase` | `GetGoalUseCase.ts` | Meta ajena → 404 (`goalAccess.ts:29`). Devuelve la meta con progreso. |
| `CreateGoalUseCase` | `CreateGoalUseCase.ts` | `targetAmount` > 0; `endDate` **posterior** a `startDate` (`goalAccess.ts:48`); `endDate` no en el pasado (`:52`); `reasonOther` obligatorio solo si `reason` es `Other` (`:57`); categoría usable; moneda activa; **una sola meta activa por categoría** → si no, **409** (`:63`). Siempre nace `Active`. Puede nacer con progreso si ya había gastos en esa categoría y rango. |
| `UpdateGoalUseCase` | `UpdateGoalUseCase.ts` | Valida combinando lo que mandas con lo que ya está guardado. La fecha fin **sí** puede quedar en el pasado al editar. Si cambias de `Other` a otro motivo, borra el `reasonOther` viejo (`:55`). Revisa el conflicto de meta activa solo si la meta se reactiva o cambia de categoría (`:66-69`). |
| `DeleteGoalUseCase` | `DeleteGoalUseCase.ts` | Meta ajena → 404; si es tuya, soft delete. Los movimientos que sumaban a la meta no se tocan. |

**Fórmula del progreso** (`progress.ts:34-42`): `remaining = target − accumulated` (mínimo 0) y `percentage = accumulated / target × 100` (tope 100, redondeado a 2 decimales).

---

## 9. Base de datos

### Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Diseño original (SQL) | `docs/db/crezia_schema_v2.sql` |
| Schema de Prisma | `prisma/schema.prisma` — 13 enums y 13 modelos (`Currency`, `User`, `Category`, `BankAccount`, `Movement`, `Goal`, `EmailConnection`, `ParsedEmail`, `FinancialProfile`, `ContentCategory`, `EducationalContent`, `UserContentInteraction`, `Notification`). El código hoy solo usa los 6 primeros. |
| Migración | `prisma/migrations/20261014000000_init/migration.sql` — la única. Además de lo que genera Prisma, tiene escrito a mano: la extensión `pgcrypto` (`:5`), los `CHECK` (`:551-579`, por ejemplo `amount > 0`, usuario mayor de 18 años, `end_date >= start_date`) y la función `set_updated_at()` con sus triggers (`:586-615`). |
| Seed | `prisma/seed.ts` — crea las monedas COP y USD, 7 categorías del sistema, un usuario de prueba (`test@crezia.com`; la contraseña está en el propio archivo), una cuenta Bancolombia, 5 movimientos del mes actual y la meta "Viaje a Cartagena". Si el usuario ya existe, no duplica nada (`seed.ts:53-59`). |
| Configuración de Prisma | `prisma.config.ts` — schema, carpeta de migraciones, comando del seed (`tsx prisma/seed.ts`) y la URL para la CLI. |

### Cómo se conecta el código a la base

Hay **dos URLs** en el `.env` (ver `.env.example`, sin valores reales):

| Variable | La usa | Para qué |
|---|---|---|
| `DATABASE_URL` | La API en ejecución (`src/infrastructure/prisma/client.ts:5`) y el seed (`seed.ts:7`) | Pooler de **transacciones** de Supabase (puerto 6543, `pgbouncer=true`). Bueno para muchas conexiones cortas. |
| `DIRECT_URL` | La CLI de Prisma: `migrate`, `db seed` (`prisma.config.ts:14`) | Pooler de **sesión** (puerto 5432). Las migraciones necesitan una sesión estable. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | `JwtTokenService.fromEnv()` | Firmar y dar duración a los tokens. |
| `PORT` | `server.ts:5` | Puerto del servidor. |

El cliente se crea así (`client.ts:5-8`):

```ts
new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
```

- `PrismaClient` viene de `src/generated/prisma/client` (lo genera `prisma generate`, que corre solo en `npm install` por el script `postinstall`, y en `npm run build`).
- `PrismaPg` (paquete `@prisma/adapter-pg`) es el **adaptador**: en Prisma 7 la conexión real a PostgreSQL la hace el driver `pg` de Node, y el adaptador lo conecta con Prisma.
- Se crea **un solo** cliente (`container.ts:48`) y se comparte entre todos los repositorios.

### El helper `softDeleteRow` (`src/infrastructure/prisma/softDelete.ts:9-19`)

Los 4 repositorios (categorías, cuentas, movimientos, metas) lo usan para borrar. Ejecuta este SQL:

```sql
UPDATE "<tabla>"
SET deleted_at = now(), deleted_by = <tu id>, updated_by = <tu id>
WHERE id = <id> AND deleted_at IS NULL
```

- **No borra la fila**: solo la marca. Por eso todas las lecturas filtran `deletedAt: null`.
- Usa `now()` de la **base de datos** (no la hora del servidor Node) para que `deleted_at` y `updated_at` (que pone el trigger `set_updated_at`) usen el mismo reloj.
- El nombre de la tabla se mete con `Prisma.raw` (texto sin escapar), pero es seguro porque solo puede ser uno de los 4 valores del tipo `SoftDeletableTable` (`:4`), nunca algo que mande el usuario. Los valores (`id`, `deletedBy`) sí van como parámetros seguros gracias a la plantilla `` $executeRaw`...` ``.
- `AND deleted_at IS NULL` evita "volver a borrar" algo ya borrado.

### La consulta `$queryRaw` de las metas (`PrismaGoalRepository.ts:122-136`)

```sql
SELECT g.id::text AS goal_id, SUM(m.amount)::text AS amount
FROM goals g
JOIN movements m
  ON m.user_id = g.user_id                        -- movimientos del dueño de la meta
 AND m.category_id = g.category_id                -- en la categoría de la meta
 AND m.type = 'Expense'                           -- solo gastos (ahorrar = gastar en esa categoría)
 AND m.deleted_at IS NULL                         -- sin borrados
 AND m.date BETWEEN g.start_date AND g.end_date   -- dentro del rango (inclusive)
WHERE g.id = ANY(<lista de ids>::uuid[])
GROUP BY g.id
```

- **Por qué SQL a mano:** cada meta tiene su propia categoría y su propio rango de fechas. El `groupBy` de Prisma no puede expresar ese "join con condiciones distintas por fila", así que se escribe el SQL.
- **Por qué una sola consulta:** si tienes 10 metas, hace 1 consulta, no 10.
- `::text` convierte los resultados a texto para no perder decimales.
- Metas sin aportes **no aparecen** en el resultado; `withProgress` (`progress.ts:54-57`) les pone `'0'`.
- Aplica exactamente la misma regla que `isGoalContribution` en código (`progress.ts:21`).

Otro detalle de `PrismaGoalRepository`: `withActiveGoalConflict` (`:46-55`) atrapa el error `P2002` de Prisma (violación del índice único `uq_goals_active_category`) y lo convierte en `ConflictError` (409). Cubre el caso de dos peticiones al mismo tiempo que pasan la validación previa.

---

## 10. Funciones y librerías clave

| Función | Archivo donde se usa | Para qué |
|---|---|---|
| `bcrypt.compare(plain, hash)` | `src/infrastructure/security/BcryptPasswordHasher.ts:12`, llamado desde `LoginUseCase.ts:31` | Compara la contraseña escrita con el hash guardado, sin "desencriptar" nada. `bcrypt.hash` (`:8`) solo se usa de verdad en `prisma/seed.ts:66`. |
| `jwt.sign(...)` | `src/infrastructure/security/JwtTokenService.ts:23` | Crea el token con `subject` = id del usuario, expiración (`JWT_EXPIRES_IN`) y algoritmo HS256. |
| `jwt.verify(...)` | `JwtTokenService.ts:32`, llamado desde `auth.ts:13` | Revisa firma y expiración; solo acepta HS256. Cualquier fallo → `UnauthorizedError('Token inválido o expirado')`. |
| `schema.safeParse(...)` (zod) | `src/presentation/middlewares/validate.ts:21` | Valida sin lanzar excepción: devuelve `{ success, data }` o `{ success: false, error }`. Así se juntan **todos** los errores en `details`. |
| `toCents(amount)` | `src/application/money.ts:5`; usado en `balance.ts:18`, `progress.ts:35-36` y `:48`, y en `tests/helpers/InMemoryGoalRepository.ts:97` | Pasa `"85000.50"` a `8500050` (entero), para sumar sin errores de decimales (`0.1 + 0.2 ≠ 0.3`). |
| `fromCents(cents)` | `src/application/money.ts:14`; usado en `balance.ts:21`, `progress.ts:41` y `:50` | Lo contrario: `8500050` → `"85000.50"`. |
| `isGoalContribution(goal, entry)` | `src/application/goals/progress.ts:21`; usado en `progressFromMovements` (`progress.ts:48`) y en `InMemoryGoalRepository.ts:95` | Decide si un movimiento cuenta para una meta. Es la regla "oficial" en código; el SQL de `sumContributions` la repite. En producción el cálculo lo hace el SQL; esta función se usa en pruebas. |
| Paginación `page` / `limit` | Schema: `src/presentation/schemas/movementSchemas.ts:69-79` (por defecto 1 y 20, máximo 100; `z.coerce` convierte el texto de la URL a número). Caso de uso: `ListMovementsUseCase.ts:25-30` (repite los límites y calcula `skip = (page − 1) × limit`). Repositorio: `PrismaMovementRepository.ts:58-68` | El repositorio hace `findMany` (la página) y `count` (el total) **dentro de una misma `$transaction`**, para que ambos números sean coherentes. Respuesta: `{ data, page, limit, total }`. |

---

## 11. Pruebas

### Organización

```
tests/
├── helpers/
│   ├── http.ts                           mockRequest() y mockResponse(): req y res falsos para probar middlewares.
│   ├── InMemoryCategoryRepository.ts     Implementa CategoryRepository sobre un arreglo.
│   ├── InMemoryBankAccountRepository.ts  Implementa BankAccountRepository y CurrencyRepository.
│   ├── InMemoryMovementRepository.ts     Implementa MovementRepository.
│   └── InMemoryGoalRepository.ts         Implementa GoalRepository.
├── application/      Casos de uso y cálculos (14 archivos de prueba en total entre las dos carpetas).
│   ├── auth/LoginUseCase.test.ts
│   ├── categories/CategoryUseCases.test.ts
│   ├── bankAccounts/BankAccountUseCases.test.ts y balance.test.ts
│   ├── movements/MovementUseCases.test.ts
│   └── goals/GoalUseCases.test.ts y progress.test.ts
└── presentation/
    ├── middlewares/  auth.test.ts, validate.test.ts, errorHandler.test.ts
    └── schemas/      categorySchemas, bankAccountSchemas, movementSchemas, goalSchemas (.test.ts)
```

La carpeta `tests/` imita la estructura de `src/`, así sabes qué prueba corresponde a qué archivo.

### ¿Qué son los repositorios en memoria?

Son clases que **cumplen la misma interfaz** que los repositorios de Prisma (`implements CategoryRepository`, etc.), pero guardan los datos en un arreglo (`rows`) en vez de en PostgreSQL. Gracias a que los casos de uso reciben el repositorio por el constructor, en la prueba se hace:

```ts
const categories = new InMemoryCategoryRepository();
const useCase = new CreateCategoryUseCase(categories);   // en vez de PrismaCategoryRepository
```

Ventajas: las pruebas son rápidas, no necesitan internet ni base de datos y no ensucian datos reales.

Cosas que traen para facilitar las pruebas:
- `seed(...)`: mete una fila de ejemplo con valores por defecto.
- `addMovement(...)` (en cuentas y metas): agrega movimientos para probar saldo y progreso.
- `sumCalls`: cuenta cuántas veces se llamó la suma, para comprobar que se hace **una sola** consulta para varias cuentas/metas.
- `softDelete` usa `new Date()` en lugar del `now()` de la base.

Para el login no hay clase en memoria: `LoginUseCase.test.ts` crea objetos falsos con `vi.fn()` de Vitest.

### Cómo correr las pruebas

```powershell
npm test
```

Ejecuta `vitest run` (`package.json:10`), que busca `tests/**/*.test.ts` (`vitest.config.ts:5`). No necesita `.env` ni base de datos.

Otras formas útiles:

```powershell
npx vitest                                   # modo "watch": re-ejecuta al guardar
npx vitest run tests/application/goals       # solo una carpeta
npx vitest run -t "LoginUseCase"             # solo las pruebas cuyo nombre coincide
```

---

## 12. Glosario

1. **Entidad**: la forma de un dato del negocio (por ejemplo `Movement`), definida en `src/domain/entities/`.
2. **DTO (Data Transfer Object)**: un objeto simple que solo transporta datos de una capa a otra, como `CreateMovementInput` o `CreateMovementData`.
3. **Repositorio**: el objeto encargado de guardar y leer datos; la interfaz dice *qué* hace (domain) y la clase dice *cómo* lo hace (Prisma o memoria).
4. **Caso de uso**: una clase con un método `execute` que realiza una acción completa del negocio, como "crear un movimiento", aplicando sus reglas.
5. **Controller**: la clase de `presentation` que recibe la petición HTTP, llama al caso de uso y devuelve la respuesta JSON.
6. **Middleware**: una función que Express ejecuta en cadena antes (o después) del controller, como `auth`, `validate` o `errorHandler`.
7. **Schema (zod)**: la descripción de cómo deben ser los datos que llegan; zod la usa para validar, limpiar y generar tipos de TypeScript.
8. **Inyección de dependencias**: pasarle a una clase lo que necesita por el constructor (en vez de que ella lo cree), lo que permite cambiar Prisma por memoria en las pruebas; el lugar donde se arma todo es `container.ts` (el *composition root*).
9. **Soft delete**: "borrar" marcando `deleted_at` y `deleted_by` en vez de eliminar la fila, para no perder historial.
10. **JWT (JSON Web Token)**: un texto firmado que el servidor entrega al hacer login y que el cliente envía en `Authorization: Bearer …` para demostrar quién es.

---

## Anexo: detalles que encontré leyendo el código

No son errores graves, pero conviene que los conozcas:

- `src/presentation/controllers/GoalController.ts:28` tiene el comentario *"Unlike the other resources, goals answer 200 with a confirmation message"*, pero hoy **todos** los DELETE responden 200 con mensaje. El comentario quedó desactualizado.
- `src/presentation/controllers/CategoryController.ts:28` hace `.json(...).end()`: el `.end()` sobra, porque `.json()` ya termina la respuesta. Además los mensajes de DELETE están escritos directamente en cada controller, salvo en metas, que usa la constante `GOAL_DELETED_MESSAGE`.
- El progreso de las metas **no filtra por moneda**: una meta en USD suma también gastos en COP de su categoría (ya está anotado en `README.md`, sección "Limitaciones conocidas").
