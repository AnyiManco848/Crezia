# Especificación: endpoint de resumen de movimientos (Panel)

| Campo | Valor |
|---|---|
| Identificador | `DASH-001` |
| Rama propuesta | `feature/dashboard-summary` (sale de `develop`) |
| Estado | **Aprobada e implementada en `feature/dashboard-summary`; verificación parcial** (ver §14). Pendiente de tu commit y de correr Playwright con el backend levantado. |
| Origen | Decisión de la usuaria: el Panel es la pantalla inicial y muestra el balance entre ingresos y egresos. No existe historia de usuario ni ticket Jira asociado (no se inventa identificador). |
| Skill | spec-driven-development (modos Analyze, Specify, Design, Plan; sin Implement) |
| Sistema de especificaciones | No hay `specs/` ni OpenSpec en el repo. Se usa este único documento, sin crear estructura nueva. |

## 1. Problema y objetivo

El front necesita, para un periodo, el total de ingresos, el total de egresos y su diferencia. Hoy solo existe `GET /api/movements`, que está paginado: sumar en el cliente solo daría el total de **una página** (20 por defecto). El resumen debe calcularse en el servidor sobre **todos** los movimientos del periodo.

Regla del proyecto que se respeta: los saldos y totales **se calculan en código, nunca se guardan**.

## 2. Alcance

**Incluye:** un endpoint de solo lectura que devuelve ingresos, egresos, balance y número de movimientos de un periodo, para el usuario autenticado, en una moneda.

**No incluye** (quedan como sugerencias, ver §10): gasto por categoría, comparación con el periodo anterior, saldo total de cuentas, progreso de metas, conversión entre monedas.

## 3. Evidencia del código revisado

| Hallazgo | Dónde |
|---|---|
| `amount` es `NUMERIC(14,2)`, siempre `> 0`; `type` es `Income` o `Expense` | `prisma/schema.prisma` (modelo `Movement`) |
| Cada movimiento tiene su `currencyCode`; no hay tasas de cambio | `prisma/schema.prisma`, `crezia_schema_v2.sql` |
| El dinero se maneja en centavos enteros | `src/application/money.ts` (`toCents`, `fromCents`) |
| Ya existe una suma agrupada por tipo (`groupBy` con `_sum`) | `PrismaBankAccountRepository.sumMovementsByAccount` |
| Balance = ingresos − egresos, ignorando borrados | `src/application/bankAccounts/balance.ts` |
| Rutas bajo `auth(tokens)`; query validada con zod y `validate({ query })` | `src/presentation/routes/movementRoutes.ts`, `middlewares/validate.ts` |
| `userId` sale siempre de `req.user!.id` (el token), nunca del cliente | `MovementController` |
| Hay un índice parcial adecuado: `(user_id, date DESC, created_at DESC, id DESC) WHERE deleted_at IS NULL` | `idx_movements_user_date_active` |

## 4. Contrato

### `GET /api/movements/summary`

Requiere `Authorization: Bearer <token>`.

**Query**

| Parámetro | Obligatorio | Regla |
|---|---|---|
| `from` | Sí | Fecha `AAAA-MM-DD`, inclusiva |
| `to` | Sí | Fecha `AAAA-MM-DD`, inclusiva; `from` ≤ `to`; el periodo no puede superar 366 días (ambos extremos cuentan) |
| `currencyCode` | No | 3 letras (se pasa a mayúsculas); por defecto `COP` |

`from` y `to` son obligatorios para no depender de la zona horaria del servidor: el front decide qué es "este mes" y manda las fechas.

**Respuesta 200**

```json
{
  "from": "2026-11-01",
  "to": "2026-11-30",
  "currencyCode": "COP",
  "totalIncome": "7000000.00",
  "totalExpense": "916224.00",
  "balance": "6083776.00",
  "movementCount": 15
}
```

- Importes como cadena decimal con dos decimales (igual que el resto de la API).
- `balance` = `totalIncome` − `totalExpense`; puede ser negativo (`"-120000.00"`).
- Sin movimientos: `"0.00"`, `"0.00"`, `"0.00"` y `movementCount: 0` (200, no 404). El front usa `movementCount` para mostrar el estado vacío.

**Errores** (formato existente `{ error: { code, message } }`)

