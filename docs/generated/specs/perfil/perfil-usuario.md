# Especificación: consultar y editar el perfil del usuario autenticado

| Campo | Valor |
|---|---|
| Identificador | `PROF-001` |
| Rama propuesta | `feature/user-profile` (sale de `develop`) |
| Estado | **Propuesta pendiente de tu aprobación. No se ha escrito código del backend.** |
| Origen | Decisión de la usuaria: pantalla "Mi perfil" con ver y editar. Hoy no hay ningún endpoint para consultar ni editar al usuario autenticado (solo `POST /api/auth/login`). No hay historia Jira asociada (no se inventa identificador). |
| Skill | spec-driven-development (modos Analyze, Specify, Design, Plan; sin Implement) |
| Sistema de especificaciones | No hay `specs/` ni OpenSpec en el repo. Se usa este documento y el catálogo [`campos-usuario.md`](./campos-usuario.md), sin crear más estructura. |
| Relacionada | Registro (parte 3): comparte los campos definidos en el catálogo |

## 1. Problema y objetivo

El front necesita mostrar los datos de la cuenta de quien inició sesión y dejarle corregir los que son suyos sin riesgo para el acceso. El login ya devuelve `{ id, documentId, name, email, role, preferredCurrencyCode }`, pero no teléfono, dirección, género ni fecha de nacimiento, y no existe forma de actualizarlos.

## 2. Alcance

**Incluye**
- `GET /api/users/me`: devuelve el perfil del usuario del token.
- `PATCH /api/users/me`: actualiza **solo** `name`, `phone`, `address`, `gender` y `genderOther`.

**No incluye** (queda para otras especificaciones)
- Cambiar correo (ver §10, decisión D-1), identificación, fecha de nacimiento, rol o moneda preferida.
- Cambiar contraseña (ver §10, D-2): endpoint y reglas propias.
- Editar el perfil financiero (parte 4).
- Registro, borrado de cuenta, doble factor, recuperación de contraseña.
- **Migraciones:** no hacen falta; todas las columnas existen.

## 3. Evidencia del código revisado

| Hallazgo | Dónde |
|---|---|
| El token solo lleva `userId`; `auth` lo pone en `req.user.id` | `src/presentation/middlewares/auth.ts` |
| Rutas montadas por módulo en `app.ts`, con `auth(tokens)` por router | `src/app.ts`, `movementRoutes.ts` |
| `UserRepository` solo tiene `findByEmailWithCredentials` | `src/domain/repositories/UserRepository.ts` |
| La entidad pública `User` no incluye teléfono, dirección, género ni fecha de nacimiento | `src/domain/entities/User.ts` |
| Convención de PATCH: `z.object` descarta claves desconocidas y un `refine` exige al menos un campo | `goalSchemas.ts`, `categorySchemas.ts`, `movementSchemas.ts` |
| Errores de dominio con código y mensaje en español; el manejador traduce `UnauthorizedError`→401, `NotFoundError`→404 | `src/domain/errors.ts`, `middlewares/errorHandler.ts` |
| El login responde igual con correo inexistente que con contraseña mala, para no revelar cuentas | `LoginUseCase.ts` |
| Hay índices únicos parciales de correo e identificación entre no borrados | `migration.sql` (`uq_users_email`, `uq_users_document_id`) |
| `two_factor_enabled` no se usa en ningún código | búsqueda en `src/` |

## 4. Contrato

Ambos requieren `Authorization: Bearer <token>`. **No hay `:id` en la ruta**: el único usuario posible es el del token.

### `GET /api/users/me`

**Respuesta 200**

```json
{
  "id": "6f1c…",
  "name": "Camila Rodríguez Pérez",
  "email": "camila.rodriguez@example.com",
  "documentId": "1012345678",
  "birthDate": "1994-05-17",
  "phone": "3001234567",
  "address": "Calle 10 # 5-20, Medellín",
  "gender": "Female",
  "genderOther": null,
  "preferredCurrencyCode": "COP",
  "createdAt": "2026-10-16T14:03:22.000Z"
}
```

