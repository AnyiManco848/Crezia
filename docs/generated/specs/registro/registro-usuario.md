# Especificación: registro de usuarios (backend)

| Campo | Valor |
|---|---|
| Identificador | `AUTH-REG-001` (interno de este documento; no hay historia ni ticket asociado, no se inventa uno externo) |
| Rama propuesta | `feature/auth-register` (sale de `develop`) |
| Estado | **Propuesta, esperando tu aprobación. No se ha implementado nada.** |
| Origen | Decisión de la usuaria: registro sin confirmación de correo, edad ≥ 18, moneda por defecto COP, hash de contraseña, mensajes que no revelen si un correo existe, límite de intentos si corresponde. Sin ese endpoint solo entran usuarios sembrados. |
| Skill | spec-driven-development (modos Analyze, Specify, Design y Plan; sin Implement) |
| Sistema de especificaciones | No hay `specs/` ni OpenSpec: se usa este documento, junto a `dashboard-summary.md` y `perfil/`. |
| Referencias | Campos y reglas de validación: [`perfil/campos-usuario.md`](../perfil/campos-usuario.md) (fuente única, no se repite aquí). Pantalla: `design/especificacion-ui.md` §4.2. |

## 1. Problema y objetivo

`POST /api/auth/login` es el único endpoint de autenticación. Una persona nueva no puede crear su cuenta. Objetivo: un endpoint público que cree un usuario con rol `User`, guarde su contraseña solo como hash y devuelva la sesión lista para usar.

## 2. Alcance

**Incluye:** `POST /api/auth/register`; validación con zod; caso de uso `RegisterUserUseCase`; método de creación en `UserRepository`; límite de intentos por IP; pruebas.

**No incluye:**
- **Confirmación de correo: pendiente** (backlog). Requiere migración (`email_verified_at`), envío de correo y cambia el contrato (ver §10).
- Recuperar o cambiar contraseña, cambio de correo, doble factor.
- Encuesta de perfil financiero (parte 4) y Mi perfil.
- Límite de intentos en el **login** (hallazgo, §9): es otro cambio.

## 3. Evidencia del código y la base revisados

| Hallazgo | Dónde |
|---|---|
| Solo existe `POST /api/auth/login`; `UserRepository` solo tiene `findByEmailWithCredentials` | `authRoutes.ts`, `UserRepository.ts` |
| `User` público (sin hash) = `id, documentId, name, email, role, preferredCurrencyCode`; es lo que devuelve el login | `domain/entities/User.ts`, `LoginUseCase.ts` |
| Ya existen `PasswordHasher` (bcrypt, 10 rondas) y `TokenService` (JWT con `userId`) | `application/services.ts`, `BcryptPasswordHasher.ts` |
| `CurrencyRepository.isActive(code)` ya valida monedas | `CurrencyRepository.ts` |
| Errores de dominio y su estado HTTP: Validation 400, Unauthorized 401, Forbidden 403, NotFound 404, **Conflict 409** | `domain/errors.ts`, `errorHandler.ts` |
| Único por correo y por identificación **solo entre no borrados** (`uq_users_email`, `uq_users_document_id`, índices parciales) | `migration.sql` líneas 308 y 311 |
| `chk_users_adult`: `birth_date <= CURRENT_DATE - 18 años` | `migration.sql` línea 555 |
| FK de `preferred_currency_code` a `currency`; `role` por defecto `User`; `two_factor_enabled` por defecto `false` | `schema.prisma` |
| El índice único de correo distingue mayúsculas; el login busca el correo **tal cual** | `migration.sql`, `PrismaUserRepository.ts` |
| `bcrypt` solo usa los primeros **72 bytes** de la contraseña | Propiedad de bcrypt |
| No hay limitador de peticiones ni dependencia para ello; el login tampoco lo tiene | `app.ts`, `package.json` |
| No existe endpoint para borrar usuarios | `routes/` |

## 4. Contrato

### `POST /api/auth/register` (público, sin token)

**Cuerpo**

| Campo | Obligatorio | Regla (mensaje en español) |
|---|---|---|
| `name` | Sí | Sin espacios sobrantes, 1 a 150: "El nombre es obligatorio" / "El nombre no puede superar los 150 caracteres" |
| `documentId` | Sí | Sin espacios, 1 a 20 caracteres; formato: ver D-6: "La identificación es obligatoria" |
| `birthDate` | Sí | `AAAA-MM-DD` válida, 18 años cumplidos hoy, no anterior a `1900-01-01`: "Debes tener 18 años o más" |
| `email` | Sí | Sin espacios, formato válido, hasta 255, se guarda en minúsculas (D-4): "El correo no es válido" |
| `phone` | No | Vacío = nulo; 7 a 20 caracteres con dígitos, espacios, `+`, `(`, `)` y `-` (propuesta ya listada en `campos-usuario.md`): "Escribe un teléfono válido…" |
| `password` | Sí | Ver D-2: "La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número" |
| `preferredCurrencyCode` | No | 3 letras; por defecto `COP`; debe existir y estar activa (use case): "La moneda no es válida" |