| Código | Caso | Mensaje (español) |
|---|---|---|
| 400 `VALIDATION_ERROR` | Falta `from` o `to`, fecha inválida | "La fecha debe tener el formato AAAA-MM-DD" |
| 400 `VALIDATION_ERROR` | `from` > `to` | "La fecha \"from\" no puede ser posterior a \"to\"" |
| 400 `VALIDATION_ERROR` | Periodo de más de 366 días | "El periodo no puede superar los 366 días" |
| 400 `VALIDATION_ERROR` | `currencyCode` inválido | "La moneda debe ser un código de 3 letras (por ejemplo COP)" |
| 401 | Sin token o token inválido | Mensajes actuales del middleware `auth` |

Los textos de 400 reutilizan los de `movementSchemas.ts`.

## 5. Reglas de negocio

1. **Solo del usuario autenticado.** El filtro `userId` lo pone el caso de uso con el id del token. Un `userId` en la query se ignora (zod descarta claves desconocidas). No hay ningún parámetro que permita ver otro usuario.
2. **Se ignoran los movimientos borrados** (`deleted_at IS NULL`). Igual que `listByUser`, no se excluyen los movimientos de una cuenta borrada (comportamiento ya existente).
3. **Una sola moneda por respuesta.** Sumar COP con USD sin tasa de cambio daría un número sin sentido, así que solo se suman movimientos de `currencyCode`. Los de otras monedas no entran en los totales ni en `movementCount`.
4. **El periodo se filtra por `date`** (fecha del movimiento), no por `created_at`.
5. **No usa paginación**: es un agregado sobre todo el periodo. Debe dar el mismo resultado sin importar `limit` ni `page` de las listas.
6. **Periodo máximo de 366 días** (decisión aprobada); se comprueba en el esquema y se repite en el caso de uso.
7. **Aritmética en centavos enteros** (`toCents`/`fromCents`), nunca con `number` decimal.

## 6. Diseño (Clean Architecture)

```
presentation  movementRoutes ──► MovementController.summary
                 auth + validate({ query: movementSummaryQuerySchema })
application   GetMovementSummaryUseCase  (recibe MovementRepository por constructor)
domain        MovementRepository.sumByTypeInPeriod(userId, { from, to, currencyCode })
infrastructure PrismaMovementRepository.sumByTypeInPeriod
```

- **domain:** se añade a `MovementRepository` el método `sumByTypeInPeriod(userId, filter): Promise<MovementTypeTotal[]>`, con `MovementTypeTotal = { type, amount: string, count: number }`. Sin importar Prisma ni Express.
- **application:** `GetMovementSummaryUseCase.execute(query, userId)` aplica el valor por defecto de moneda, suma en centavos y arma la respuesta. Se exporta desde `application/movements/index.ts` y se registra en `container.ts`.
- **infrastructure:** `movement.groupBy({ by: ['type'], where: { userId, deletedAt: null, currencyCode, date: { gte, lte } }, _sum: { amount: true }, _count: { _all: true } })`: una sola consulta que devuelve a lo sumo 2 filas. Usa el índice existente `idx_movements_user_date_active`.
- **presentation:** `movementSummaryQuerySchema` (zod), método `summary` en el controlador y la ruta.
- **Orden de rutas (importante):** la ruta debe declararse **antes** de `GET /:id`; si no, Express interpretaría `summary` como un id y respondería 400 por UUID inválido.
- **Sin migración:** el esquema no cambia y el índice existente sirve. No se toca la BD.

## 7. Criterios de aceptación

| Id | Criterio (observable) |
|---|---|
| AC-1 | Con movimientos de ingreso y gasto en COP dentro del periodo, la respuesta trae `totalIncome`, `totalExpense`, `balance = ingresos − egresos` y `movementCount` correctos. |
| AC-2 | Con más movimientos que el `limit` de la lista (por ejemplo 25 con `limit` 20), los totales cubren todos, no solo una página. |
| AC-3 | Un movimiento con `date` igual a `from` o a `to` entra en el cálculo (límites inclusivos); uno fuera del rango no. |
| AC-4 | Los movimientos borrados (soft delete) no suman. |
| AC-5 | Los movimientos de otro usuario no suman, aunque estén en el mismo periodo y moneda; pasar `userId` en la query no cambia el resultado. |
| AC-6 | Los movimientos en una moneda distinta a `currencyCode` no suman; `currencyCode` por defecto es `COP`. |
| AC-7 | Sin movimientos en el periodo → 200 con ceros y `movementCount: 0`. |
| AC-8 | Si los egresos superan a los ingresos, `balance` es negativo con formato `"-120000.00"`. |
| AC-9 | Sin `from` o `to`, fecha mal formada, `from > to`, periodo de más de 366 días o `currencyCode` inválido → 400 `VALIDATION_ERROR` con mensaje en español. |
| AC-10 | Sin token o con token inválido → 401. |
| AC-11 | `GET /api/movements/summary` no responde 400 por "id inválido" (la ruta está antes de `/:id`). |
| AC-12 | Los importes no tienen errores de coma flotante (por ejemplo 0,10 + 0,20 = 0,30). |
| AC-13 | `GET /api/movements`, cuentas, metas y categorías (paginación, cabeceras) no cambian. |