- `phone`, `address`, `gender` y `genderOther` pueden ser `null`.
- **Nunca** se devuelven `passwordHash`, `role`, `twoFactorEnabled`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt` ni `deletedBy`. (El `role` ya viaja en la respuesta del login; el perfil no lo repite porque no se muestra ni se edita.)
- `birthDate` sale como `AAAA-MM-DD`.

### `PATCH /api/users/me`

**Cuerpo** (todos opcionales, al menos uno de los cinco)

| Campo | Regla (detalle y mensajes en el catálogo, §3) |
|---|---|
| `name` | Texto, recortado, 1–150 |
| `phone` | `string` o `null`; vacío = `null`; formato propuesto |
| `address` | `string` o `null`; vacío = `null`; máx. 255 |
| `gender` | `"Female"`, `"Male"`, `"Other"` o `null` |
| `genderOther` | `string` o `null`; máx. 100; obligatorio si `gender` es `"Other"` |

**Respuesta 200:** el mismo objeto que `GET`, ya actualizado.

**Errores** (formato existente `{ error: { code, message, details? } }`)

| Código | Caso | Mensaje (español) |
|---|---|---|
| 400 `VALIDATION_ERROR` | Cuerpo sin ninguno de los cinco campos (incluye un cuerpo con solo `email`, `role`, etc.) | "Envía al menos un campo para actualizar" |
| 400 `VALIDATION_ERROR` | Cualquier regla de campo | Mensajes del catálogo, con `details[].path` = `body.<campo>` |
| 401 | Sin token o token inválido | Mensajes actuales del middleware `auth` |
| 401 | Token válido pero el usuario fue borrado (decisión D-4) | "Tu sesión ya no es válida" |

No hay 404 ni 409: no se manejan recursos ajenos ni campos únicos.

## 5. Reglas de negocio y seguridad

1. **El `userId` sale solo del token** (`req.user!.id`). No existe ningún parámetro, cabecera ni campo del cuerpo que lo cambie.
2. **Lista blanca de campos editables.** El esquema zod solo conoce los cinco campos; **lo demás se descarta** (convención del proyecto). El repositorio, además, arma la actualización campo por campo: **nunca** hace `data: body`. Así `id`, `email`, `documentId`, `birthDate`, `role`, `passwordHash`, `preferredCurrencyCode`, `twoFactorEnabled`, `createdBy`, `deletedAt`… no se pueden escribir aunque lleguen en el cuerpo. Un cuerpo que solo trae campos no permitidos recibe 400 (no un 200 engañoso).
3. **Solo usuarios no borrados** (`deletedAt: null`), como el login.
4. **Auditoría:** `updated_by` = el propio usuario; `updated_at` lo maneja el disparador de la base.
5. **Mensajes que no revelan nada de otras cuentas:** ninguna rama de este endpoint compara con datos de otros usuarios (no hay campos únicos editables), así que no hay mensajes de "ya existe". Los errores 401 son genéricos.
6. **Sin registro de datos personales:** no se escribe el cuerpo ni la respuesta en logs.
7. **Cadenas vacías:** `phone`, `address` y `genderOther` vacíos se guardan como `null`, no como `""`.
8. **Coherencia género:** si `gender` queda distinto de `Other`, `genderOther` se guarda `null`. Si se envía `gender: "Other"` sin `genderOther` y el usuario no tenía uno guardado, 400.
9. **Idempotencia:** repetir el mismo PATCH da el mismo resultado.
10. **Concurrencia:** gana la última escritura (es un perfil de una sola persona); no se usa control de versiones.

## 6. Diseño (Clean Architecture)

```
presentation   userRoutes ──► UserController.getMe / updateMe
                 auth + validate({ body: updateProfileBodySchema })