Llaves desconocidas se **descartan** (zod): `role`, `id`, `twoFactorEnabled`, `createdBy`… nunca llegan al caso de uso.

**Respuestas**

| Estado | Cuándo | Cuerpo |
|---|---|---|
| `201` | Cuenta creada | `{ token, user }` con la misma forma que el login (D-3). Nunca incluye `passwordHash` |
| `400` | Validación | `{ error: { code: "VALIDATION_ERROR", message, details: [{ path, message }] } }` (formato actual) |
| `409` | Correo o identificación ya usados (o carrera entre dos registros) | `{ error: { code: "CONFLICT", message: "No pudimos crear la cuenta con esos datos. Revisa la información o inicia sesión si ya tienes una cuenta." } }` (D-1). Es **el mismo mensaje** para correo repetido, identificación repetida o ambos |
| `429` | Demasiados intentos desde la misma IP | `{ error: { code: "TOO_MANY_REQUESTS", message: "Demasiados intentos. Inténtalo de nuevo en unos minutos." } }` y cabecera `Retry-After` |
| `500` | Error inesperado | Formato actual, sin detalles internos |

## 5. Reglas de negocio

1. Todo usuario nuevo es `role = User`. Ningún dato del cliente puede cambiarlo.
2. La contraseña se guarda **solo** como hash bcrypt (el `PasswordHasher` existente). Nunca se registra en logs ni se devuelve.
3. Edad: 18 años cumplidos al día de hoy. Se calcula con fechas de calendario (sin horas) para no depender de la zona horaria; la base repite la regla con `chk_users_adult` como segunda barrera.
4. Moneda: `COP` si no se envía; si se envía, debe estar activa en `currency` (hoy COP y USD).
5. Correo e identificación son únicos entre no borrados. La verificación previa es una comodidad; la **garantía** es el índice único: si dos registros simultáneos chocan, el error de unicidad de la base (`P2002`) se traduce al mismo `409`.
6. Un usuario con borrado lógico no bloquea volver a registrar su correo o identificación (el índice es parcial). Es el comportamiento actual de la base y no se cambia.
7. `created_by`/`updated_by` quedan nulos (no hay actor autenticado; igual que el seed). El token se firma con el `id` nuevo, como en el login.
8. No se crea fila en `financial_profile` (ver §8).

## 6. Seguridad (revisión proporcional, no es una auditoría)

Superficie nueva: un endpoint público que escribe en la base y gasta CPU (bcrypt).

| Riesgo | Control propuesto |
|---|---|
| **Enumeración de cuentas** | Mensaje único para correo/identificación repetidos (D-1). El login ya devuelve el mismo 401 para correo inexistente y contraseña errada. **Límite honesto:** sin confirmación de correo no se puede ocultar del todo que un correo existe (quien prueba con una identificación inventada y obtiene `409` deduce que el correo ya está registrado). El mensaje genérico y el límite de intentos reducen el abuso masivo; solo la confirmación de correo (futura) lo cierra. |
| Fuerza bruta / registro masivo / uso de bcrypt como arma de denegación de servicio | Límite de intentos por IP (D-5) con `429` y `Retry-After`. Se cuenta cualquier intento, no solo los fallidos |
| Diferencia de tiempos entre "correo repetido" y "creado" | Se calcula el hash **antes** de consultar duplicados, así ambos caminos cuestan lo mismo |
| Asignación masiva (`role: "Admin"`) | Esquema zod que descarta llaves desconocidas + prueba que lo verifica |
| Contraseñas débiles | Reglas de D-2. bcrypt corta en 72 bytes: se rechaza más largo en vez de truncar en silencio |
| Mayúsculas en el correo (cuentas duplicadas, o usuaria que no puede entrar) | Minúsculas al registrar **y** al iniciar sesión (D-4) |
| Fuga de datos | Respuesta construida sin `passwordHash`; el controlador no devuelve la fila de la base |
| IP falsa detrás de un proxy | `req.ip` solo es fiable si Express sabe cuántos proxies hay (`trust proxy`). Depende de dónde se despliegue; hoy no está definido (D-5) |

Pendiente (no se afirma como hecho): revisión con `application-security-review` tras implementar.

## 7. Migración