## 8. Plan de pruebas

**Vitest (unitarias, sin BD)** — repositorio en memoria, como `tests/helpers/InMemory*`:
- `tests/application/movements/GetMovementSummaryUseCase.test.ts`: AC-1, 3, 4, 5, 6, 7, 8, 12 (incluye "otro usuario" y "borrados" con el repositorio en memoria filtrando como el real).
- `tests/presentation/schemas/movementSummaryQuerySchema.test.ts`: AC-9 (falta de fechas, formato, `from > to`, moneda, ignora `userId`).
- Test de cableado de ruta si el repo ya tiene un patrón equivalente (si no, se cubre con Playwright).

**Playwright API (usa la BD real del `.env` con el usuario del seed; hoy esos tests ya existen para los demás módulos)** — `tests/api/movements/movements-summary.spec.ts` con función `getMovementSummary` en `services/movements.service.ts`: AC-1 (crea movimientos con prefijo `PW`, consulta y los borra), AC-2, AC-7, AC-9, AC-10, AC-11.

**Postman:** ver §9.

**Comandos de verificación:** `npx tsc --noEmit`, `npx vitest run`, y Playwright con el backend levantado. No se declararán pasadas hasta ejecutarlas.

## 9. Colección de Postman — hallazgo

En el repo **no hay ninguna colección de Postman**; solo la sección "Probar en Postman" del README (environment con `baseUrl` y `token`, script de login). No hay "los demás" que copiar. Opciones:

- **A (recomendada):** añadir la petición de resumen a esa sección del README (URL, query, ejemplo y script de prueba `pm.test`) y entregar un archivo `docs/postman/crezia-dashboard-summary.postman_collection.json` solo con esta petición y sus pruebas (login + resumen).
- **B:** solo README, sin archivo.
- **C:** colección completa de toda la API (queda fuera de esta rama).

Decisión pendiente tuya.

## 10. Seguridad (revisión proporcional, no es una auditoría)

| Control | Cómo se cumple |
|---|---|
| Autenticación | Ruta bajo `auth(tokens)` |
| Autorización / aislamiento | `userId` solo del token; consulta siempre filtrada por `userId` (AC-5) |
| Validación de entrada | zod en query; fechas y moneda con formato estricto |
| Datos sensibles | Solo agregados; sin descripciones ni ids de movimientos |
| Carga | Una consulta agrupada con índice; periodo acotado a 366 días |
| Errores | Formato y mensajes existentes; sin detalles internos |

La revisión formal sigue a cargo de `application-security-review` (parte 6). El RLS en Supabase sigue pendiente de tu revisión (la API se conecta con su propia credencial de BD; el aislamiento de esta ruta depende del filtro `userId` en el código).

## 11. KPIs: qué se puede calcular con los datos existentes

Revisado contra `movements`, `bank_accounts` y `goals`.

**Entran en el Panel (los pediste):** total de ingresos, total de egresos, balance (diferencia) del periodo, todos en COP.

**Ya calculables, sin implementar — sugerencia para que decidas:**

| KPI | Cómo se calcula | Qué haría falta |
|---|---|---|
| Tasa de ahorro del periodo | (ingresos − egresos) / ingresos | Solo front, con los mismos totales (si ingresos = 0, no se muestra) |
| Gasto promedio diario | egresos / días del periodo | Solo front |
| Número de movimientos | `movementCount` | Ya viene en la respuesta propuesta |
| Comparación con el periodo anterior | Dos llamadas al resumen | Solo front |
| Gasto por categoría (top) | `groupBy categoryId` de los gastos del periodo | Ampliar el endpoint o crear otro |
| Saldo total de cuentas | Suma de los saldos de `bank_accounts` (por moneda) | Endpoint nuevo; hoy el saldo solo sale por cuenta y paginado |
| Metas activas y su progreso medio | `goals` + progreso ya calculado | El listado de metas ya lo da, pero paginado |

**No se pueden calcular hoy (no hay datos):**

