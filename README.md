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
| `PORT` | Puerto del servidor. Por defecto `3000`. |

Las dos URL se copian desde Supabase → *Connect*. Para generar un `JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> El `.env` nunca se sube al repositorio.

### Base de datos

La base de datos se maneja **solo con migraciones** (`prisma/migrations`). El diseño completo está en `docs/db/crezia_schema_v2.sql`.

```powershell
npm run db:migrate   # prisma migrate dev: aplica las migraciones
npm run db:seed      # prisma db seed: carga los datos de prueba
```

## Cómo correr

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con recarga automática (`tsx watch`). |
| `npm test` | Pruebas unitarias con Vitest (no necesitan base de datos). |
| `npm run build` | `prisma generate` + compilación de TypeScript a `dist/`. |
| `npm start` | Corre la versión compilada (`dist/server.js`). |

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

### Auth

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| POST | `/api/auth/login` | No | `{ "email": "test@crezia.com", "password": "Test123*" }` | 200 `{ token, user }` · 400 · 401 credenciales incorrectas |

### Categorías

Lista las del sistema y las propias.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/categories` | Sí | — | 200 |
| GET | `/api/categories/:id` | Sí | — | 200 · 404 |
| POST | `/api/categories` | Sí | `{ "name": "Mascotas", "description": "Comida y veterinario" }` | 201 · 400 |
| PATCH | `/api/categories/:id` | Sí | `{ "description": "Solo veterinario" }` | 200 · 400 · 403 categoría del sistema · 404 |
| DELETE | `/api/categories/:id` | Sí | — | 200 `{ "message": "Categoría eliminada con éxito" }` · 403 · 404 |

### Cuentas bancarias

Cada cuenta se devuelve con su `balance` calculado. `accountType`: `Savings`, `Checking`, `Credit`, `Other`.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/bank-accounts` | Sí | — | 200 |
| GET | `/api/bank-accounts/:id` | Sí | — | 200 · 404 |
| POST | `/api/bank-accounts` | Sí | `{ "bankName": "Nequi", "accountAlias": "Gastos", "accountType": "Savings", "currencyCode": "COP" }` | 201 · 400 (incluye moneda inexistente o inactiva) |
| PATCH | `/api/bank-accounts/:id` | Sí | `{ "accountAlias": "Nómina" }` | 200 · 400 · 404 · 409 cambio de moneda con movimientos |
| DELETE | `/api/bank-accounts/:id` | Sí | — | 200 `{ "message": "Cuenta bancaria eliminada con éxito" }` · 404 |

### Movimientos

`type`: `Income` o `Expense`. `paymentMethod`: `Cash`, `Transfer`, `CreditCard`, `DebitCard`, `Other`. `bankAccountId` es opcional (por ejemplo, efectivo); si va, la moneda se toma de la cuenta, y si no va, `currencyCode` es obligatoria. Los creados por la API quedan con `source: "Manual"`.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/movements` | Sí | — (ver filtros) | 200 `{ data, page, limit, total }` · 400 |
| GET | `/api/movements/:id` | Sí | — | 200 · 404 |
| POST | `/api/movements` | Sí | `{ "bankAccountId": "<uuid>", "categoryId": "<uuid>", "type": "Expense", "amount": 85000, "date": "2026-10-15", "paymentMethod": "DebitCard", "description": "Mercado" }` | 201 · 400 |
| PATCH | `/api/movements/:id` | Sí | `{ "amount": "90000", "description": "Mercado del mes" }` | 200 · 400 · 404 |
| DELETE | `/api/movements/:id` | Sí | — | 200 `{ "message": "Movimiento eliminado con éxito" }` · 404 |

**Filtros de la lista (query, todos opcionales):** `type`, `categoryId`, `bankAccountId`, `from` y `to` (fechas inclusivas, `from` ≤ `to`), `page` (por defecto 1) y `limit` (por defecto 20, máximo 100). Orden: fecha descendente.

```
GET /api/movements?type=Expense&from=2026-10-01&to=2026-10-31&page=1&limit=20
```

**400 en movimientos:** monto ≤ 0, categoría que no es del sistema ni del usuario (o está borrada), cuenta ajena o borrada, moneda distinta a la de la cuenta, o falta la moneda cuando no hay cuenta. Los movimientos de una cuenta borrada siguen apareciendo en la lista, pero no se pueden crear nuevos en ella.

### Metas de ahorro

Cada meta se devuelve con su progreso: `accumulated`, `remaining` (texto con 2 decimales) y `percentage` (número de 0 a 100). `reason`: `Travel`, `Vehicle`, `Education`, `EmergencyFund`, `HomePurchase`, `Technology`, `DebtPayment`, `Other`. `status`: `Active`, `Completed`, `Cancelled`, `Overdue`; toda meta nueva empieza en `Active`, y el estado solo se cambia por PATCH.

| Método | Ruta | Token | Body | Respuestas |
|---|---|---|---|---|
| GET | `/api/goals` | Sí | — | 200 |
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

## Limitaciones conocidas

- **El progreso de las metas no filtra por moneda:** una meta en USD suma también los gastos en COP de su categoría.
- **El estado `Overdue` se puede poner a mano** con PATCH; todavía no hay un proceso que marque las metas vencidas.

## Ramas y commits

- `master`: versión estable.
- `develop`: integración.
- `feature/<nombre>`: una rama por funcionalidad, que sale de `develop` y vuelve a ella por pull request; las pruebas van en la misma rama.
- Commits en inglés con **Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`...).