**No hace falta ninguna migración** para esta especificación: las columnas, los índices únicos parciales, `chk_users_adult` y la FK de moneda ya existen. Se verificó leyendo `migration.sql`.

Migraciones **opcionales y no recomendadas ahora** (requerirían tu aprobación):
- Índice único sobre `lower(email)`: cerraría la brecha de mayúsculas en la base. Riesgo: si ya hay correos distintos solo por mayúsculas, la migración falla.
- Tabla para el límite de intentos compartido entre instancias. El límite en memoria (D-5) pierde el conteo al reiniciar y no se comparte entre instancias.
- Más adelante, `email_verified_at` para la confirmación de correo.

## 8. Qué pasa con `financial_profile`

- Todas sus columnas de datos son opcionales y `user_id` es único. El registro **no la necesita y no la toca**.
- Decisión propuesta (D-8): **no** crear una fila vacía al registrarse. La fila nace cuando la persona responda la encuesta (parte 4), con un `upsert` por `user_id`. Así "no hay fila" significa "no ha hecho la encuesta" sin inventar un estado.
- Efecto en el front: tras registrarse la persona entra directo al Panel (la encuesta aún no existe). Cuando llegue la parte 4, el flujo será registro → encuesta → Panel, y la encuesta debe poder omitirse (no la exige la base).
- Si más adelante prefieres la fila vacía, se crea en la **misma transacción** que el usuario; hoy `UserRepository.create` es una sola operación y lo permitiría sin cambiar el contrato.

## 9. Diseño (Clean Architecture)

| Capa | Cambio |
|---|---|
| `domain` | `UserRepository.create(data)` devuelve `User`; añade el tipo de entrada. Sin Prisma ni Express |
| `application` | `auth/RegisterUserUseCase`: valida moneda (`CurrencyRepository`), calcula edad, hace hash (`PasswordHasher`), crea, firma token (`TokenService`). Recibe todo por constructor. Lanza `ConflictError` con el mensaje único |
| `infrastructure` | `PrismaUserRepository.create` (traduce `P2002` a `ConflictError`); registro en `container.ts` |
| `presentation` | `registerBodySchema` en `authSchemas.ts`; `AuthController.register`; ruta `POST /register` con el limitador; mapeo de `429` en `errorHandler`; `.toLowerCase()` del correo en el esquema de login (D-4) |

**Hallazgo sobre el login:** no tiene límite de intentos (fuerza bruta contra contraseñas). Se recomienda un cambio aparte que reutilice el mismo limitador, con clave por correo + IP. No se incluye aquí para no ampliar el alcance sin tu decisión.

## 10. Confirmación de correo (pendiente, anotada)

Cuando se haga: columna `email_verified_at`, envío de correo, y el contrato cambia: `POST /register` responde `202` con un texto fijo (igual exista o no el correo) y no devuelve token; el login exige correo verificado. Eso sí cierra la enumeración. El diseño actual no estorba: el caso de uso queda detrás de la ruta y la sesión se devuelve solo en el controlador.

## 11. Criterios de aceptación

| # | Criterio observable |
|---|---|
| AC-1 | Con datos válidos responde `201` con `token` y `user` (`role: "User"`, `preferredCurrencyCode: "COP"`); la respuesta no contiene `passwordHash` |
| AC-2 | El token devuelto autentica en un endpoint protegido y el mismo usuario entra con `POST /login` |
| AC-3 | La contraseña guardada es un hash bcrypt distinto de la contraseña |
| AC-4 | Cada regla de §4 incumplida responde `400` con el mensaje en español y su `path` |
| AC-5 | Menor de 18 (cumple 18 mañana) responde `400`; cumple 18 hoy responde `201`; fecha futura responde `400` |
| AC-6 | Correo repetido, identificación repetida y ambos repetidos responden `409` con **el mismo cuerpo** |
| AC-7 | Correo con otras mayúsculas ("Ana@X.com" y "ana@x.com") cuenta como repetido; y se puede iniciar sesión con cualquiera de las dos escrituras |
| AC-8 | Enviar `role: "Admin"`, `id` o `twoFactorEnabled` no los cambia: el usuario queda `User` |
| AC-9 | Moneda inexistente o inactiva responde `400`; sin moneda se guarda `COP` |
| AC-10 | Dos registros simultáneos con el mismo correo: uno `201` y otro `409`; nunca dos filas |
| AC-11 | Al superar el límite responde `429` con `Retry-After`; el login no se ve afectado |
| AC-12 | Un usuario con borrado lógico no impide registrar de nuevo ese correo |
| AC-13 | No se crea fila en `financial_profile` |

## 12. Plan de pruebas