| KPI | Por qué |
|---|---|
| Presupuesto vs real | No existe tabla de presupuestos |
| Gastos hormiga | No hay marca en movimientos; el % de la encuesta es autodeclarado y la encuesta aún no se guarda |
| Patrimonio neto, deudas, intereses | No hay activos ni pasivos, solo cuentas |
| Totales mezclando COP y USD | No hay tasas de cambio |

## 12. Tareas (para cuando se apruebe)

| # | Tarea | Depende de | Hecho cuando |
|---|---|---|---|
| T1 | Tipo y método en `MovementRepository` + repo en memoria de pruebas | — | Compila |
| T2 | `GetMovementSummaryUseCase` + pruebas Vitest (AC-1,3–8,12) | T1 | Vitest en verde |
| T3 | `PrismaMovementRepository.sumByTypeInPeriod` | T1 | `tsc` en verde |
| T4 | Schema zod + pruebas (AC-9) | — | Vitest en verde |
| T5 | Controlador, ruta antes de `/:id`, `container.ts` | T2–T4 | Responde en local |
| T6 | Playwright API (AC-1,2,7,9,10,11) | T5 | Playwright en verde |
| T7 | Postman + README + `docs/GUIA_DEL_CODIGO.md` | T5 | Según decisión §9 |
| T8 | Verificación final: `tsc`, `vitest run`, Playwright, revisión de AC | T1–T7 | Evidencia por AC |

## 13. Decisiones (resueltas)

| # | Decisión |
|---|---|
| 1 | Ruta `GET /api/movements/summary`, declarada antes de `/:id`. |
| 2 | Una sola moneda por respuesta con `currencyCode`; `COP` por defecto. |
| 3 | Rango máximo del periodo: **366 días**; si se excede, 400 `VALIDATION_ERROR` ("El periodo no puede superar los 366 días"). Se cuentan ambos extremos: del 1 de enero al 31 de diciembre de un año bisiesto son 366 días. |
| 4 | `movementCount` se queda en la respuesta. |
| 5 | Postman, opción A: sección del README y colección solo del resumen (`docs/postman/crezia-dashboard-summary.postman_collection.json`). |
| 6 | KPI extra: solo la **tasa de ahorro**, calculada en el front (balance / ingresos; sin ingresos no se muestra). Los demás KPIs del §11 quedan como sugerencia futura (ver `plan-skills.md`). |

## 14. Verificación y estado de las tareas

| Tarea | Estado | Evidencia |
|---|---|---|
| T1 Tipo y método en `MovementRepository`, repo en memoria | Verified | `npx tsc --noEmit` sin errores |
| T2 `GetMovementSummaryUseCase` + pruebas | Verified | `npx vitest run`: 22 archivos, 231 pruebas pasan (36 nuevas) |
| T3 `PrismaMovementRepository.sumByTypeInPeriod` | Completed, **no ejecutado contra BD** | Compila; la consulta no se corrió (ver abajo) |
| T4 Schema zod + pruebas | Verified | Vitest |
| T5 Controlador, ruta antes de `/:id`, `container.ts` | Verified a nivel de router | `tests/presentation/routes/movementRoutes.test.ts` (router real sobre servidor HTTP local, casos de uso falsos) |
| T6 Playwright API | Completed, **no ejecutado** | 13 pruebas compilan y se listan (`npx playwright test --list`); no se corrieron porque usan la base real |
| T7 Postman, README, guía | Completed | JSON válido y los 10 scripts con sintaxis correcta; **no se importó ni se ejecutó en Postman** |
| T8 Verificación final | Partial | Ver "No verificado" |

Criterios de aceptación: AC-1, 3 a 10, 12 y 13 cubiertos por Vitest (AC-13 porque no se tocaron las rutas ni los repositorios de lista; la suite anterior sigue pasando). AC-2 se prueba en Vitest con 25 movimientos y en Playwright con 21 (este último sin ejecutar). AC-11 se prueba en Vitest (ruta) y Playwright (sin ejecutar).

**No verificado:** la consulta `groupBy` real contra PostgreSQL (ni su uso del índice), las 13 pruebas de Playwright, la colección en Postman y la revisión formal de seguridad. Para correrlas: levantar el backend con `npm run dev` y luego `npx playwright test tests/api/movements/movements-summary.spec.ts`. Esa prueba usa la BD real del `.env` (crea movimientos de 2001 con el prefijo `PW` y los borra con soft delete); no reinicia ni borra la base.

## 15. Notas

- No se ha medido el rendimiento de la consulta (se espera bueno por el índice existente, sin evidencia).
- Sin rango máximo el endpoint podía escanear años de movimientos; con el límite de 366 días queda acotado.
