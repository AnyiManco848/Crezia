# Catálogo de campos del usuario (fuente única para registro y perfil)

> Estado: **propuesta para aprobación**. Se define una sola vez aquí; la especificación de registro (parte 3) y la de perfil (`perfil-usuario.md`, `PROF-001`) lo **referencian** en lugar de repetirlo.
> Evidencia: `prisma/schema.prisma` (modelo `User`, `FinancialProfile`), `prisma/migrations/20261014000000_init/migration.sql`, `docs/db/crezia_schema_v2.sql`, `prisma/seed.ts`.

## 1. Columnas reales de `users`

Esto es lo que existe hoy en la base. **Ningún campo del perfil está inventado**; si algo no está en esta tabla, no aparece en el diseño.

| Columna | Tipo en BD | Obligatorio en BD | Restricciones en BD |
|---|---|---|---|
| `id` | UUID | Sí | Lo genera la base (`gen_random_uuid()`). Es el `userId` del token |
| `document_id` | VARCHAR(20) | Sí | **Único** entre usuarios no borrados (`uq_users_document_id`) |
| `name` | VARCHAR(150) | Sí | — |
| `address` | VARCHAR(255) | No | — |
| `email` | VARCHAR(255) | Sí | **Único** entre usuarios no borrados (`uq_users_email`) |
| `password_hash` | TEXT | Sí | bcrypt. **Nunca sale de la API** |
| `phone` | VARCHAR(20) | No | — |
| `birth_date` | DATE | Sí | `chk_users_adult`: debe tener 18 años o más |
| `gender` | enum `Female` / `Male` / `Other` | No | — |
| `gender_other` | VARCHAR(100) | No | Sin restricción cruzada con `gender` (ver decisión D-5) |
| `role` | enum `User` / `Admin` | Sí | Por defecto `User` |
| `preferred_currency_code` | CHAR(3) | Sí | Clave foránea a `currency` (hoy COP y USD, del seed) |
| `two_factor_enabled` | BOOLEAN | Sí | Por defecto `false`. **Ningún código lo usa hoy** |
| `created_at`, `updated_at` | TIMESTAMPTZ | Sí | `updated_at` lo mantiene un disparador |
| `created_by`, `updated_by`, `deleted_at`, `deleted_by` | UUID / TIMESTAMPTZ | No | Auditoría y borrado lógico |

**Hallazgo (no bloquea nada):** `docs/db/crezia_schema_v2.sql` dice que `users.id` referencia `auth.users` (Supabase Auth) y no tiene `password_hash`; el `schema.prisma` y la migración real sí tienen `password_hash` y un `id` propio (decisión ya documentada en la cabecera del `schema.prisma`). Para esta especificación manda la migración aplicada.

**Teléfono: sí existe** (`phone`, opcional, 20 caracteres). También existe `address`. No hace falta ninguna migración para el perfil.

## 2. Qué hace cada pantalla con cada campo

| Campo (UI) | Columna | Registro | Perfil: ver | Perfil: editar | Recomendación y motivo |
|---|---|---|---|---|---|
| Nombre completo | `name` | Obligatorio | Sí | **Sí** | Dato personal sin efecto en el acceso |
| Identificación | `document_id` | Obligatorio | Sí | **No** | Es un dato de identidad y tiene índice único; cambiarlo sin verificación abre la puerta a suplantación y a choques con otra cuenta |
| Correo electrónico | `email` | Obligatorio | Sí | **No (por ahora)** | Es el dato de inicio de sesión. Ver §4 |
| Teléfono | `phone` | Opcional | Sí | **Sí** | Opcional, sin efecto en el acceso |
| Dirección | `address` | Opcional (propuesta) | Sí | **Sí** | Opcional |
| Fecha de nacimiento | `birth_date` | Obligatorio (≥ 18) | Sí | **No** | Es el dato que justifica la regla de 18 años; editable permitiría esquivarla. Solo lectura |
| Género | `gender` + `gender_other` | Opcional (propuesta) | Sí | **Sí** | Opcional; "Prefiero no decirlo" = vacío |
| Moneda preferida | `preferred_currency_code` | COP por defecto (aprobado) | Sí | **No (por ahora)** | Hoy nada la consume (el Panel pide COP explícito). Un selector que no cambia nada confunde. Se vuelve editable cuando una pantalla la use |
| Contraseña | `password_hash` | Obligatoria | **Nunca** | **No** en esta pantalla | Ver §5 |
| Rol | `role` | Lo fija el sistema | No se muestra | **Nunca** | Dato interno; no se puede cambiar por la API |
| Doble factor | `two_factor_enabled` | — | No se muestra | **No** | No existe la función; mostrarlo sería inventarla |
| Miembro desde | `created_at` | — | Sí (solo lectura) | No | Dato informativo que ya existe |
| Auditoría (`updated_at`, `*_by`, `deleted_*`) | varios | — | No | No | Internos |