- **Vitest (sin base de datos):** `RegisterUserUseCase` con repositorios falsos (AC-1, 3, 5, 6, 9, 10 simulando el error de unicidad); `registerBodySchema` (AC-4, 5, 7, 8); limitador; `errorHandler` para `429`; el login con correo en mayúsculas (AC-7).
- **Rutas con la utilería existente** (`tests/helpers/http.ts`): contrato HTTP de `201`, `400`, `409`, `429`.
- **Playwright de API (`tests/api/auth/`):** AC-2, 11, 12 contra el servidor real. **Riesgo:** no hay endpoint para borrar usuarios, así que estas pruebas dejarían usuarios en la base. Propuesta: correrlas **solo contra la base de pruebas** (`.env.test`) y limpiar con un ayudante de prueba que marque `deleted_at` por Prisma. No se ejecutan contra la base real.
- Cada prueba nueva va en la misma rama.

## 13. Tareas (cuando se apruebe)

| # | Tarea | Depende de | Listo cuando |
|---|---|---|---|
| T1 | `UserRepository.create`, tipo de entrada y `PrismaUserRepository.create` con traducción de `P2002` | — | Compila; prueba del traductor |
| T2 | `registerBodySchema` y correo en minúsculas en el login | D-2, D-4, D-6 | Pruebas de esquema en verde |
| T3 | `RegisterUserUseCase` + pruebas | T1 | AC-1, 3, 5, 6, 9, 10 en Vitest |
| T4 | Limitador, `TooManyRequestsError`, mapeo `429` | D-5 | AC-11 |
| T5 | Controlador, ruta y `container.ts` | T2–T4 | Pruebas de rutas en verde |
| T6 | Playwright de API y ayudante de limpieza (base de pruebas) | T5, base de pruebas | AC-2, 11, 12 |
| T7 | Documentación: `README.md` (tabla de endpoints), `GUIA_DEL_CODIGO.md`, colección de Postman | T5 | Revisada |
| T8 | Revisión de seguridad (`application-security-review`) | T5 | Informe enlazado |

Estado de todas: **Pendiente**. Nada verificado todavía.

## 14. Decisiones que necesito de ti

| # | Decisión | Mi recomendación |
|---|---|---|
| **D-1** | Mensaje cuando el correo o la identificación ya existen. A) Mensaje genérico único, igual para ambos, con `409`. B) Decir cuál campo está repetido (mejor experiencia, revela cuentas). C) Esperar la confirmación de correo para cerrar la enumeración. | **A**, con la limitación honesta de §6. C queda como mejora futura |
| **D-2** | Reglas de contraseña (el prototipo no las define). | 8 a 72 caracteres, al menos una letra y un número, y no igual al correo. Sin exigir símbolos ni mayúsculas (la guía actual del NIST prefiere longitud) |
| **D-3** | Respuesta: A) `{ token, user }`, la persona queda con sesión iniciada; B) solo `user` y luego inicia sesión. | **A**: igual que el login y un paso menos en el front |
| **D-4** | Correo en minúsculas al registrar **y** al iniciar sesión. Cambia el contrato del login. Si hay usuarios con mayúsculas en la base, dejarían de entrar. | Sí. El usuario del seed está en minúsculas; confirma que no hay otros con mayúsculas |
| **D-5** | Límite de intentos: A) paquete `express-rate-limit` (pequeño, mantenido, con almacén reemplazable) o B) código propio de unos 40 líneas. Valores: 10 intentos por IP cada 15 minutos. ¿Cuántos proxies hay delante en el despliegue (`trust proxy`)? | **A**, en memoria (se pierde al reiniciar y no se comparte entre instancias; aceptable ahora). Necesito saber el despliegue para `trust proxy`; mientras tanto, no se activa |
| **D-6** | Formato de `documentId` (la base solo exige hasta 20 caracteres). | Letras y números, 1 a 20 (cubre cédula, pasaporte y NIT sin guiones). No inventar más |
| **D-7** | Campos del registro. | Solo los del prototipo: nombre, identificación, nacimiento, correo, teléfono (opcional), contraseña. Dirección y género se editan después en Mi perfil |
| **D-8** | Fila vacía en `financial_profile` al registrar. | **No** (ver §8) |
| **D-9** | Límite de intentos del **login** (hallazgo). | Hacerlo en otra rama, con el mismo limitador |

## 15. Verificación y estado

Solo se revisó el código y las migraciones (inspección). **No se ejecutó nada, no se implementó nada, no se tocó la base.** Estado de la especificación: **propuesta pendiente de aprobación**; implementación bloqueada hasta que respondas D-1 a D-9 (al menos D-1 a D-6).