application    GetMyProfileUseCase, UpdateMyProfileUseCase  (reciben UserRepository por constructor)
domain         UserProfile (entidad pública), UserRepository.findProfileById / updateProfile
infrastructure PrismaUserRepository.findProfileById / updateProfile
```

- **domain:** nueva entidad `UserProfile` (los campos de la respuesta) y dos métodos en `UserRepository`: `findProfileById(id)` y `updateProfile(id, changes)`, donde `changes` es un tipo con solo los cinco campos. Sin importar Prisma ni Express.
- **application:** `GetMyProfileUseCase.execute(userId)` y `UpdateMyProfileUseCase.execute(userId, changes)` (aplica la coherencia de género y lanza `UnauthorizedError` si el usuario ya no existe). Se registran en `container.ts` y se exportan desde `application/users/index.ts`.
- **infrastructure:** `select` explícito (nunca `passwordHash`), `update` con `where: { id, deletedAt: null }` y los cinco campos mapeados a mano.
- **presentation:** `updateProfileBodySchema` (zod, mensajes en español), `UserController`, `userRoutes`, montaje `app.use('/api/users', userRoutes(...))`. Los textos de validación van en el esquema; el front muestra el mensaje bajo cada campo con `details[].path`.
- **Ruta `/me` antes de cualquier `/:id` futuro** (hoy no hay `/:id` en usuarios; se deja anotado).

## 7. Criterios de aceptación

| Id | Criterio (observable) |
|---|---|
| AC-1 | `GET /api/users/me` con token válido devuelve el perfil del usuario del token, con los campos del contrato y ninguno de los prohibidos. |
| AC-2 | La respuesta de `GET` no contiene `passwordHash`, `role`, `twoFactorEnabled` ni campos de auditoría. |
| AC-3 | Sin token o con token inválido → 401 en `GET` y `PATCH`. |
| AC-4 | `PATCH` con `name` válido actualiza el nombre y devuelve el perfil completo actualizado. |
| AC-5 | `PATCH` parcial: enviar solo `phone` no cambia el resto de los campos. |
| AC-6 | `name` vacío, solo espacios o de más de 150 caracteres → 400 con mensaje y `details[].path = "body.name"`. |
| AC-7 | `phone` con formato inválido o de más de 20 caracteres → 400. `phone: ""` o `null` lo deja en `null`. |
| AC-8 | `address` de más de 255 caracteres → 400; vacío o `null` lo deja en `null`. |
| AC-9 | `gender` fuera de `Female`/`Male`/`Other`/`null` → 400. |
| AC-10 | `gender: "Other"` sin `genderOther` (y sin uno previo) → 400; con `genderOther` → 200. |
| AC-11 | Cambiar `gender` a `Female` deja `genderOther` en `null`. |
| AC-12 | `PATCH {}` o un cuerpo con solo campos no permitidos → 400 "Envía al menos un campo para actualizar". |
| AC-13 | Un cuerpo con `name` válido más `email`, `role`, `documentId`, `birthDate`, `passwordHash`, `id` y `preferredCurrencyCode` **cambia solo el nombre**; los demás campos quedan iguales (se comprueba leyendo de nuevo). |
| AC-14 | Dos usuarios: el `PATCH` de A nunca modifica a B; enviar `id` o `userId` de B en el cuerpo no tiene efecto. |
| AC-15 | Con el usuario borrado (soft delete) y un token aún válido, `GET` y `PATCH` → 401 "Tu sesión ya no es válida". |
| AC-16 | `PATCH` registra `updated_by` = el usuario y no toca `created_at`. |
| AC-17 | El login, categorías, cuentas, movimientos y metas no cambian. |

## 8. Plan de pruebas

**Vitest (unitarias, sin BD)** — `tests/helpers/InMemoryUserRepository.ts` (nuevo, mismo patrón que los otros `InMemory*`, filtrando borrados como el real):
- `tests/application/users/GetMyProfileUseCase.test.ts`: AC-1, 2, 15.
- `tests/application/users/UpdateMyProfileUseCase.test.ts`: AC-4, 5, 10, 11, 13 (el repositorio en memoria solo acepta los cinco campos, como el real), 14, 15.
- `tests/presentation/schemas/updateProfileBodySchema.test.ts`: AC-6 a 10 y 12 (incluye recorte de espacios, vacío → `null`, límites 150/20/255/100, claves desconocidas descartadas).
- `tests/presentation/routes/userRoutes.test.ts` (router real sobre servidor HTTP local, como `movementRoutes.test.ts`): AC-3, 12 y que `/api/users/me` responde sin pasar por ninguna ruta `/:id`.

**Playwright API** (usa la BD real del `.env` con el usuario del seed) — `tests/api/users/me.spec.ts` + `services/users.service.ts`: AC-1, 2, 3, 4, 5, 6, 7, 9, 12, 13. **Riesgo:** estas pruebas modifican al usuario del seed; la prueba debe **leer el perfil original antes y restaurarlo al final** (`afterAll`), y no tocar el correo ni la contraseña. AC-14 y AC-15 necesitan un segundo usuario o un usuario borrado y se cubren solo con Vitest (no se crean usuarios en la base real sin tu autorización).

**Postman:** una petición `GET` y una `PATCH` (con script de `pm.test`), en la colección de resumen o en una nueva. Misma decisión que en `DASH-001` (opción A): tú decides.

**Comandos de verificación:** `npx tsc --noEmit`, `npx vitest run` y Playwright con el backend levantado. No se declararán pasadas hasta ejecutarlas.

## 9. Seguridad (revisión proporcional, no es una auditoría)

| Control | Cómo se cumple |
|---|---|
| Autenticación | Router bajo `auth(tokens)` |
| Autorización / aislamiento | `userId` solo del token; sin `:id`; `where` siempre con ese id (AC-14) |
| Asignación masiva (mass assignment) | Lista blanca en el esquema **y** en el repositorio; prueba AC-13 |
| Validación de entrada | zod con longitudes de la base; vacíos → `null` |
| Datos sensibles | `select` explícito sin `passwordHash`; sin datos personales en logs |
| Enumeración de cuentas | El endpoint no compara contra otras cuentas; correo e identificación no son editables |
| Cuenta borrada | Se trata como sesión inválida (401) |
| Errores | Formato y mensajes existentes; sin detalles internos |

La revisión formal sigue a cargo de `application-security-review` (parte 6). Nota heredada de `DASH-001`: el RLS de Supabase sigue pendiente de tu revisión; el aislamiento depende del filtro por `userId` en el código.

**Límite que conviene saber:** el token JWT no se puede revocar. Si en el futuro se cambia el correo o la contraseña, las sesiones abiertas siguen válidas hasta que expiren. No afecta a esta especificación (no cambia credenciales) pero sí a D-1 y D-2.

## 10. Decisiones que necesito de ti

| Id | Decisión | Mi recomendación | Por qué |
|---|---|---|---|
| D-1 | **Correo electrónico:** ¿solo lectura, o editable con revalidación? | **Solo lectura en esta fase.** Un flujo propio y posterior ("Cambiar correo") que pida la contraseña actual | (1) Es el dato de inicio de sesión y no hay recuperación de contraseña: un error de digitación deja a la persona sin acceso. (2) La regla aprobada es **sin confirmación de correo**, así que no habría forma de comprobar que el nuevo correo es del usuario. (3) Una sesión robada podría redirigir la cuenta. (4) Dar un 409 "ese correo ya existe" revelaría qué correos tienen cuenta. Si lo quieres editable ya, lo mínimo seguro es exigir la contraseña actual en la misma petición y responder con un mensaje genérico ante duplicados. |
| D-2 | **Cambio de contraseña:** ¿en esta pantalla o después? | **Después**, como tarjeta "Seguridad" dentro de Mi perfil con **su propio botón y endpoint** (`PATCH /api/users/me/password`: contraseña actual + nueva, bcrypt) y su propia especificación y rama | Tiene otro contrato y otros riesgos (verificar la contraseña actual, reglas de contraseña que se definen en el registro, sesiones abiertas que no se pueden revocar). Mezclarlo con Editar/Guardar de datos personales confunde y obliga a decidir las reglas de contraseña antes que el registro. No se implementa ni se diseña un botón que no funcione. |
| D-3 | **Perfil financiero (encuesta) en Mi perfil:** ¿lo incluimos? | **No en esta pantalla.** Cuando la parte 4 defina los endpoints de la encuesta, añadir un acceso "Actualizar mi perfil financiero" que lleve a la encuesta (o una sección propia) | Son 13 campos con otras reglas y su propio endpoint (aún no existe); además la decisión de si se puede editar la encuesta está abierta en la parte 4. |
| D-4 | Token válido de un usuario ya borrado: ¿401 o 404? | **401** "Tu sesión ya no es válida" | Para quien tiene ese token la cuenta ya no existe; 404 daría pistas sobre el recurso y el front ya sabe manejar el 401 (volver al login). |
| D-5 | **Reglas que propongo y la base no exige:** formato del teléfono (7–20 caracteres, números, espacios, `+`, `-`, paréntesis) y `genderOther` obligatorio con "Otro" y nulo en los demás casos | Aprobar ambas | Evitan basura en los datos. Si prefieres menos reglas, el teléfono puede quedar solo con el límite de 20 |
| D-6 | **Moneda preferida** como solo lectura | Aprobar | Hoy nada la usa; se vuelve editable cuando el Panel o las cuentas la consuman |
| D-7 | Claves no permitidas en el `PATCH`: ¿descartarlas (convención actual) o rechazarlas con 400? | **Descartarlas** y dar 400 solo si no queda ningún campo válido | Coherente con las demás rutas del proyecto y sin informar de qué campos existen |
| D-8 | Postman | Opción A (como `DASH-001`) | Coherencia |

## 11. Tareas (para cuando apruebes)

1. Entidad `UserProfile` y métodos en `UserRepository`.
2. `PrismaUserRepository.findProfileById` / `updateProfile` (`select` explícito, lista blanca).
3. `GetMyProfileUseCase` y `UpdateMyProfileUseCase`.
4. `updateProfileBodySchema`, `UserController`, `userRoutes` y montaje en `app.ts`; registro en `container.ts`.
5. `InMemoryUserRepository` y pruebas Vitest.
6. Pruebas Playwright (con restauración del perfil) y servicio `users.service.ts`.
7. README (tabla de endpoints), `docs/GUIA_DEL_CODIGO.md` y Postman (según D-8).
8. Verificación: `tsc`, Vitest, Playwright; listar lo que no se pudo correr.

## 12. Qué no se ha verificado

- Nada de esto está implementado ni ejecutado; son decisiones y criterios.
- No se leyó Jira (no hay historia asociada que se conozca); si existe una para el perfil, conviene contrastarla antes de aprobar.
- No se comprobó el comportamiento real del `update` de Prisma con el disparador de `updated_at` ni contra Supabase.