## 3. Reglas de validación por campo

Origen: **BD** = restricción real; **Propuesta** = regla mía que necesita tu aprobación (no está en la base).

| Campo | Regla | Origen | Mensaje (español) |
|---|---|---|---|
| `name` | Obligatorio, se recortan espacios, 1 a 150 caracteres | BD (150, NOT NULL) | "El nombre es obligatorio" / "El nombre no puede superar 150 caracteres" |
| `phone` | Opcional; vacío se guarda como nulo; hasta 20 caracteres; solo dígitos, espacios, `+`, `(`, `)` y `-`, mínimo 7 | BD (20) + **Propuesta** (formato) | "Escribe un teléfono válido: de 7 a 20 caracteres con números, espacios, + , ( ) o guiones" |
| `address` | Opcional; vacío = nulo; hasta 255 | BD | "La dirección no puede superar 255 caracteres" |
| `gender` | Opcional; `Female`, `Male` u `Other`; nulo permitido | BD (enum) | "El género no es válido" |
| `gender_other` | Hasta 100. **Obligatorio si `gender` = `Other`; si `gender` no es `Other`, se guarda nulo** | **Propuesta** (la BD no lo exige) | "Describe tu género cuando eliges Otro" |
| `document_id` (registro) | Obligatorio, 1 a 20 caracteres, único entre no borrados | BD | "La identificación es obligatoria" / mensaje de duplicado (ver nota) |
| `email` (registro) | Obligatorio, formato de correo, hasta 255, único entre no borrados | BD + formato ya usado en login | "El correo no es válido" |
| `birth_date` (registro) | Obligatoria, `AAAA-MM-DD`, 18 años cumplidos | BD (`chk_users_adult`) + decisión aprobada | "Debes tener 18 años o más" |
| `preferred_currency_code` (registro) | Por defecto `COP`; debe existir en `currency` | Decisión aprobada + FK | "La moneda no es válida" |

**Nota sobre duplicados (privacidad):** decir "ese correo ya existe" permite averiguar quién tiene cuenta. La parte 3 debe decidir el mensaje; el perfil no lo necesita porque ni el correo ni la identificación se pueden editar.

## 4. Perfil financiero (`financial_profile`)

Existe una fila por usuario con: `monthly_income`, `fixed_expenses`, `ant_expense_percentage`, `makes_unnecessary_purchases`, `has_debts`, `debt_amount`, `app_usefulness_rating`, `currently_saves`, `proposed_savings_amount`, `has_financial_knowledge`, `can_detect_ant_expenses`, `primary_payment_method` y `additional_answers` (JSON). Es la base de la encuesta (parte 4). **Queda fuera de la pantalla Mi perfil** (ver `especificacion-ui.md`, sección de Mi perfil).

Los datos que hoy tiene el prototipo del registro y la encuesta coinciden con estas columnas; el prototipo pide además "Teléfono celular" en el registro (columna `phone`). El prototipo del registro **no** pide dirección ni género: si los quieres en el registro, se añaden en la parte 3; si no, se editan después desde Mi perfil.
