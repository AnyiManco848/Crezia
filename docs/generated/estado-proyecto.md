# Estado del proyecto Crezia y pendientes para cerrarlo

- **Fecha de la revisión:** 2026-11-22
- **Rama revisada:** `frontend` (commit `7eb375f`)
- **Tipo de trabajo:** solo exploración. No se modificó código, no se tocó Supabase y no se ejecutó ninguna prueba. Solo se leyó código, documentos y Jira, y se usó `git` de lectura.

**Cómo leer este informe:** "Visto en código" significa que lo leí en un archivo. "Ejecutado" significa que alguien lo corrió de verdad. Yo **no ejecuté nada**. Lo que dice "ejecutado" sale de lo que anotan los documentos del repo y **no está verificado por mí**.

---

## 1. Resumen en 5 líneas

1. **Backend casi completo para el alcance de "movimientos":** login, registro, categorías, cuentas, movimientos, resumen y metas existen. Faltan perfil de usuario (`/users/me`) y encuesta financiera.
2. **Front con las 5 pantallas de menú reales** (Panel, Movimientos, Cuentas, Metas y Categorías) y el registro conectado al backend (`POST /api/auth/register`). Mi perfil y la encuesta no existen.
3. **Lo que más bloquea el cierre:** las pruebas de API, la colección de Postman y los E2E están escritos pero **nunca se ejecutaron**, porque falta la base de pruebas (no existe `.env.test`). Hoy no hay evidencia de que backend y front funcionen juntos.
4. **El repo está desordenado:** `develop` está 7 commits detrás de `master`, el trabajo del registro del backend quedó dentro de un commit de la rama `frontend`, y esa rama (4 commits) no está fusionada en `master`.
5. **Seguridad y despliegue sin resolver:** sin límite de intentos en el login, `D-4` a medias, RLS sin revisar, sin cabeceras de seguridad en el servidor, sin CI ni archivos de despliegue. Documentación: faltan casi todas las salidas de las skills restantes.

---

## 2. Tabla por área

| Área | Estado | Evidencia que vi |
|---|---|---|
| **Git** | Parcial | `git branch -a -vv`: `frontend` tiene 4 commits que no están en `origin/master` (`rev-list`: 0 y 4). `develop` va 7 commits detrás de `master`. `master` local está 24 commits detrás de `origin/master`. `git status` limpio al inicio. |
| **Backend** | Parcial (la mayor parte hecha) | `src/presentation/routes/*.ts` (secciones 3 y 4) |
| **Front** | Parcial | `frontend/src/presentation/app/routes.tsx`: `/panel`, `/movimientos`, `/cuentas`, `/metas`, `/categorias` y `/registro` usan sus páginas reales. Faltan Mi perfil y la encuesta, bloqueadas por el backend. |
| **Pruebas** | Parcial: escritas, casi nada ejecutado | Hay archivos de prueba para todo, pero no existe `.env.test` (`ls -a`) y `docs/generated/test-database.md` es solo una guía. |
| **Seguridad** | Parcial | Registro con límite de intentos hecho (`src/presentation/middlewares/rateLimit.ts`). Faltan los pendientes de la sección 6. |
| **Documentación** | Parcial | Existen README, guía, specs, diseño, auditoría y plan. Faltan `main.md`, casos de uso, arquitectura, seguridad, blueprint, backlog y presentación (`git ls-files docs`). |
| **Despliegue** | Pendiente | No hay `.github/`, ni Dockerfile, ni Procfile, ni configuración de hosting en el repo. Solo existe el script `build`/`start` del backend. |
| **Jira** | Pendiente de actualizar | El conector respondió. Las 66 incidencias de SCRUM están en estado **"Idea"**, incluso las que ya están hechas. |

---

## 3. Endpoints del backend

### Existen (visto en `src/presentation/routes/` y `src/app.ts`)

| Grupo | Rutas |
|---|---|
| Salud | `GET /api/health` |
| Auth | `POST /api/auth/login`, `POST /api/auth/register` (con límite de intentos) |
| Categorías | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Cuentas | las mismas 5 rutas en `/api/bank-accounts` |
| Movimientos | las mismas 5 rutas en `/api/movements` y además `GET /api/movements/summary` |
| Metas | las mismas 5 rutas en `/api/goals` |

### Faltan según el diseño y los documentos

| Falta | Origen |
|---|---|
| `GET /api/users/me` (el pedido lo llama "GET /me") y `PATCH /api/users/me` | `specs/perfil/perfil-usuario.md` (`PROF-001`), **sin aprobar ni implementar** |
| Encuesta de perfil financiero (casos de uso y rutas) | No hay especificación en `specs/perfil-financiero/` (la carpeta no existe). Solo existe la tabla `FinancialProfile`. |
| Listar monedas | El front usa una lista fija COP/USD (`plan-skills.md`, sección 7) |
| Cambio de contraseña, recuperar contraseña, confirmación de correo | Decididos como "después" o fuera de alcance en las especificaciones |

### Tablas de Prisma sin rutas (`prisma/schema.prisma`)

`EmailConnection`, `ParsedEmail`, `FinancialProfile`, `ContentCategory`, `EducationalContent`, `UserContentInteraction`, `Notification`. Esto equivale a las épicas de integración bancaria por correo, educación y alertas de Jira. No son necesarias para cerrar el alcance actual, pero hay que decidir si entran o se declaran fuera de alcance.

---

## 4. Pantallas del front

| Pantalla | Estado | Evidencia / nota |
|---|---|---|
| Login | Completa | `features/login/LoginPage.tsx` |
| Registro | Completa | `features/register/RegisterPage.tsx`, conectado a `POST /api/auth/register` |
| Panel | Completa | `features/dashboard/`, conectado al resumen |
| Movimientos | Completa | `features/movements/` (tabla, filtros, crear, editar, borrar) |
| Cuentas | Completa | `features/accounts/` (tarjetas, crear, editar, borrar) |
| Categorías | Completa | `features/categories/` (lista, crear, editar, borrar) |
| Metas | Completa | `features/goals/` (lista con progreso, crear, editar, borrar) |
| Encuesta | Pendiente, **bloqueada por el backend** | No hay rutas de `FinancialProfile` |
| Mi perfil | Pendiente, **bloqueada por el backend** | El menú de usuario solo tiene "Cerrar sesión" (según `plan-skills.md`; no abrí `UserMenu.tsx` línea por línea) |
| Menú de usuario | Parcial | Existe `layout/UserMenu.tsx`, sin "Mi perfil" |
| Tema claro/oscuro | Completa | `theme/ThemeProvider.tsx`, `ThemeToggle.tsx`, `theme-init.js` |

---

## 5. Pruebas

### Conteo aproximado (contado con búsqueda de texto de `it(`/`test(`)

Es una estimación. No cuenta `it.each` ni pruebas generadas en bucle. **No es el número que reportaría Vitest.**

| Grupo | Conteo aproximado | ¿Ejecutado? |
|---|---|---|
| Backend Vitest (`tests/**/*.test.ts`) | ~207 en la búsqueda; el documento dice **276** en la última corrida | Los documentos dicen que sí corrió (276 en verde y `tsc` limpio). **No lo verifiqué.** Existe la carpeta `coverage/`, lo que indica que se corrió cobertura alguna vez. |
| Front Vitest (`frontend/src/**/*.test.*`) | ~175 | No encontré un número de corrida en los documentos. **No verificado.** |
| Backend API Playwright (`tests/api/**`) | ~60 (10 archivos) | **Nunca ejecutadas** según `registro-usuario.md` y `dashboard-summary.md`. |
| Front E2E Playwright (`frontend/e2e/`) | ~18 (4 archivos: auth, dashboard, movements, accounts) | **Nunca ejecutadas** según `plan-skills.md`. |
| Postman | 2 colecciones (`crezia-register`, `crezia-dashboard-summary`) | **Nunca importadas ni ejecutadas.** |

Nota: las pruebas de API de categorías, cuentas, metas y movimientos (anteriores al registro) sí pudieron correrse contra la base real en su momento (`agent-setup-audit.md` menciona corridas de Vitest, pero no confirma las de Playwright). **No verificado.**

### Qué necesita cada una para ejecutarse

| Prueba | Requisitos |
|---|---|
| Vitest (backend y front) | Nada especial: `npm test`. No usa base de datos. |
| API Playwright | Un segundo proyecto de Supabase (base de pruebas), `.env.test` con las 4 variables y `TEST_MODE=true`, `db:test:migrate` y `db:test:seed`, `E2E_TEST_DB_CONFIRMED=true`, y `npm run test:api:test`. La prueba del 429 va aparte con `REGISTER_RATE_LIMIT_MAX=5`. |
| E2E del front | Lo anterior más `npm run dev:test` corriendo, y `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TEST_DB_CONFIRMED` (`test-database.md`, sección 7). |
| Postman (registro) | Backend en `dev:test`; cada ejecución crea usuarios `@e2e.crezia.test`. |
| Postman (resumen) | Un usuario con token; según el README crea datos solo si se usa la base de pruebas. |

**Riesgo importante (visto en `playwright.config.ts`):** sin `TEST_MODE`, `npm run test:api` arranca `npm run dev`, que usa el `.env` **real**. Correrlo "a ciegas" escribe en la base real (con soft delete, pero escribe). No lo ejecutes sin la base de pruebas.

---

## 6. Seguridad

### Visto en el código

| Tema | Estado | Evidencia |
|---|---|---|
| Límite de intentos del **registro** | Hecho (en memoria, por IP) | `rateLimit.ts`, `app.ts` |
| Límite de intentos del **login** (D-9) | **Pendiente** | `authRoutes.ts` línea 9: el login solo lleva `validate`, sin limitador. |
| Correo en minúsculas (D-4) | **A medias** | `RegisterUserUseCase.ts` guarda en minúsculas; `LoginUseCase.ts` + `PrismaUserRepository.findByEmailWithCredentials` buscan el correo **tal cual** (`where: { email }`). Quien se registre con mayúsculas no podrá entrar escribiéndolas igual. El front tampoco normaliza (`grep toLowerCase` en `frontend/src` no encontró nada). |
| Migración de D-4 | **No existe** | `prisma/migrations/` solo tiene `init` e índices de paginación. |
| `trust proxy` | Preparado, apagado | `config/security.ts`: se lee de `TRUST_PROXY`; rechaza `true`. **Falta definir el valor al desplegar.** |
| Cabeceras de seguridad del servidor | **Pendiente** | No hay `helmet` ni cabeceras manuales (`grep helmet` sin resultados). Solo `x-powered-by` desactivado. |
| `Retry-After` y CORS | **Pendiente** | `cors({ exposedHeaders: [...PAGINATION_HEADERS] })`: no expone `Retry-After`. Un front en otro origen no podría leerlo en un 429. |
| CORS abierto | Riesgo | `cors()` sin lista de orígenes: acepta cualquiera. Para producción conviene fijar el origen del front. |
| JWT | Razonable | HS256 fijo, `subject` = usuario, falla si falta `JWT_SECRET` (`JwtTokenService.ts`). |
| Usuario borrado con token válido | Por confirmar | `auth.ts` solo valida el token; no comprueba que el usuario siga existiendo. El especificado en `perfil-usuario.md` es 401, pero no está implementado. **No verificado en los casos de uso de los recursos.** |
| Contraseñas | Razonable | bcrypt; `LoginUseCase` no hace `compare` si no encuentra el usuario, así que el tiempo de respuesta revela si el correo existe. Anotado en `plan-skills.md`, **sin corregir**. |
| Cierre de sesión por inactividad (SCRUM-70) | **Pendiente** | `SessionWatcher.tsx` solo reacciona a 401; no vi temporizador de inactividad. |
| Token en `sessionStorage` | Riesgo aceptado | `plan-skills.md`. Un XSS podría leerlo. Mitigado con CSP. |
| CSP del front | Hecha | Plugin en `frontend/vite.config.ts` la inyecta como `<meta>`. `frame-ancestors` no funciona en `<meta>` y debe ir en el servidor. |
| `.env` | Correcto | `git status --ignored`: `.env`, `.env.perf` ignorados; `.env.test` en `.gitignore`. |
| Revisión formal de seguridad (T8) | **No hecha** | No existe `docs/generated/security/`. |

### Solo se puede confirmar en Supabase (no verificable desde aquí)

- **RLS:** `docs/db/crezia_schema_v2.sql` define políticas, pero Prisma y la migración inicial no las incluyen. Hay que confirmar si las tablas de `public` tienen RLS activo y si la API REST de Supabase con clave anónima está expuesta. Hoy el aislamiento depende solo del filtro por `userId` en el código.
- **Consulta D-4:** si hay correos con mayúsculas o duplicados por mayúsculas (las dos consultas están en `registro-usuario.md`, sección 14b).
- Que no existan usuarios o datos de prueba en la base real.

---

## 7. Documentación

| Documento | Estado | Observación |
|---|---|---|
| `README.md` | Existe, al día en lo visto | Incluye registro, resumen, paginación, front y pruebas. No revisé las 374 líneas completas. |
| `docs/GUIA_DEL_CODIGO.md` | **Desactualizada** | Línea 265 dice "no hay registro de usuarios (`/register`)", y esto **contradice el código**. Línea 61 dice que `.gitignore` ignora `generated/` (ya es `/src/generated/`). Falta el caso de uso de registro. `registro-usuario.md` T7 ya lo anota como pendiente. |
| `docs/generated/plan-skills.md` | Existe, **parcialmente desactualizado** | Dice "la rama activa es `test/api-playwright`" y la parte 7 aún marca varias ramas "pendiente de commit" que ya están en commits. |
| `docs/generated/agent-setup-audit.md` | Existe (2026-11-15) | Hallazgos F-01 resuelto. No revisé si F-02 a F-08 se aplicaron en `CLAUDE.md`. **No verificado.** |
| `docs/generated/specs/dashboard-summary.md` | Existe | Estado de verificación parcial (sección 14). |
| `specs/registro/registro-usuario.md` | Existe | D-4 y D-9 abiertos. T6, T8 y parte de T7 pendientes. |
| `specs/perfil/` | Existe | Sin aprobar y sin implementar. |
| `specs/perfil-financiero/` | **Falta** | La encuesta no tiene especificación. |
| `design/especificacion-ui.md` y prototipo | Existen | |
| `test-database.md` | Existe | Guía, nunca puesta en práctica. |
| Colecciones Postman | 2 de varias posibles | Solo registro y resumen. Faltan login, categorías, cuentas, movimientos y metas (decisión del proyecto, no es obligatorio). |
| `.env.example`, `.env.test.example`, `frontend/.env.example` | Existen | |

### Skills sin usar (confirmado: no hay ninguna salida suya en `docs/`)

| Skill | Salida esperada | Estado |
|---|---|---|
| `backend-documentation` | `docs/generated/main.md` y `use-cases/` | No existe |
| `architecture-documentation` | `docs/generated/architecture/` | No existe |
| `application-security-review` | `docs/generated/security/revision-seguridad.md` | No existe |
| `requirements-engineering` | Backlog | No existe. Nota: no aparece en la lista de skills disponibles en esta sesión. |
| `project-documentation-blueprint` | `blueprint/` | No existe. Tampoco figura en la lista de skills disponibles. |
| `html-presentations` | Presentación | No existe. Tampoco figura en la lista de skills disponibles. |

Las tres últimas "se instalan al llegar" (`plan-skills.md`); **hay que instalarlas** antes de usarlas.

---

## 8. Deuda técnica y decisiones abiertas

| Tema | Fuente |
|---|---|
| Paginación inconsistente: movimientos devuelve `{data,page,limit,total}`; categorías, cuentas y metas devuelven array más cabeceras | `plan-skills.md`; el front lo absorbe con `http/pagination.ts` |
| Logo oscuro provisional, no oficial | `plan-skills.md` |
| Fuentes desde Google Fonts (CDN) | `plan-skills.md`; afecta a la CSP |
| COP sin decimales en pantalla (redondeo visual) | `plan-skills.md` |
| El Panel solo cuenta COP; USD no definido | `plan-skills.md` |
| El progreso de las metas no filtra por moneda | `README.md`, "Limitaciones conocidas" |
| `Overdue` se puede poner a mano; no hay proceso que lo marque | `README.md` |
| Accesibilidad y navegadores sin probar | `especificacion-ui.md`. **No lo confirmé línea por línea.** No hay evidencia de pruebas con lector de pantalla ni de varios navegadores. |
| Consulta `groupBy` del resumen sin ejecutar contra PostgreSQL ni medir rendimiento | `dashboard-summary.md`, secciones 14 y 15 |
| Límite de intentos en memoria: se pierde al reiniciar y no se comparte entre instancias | `rateLimit.ts` |
| Montos en USD con el progreso de metas sin moneda | `README.md` |

---

## 9. Despliegue (qué falta de local a desplegado)

| Elemento | Estado |
|---|---|
| Dónde corre la API de Express | **Desconocido.** Pregunta abierta en `plan-skills.md` ("¿Dónde corre hoy la API?"). Supabase es solo la base. |
| Variables de entorno del backend | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (fuerte, distinto al de desarrollo), `JWT_EXPIRES_IN`, `PORT`, `TRUST_PROXY` (con el número real de proxies). **No** poner `TEST_MODE`, `PERF_MODE` ni subir límites del registro. |
| Variables del front | `VITE_API_URL` (pública; se fija al construir). |
| CORS | Hoy abierto. Hay que limitarlo al dominio del front. |
| Proxy / `trust proxy` | Definir según el hosting. Un valor equivocado hace que todos los clientes compartan un contador. |
| Build del front | `npm run build` existe (`tsc --noEmit && vite build`); `frontend/dist/` está ignorado. Falta decidir dónde se sirve y con qué cabeceras (`frame-ancestors`, HSTS, etc.). |
| Build del backend | `npm run build` y `npm start` existen. No los ejecuté. |
| Migraciones | `prisma migrate deploy` contra la base de producción. No hay procedimiento escrito. |
| HTTPS | Pendiente (SCRUM-69). Depende del hosting. |
| CI | No hay. Opcional para el cierre. |
| Base de datos de producción | Supabase actual. Falta revisar RLS (sección 6) y hacer copia de seguridad antes de migrar. |

---

## 10. Jira SCRUM (solo lectura)

El conector respondió. Estructura: 6 épicas, 18 historias (HU-1 a HU-18) y subtareas. **Las 66 incidencias están en "Idea".** El backlog parece ser el original de otra tecnología (menciona MVC, NLTK, Bootstrap, Hugging Face, "tabla Encuestas", "correo de confirmación"), que no coincide con el stack real.

| Incidencia | Relación con lo hecho | Sugerencia |
|---|---|---|
| SCRUM-12 HU-1 Registro | Backend hecho (registro, unicidad de correo e identificación, contraseña segura, bcrypt). Falta el formulario en el front y el correo de confirmación (decidido: no se hace). | Pasar a "En curso". Actualizar la subtarea SCRUM-35 (confirmación de correo) como "descartada por decisión" o crear historia aparte. |
| SCRUM-13 HU-2 Validación de edad | Backend hecho (`isAdult`). Falta el mensaje en el front. | Igual: en curso; cerrar las subtareas 37 y 38 tras verificar. |
| SCRUM-14 HU-3 Encuesta inicial | Sin hacer; sin especificación. | Mantener; **crear** especificación `perfil-financiero`. |
| SCRUM-15 HU-4 Vincular cuentas | CRUD de cuentas hecho en backend y front. La "simulación de APIs bancarias con JSON/CSV" no existe. | Dividir: cerrar la parte de cuentas, dejar la simulación como pendiente o fuera de alcance. |
| SCRUM-16 HU-5 Visualización de ingresos | Panel y movimientos hechos. | Candidata a cerrar tras ejecutar pruebas. |
| SCRUM-17 HU-6 Gastos categorizados | Movimientos con categoría hechos; la pantalla de Categorías falta. | En curso. |
| SCRUM-18 HU-7 Seguimiento de ahorros | Metas: backend hecho; front pendiente. | En curso. |
| SCRUM-19 HU-8 Reporte financiero | Solo el resumen del Panel; no hay exportación PDF/Excel. | Dejar en curso o fuera de alcance. |
| SCRUM-24 y 25 HU-13 y 14 Metas | Backend hecho; front pendiente. | En curso. |
| SCRUM-28 HU-17 App rápida y fácil | Responsive hecho (diseño); falta medir tiempos de carga (<3 s). | En curso. |
| SCRUM-29 HU-18 Protección de información | bcrypt hecho (SCRUM-68). HTTPS (69) pendiente. Inactividad (70) pendiente. | Cerrar 68; mantener 69 y 70. |
| SCRUM-20 a 23, 26, 27 (chat, alertas, educación) | Sin trabajo. Tablas de educación y notificaciones existen en Prisma. | Decidir: fuera de alcance de esta entrega. |
| Historias a **crear** | Login con límite de intentos (D-9), encuesta de perfil, Mi perfil/`users/me`, pantallas de Categorías y Metas, despliegue, pruebas E2E. | Crear. |

No modifiqué Jira. **Esta tabla es una propuesta mía, no verificada con el equipo**; no leí las descripciones ni los criterios de aceptación de las historias (solo título, tipo, estado y padre).

---

## 11. Pendientes priorizados

Esfuerzo: **P** = pequeño (horas), **M** = mediano (1 a 3 días), **G** = grande (más de 3 días).

### P0: bloquean el uso o el cierre

| # | Pendiente | Esfuerzo | Depende de |
|---|---|---|---|
| P0-1 | Ordenar git: fusionar `frontend` y llevar `develop` a la par de `master`; decidir cómo se separan registro y front (hoy van en el mismo commit) | P | Ninguna (lo haces tú) |
| P0-2 | Crear la base de pruebas (segundo proyecto de Supabase), `.env.test`, migrar y sembrar | P | Ninguna (solo tú) |
| P0-3 | Ejecutar las pruebas de API (60) y los E2E del front (18), y corregir lo que falle | M | P0-2 |
| P0-4 | Pantalla de registro en el front (hoy dice "no disponible") | M | D-4 (ver P0-5) |
| P0-5 | Cerrar D-4: confirmar la consulta en Supabase, poner correo en minúsculas en login y migración de datos juntos | P a M | Consulta en Supabase (solo tú) |
| P0-6 | Pantallas de Categorías y Metas (el menú muestra 2 de 5 secciones sin funcionar) | M | Ninguna (backend listo) |
| P0-7 | Definir dónde se despliega y preparar variables, CORS y `trust proxy` | M | Decisión tuya sobre el hosting |

### P1: importantes

| # | Pendiente | Esfuerzo | Depende de |
|---|---|---|---|
| P1-1 | Límite de intentos del login (D-9) en `feature/auth-login-rate-limit` | P | Ninguna |
| P1-2 | Revisión de RLS en Supabase | P | Solo tú |
| P1-3 | Revisión de seguridad del código con `application-security-review` | M | P1-1 |
| P1-4 | Cabeceras de seguridad del servidor (p. ej. `helmet`), CORS con lista de orígenes y exponer `Retry-After` | P | P0-7 |
| P1-5 | Aprobar y construir `users/me` y Mi perfil (back y front) | M a G | Tus decisiones D-1 a D-8 del perfil |
| P1-6 | Especificar y construir la encuesta financiera (back y front) | G | Decisión: ¿obligatoria u opcional? |
| P1-7 | Actualizar `GUIA_DEL_CODIGO.md` (registro, `.gitignore`) y `plan-skills.md` | P | Ninguna |
| P1-8 | Ejecutar las colecciones de Postman y confirmar el resumen contra PostgreSQL real | P | P0-2 |
| P1-9 | Actualizar Jira (tabla de la sección 10) | P | Ninguna |
| P1-10 | Documentación del backend (`backend-documentation`) y arquitectura | M | P1-5 y P1-6 si se quiere documentar ya implementados |

### P2: mejoras

| # | Pendiente | Esfuerzo |
|---|---|---|
| P2-1 | Unificar el formato de paginación del backend | M |
| P2-2 | Cierre de sesión por inactividad (SCRUM-70) | P |
| P2-3 | Igualar el tiempo de respuesta del login para correo inexistente | P |
| P2-4 | Prueba de accesibilidad y de navegadores | M |
| P2-5 | Logo oscuro oficial y fuentes alojadas en el proyecto | P |
| P2-6 | Filtrar progreso de metas por moneda; proceso para `Overdue` | M |
| P2-7 | Mostrar USD en el Panel | M |
| P2-8 | CI en GitHub Actions | M |
| P2-9 | Blueprint, backlog y presentación (instalar las 3 skills) | M |
| P2-10 | Almacén compartido para el límite de intentos si hay más de una instancia | P |

---

## 12. Lo que solo tú puedes hacer o verificar

1. Crear el proyecto de Supabase de pruebas y el `.env.test` (con credenciales).
2. Ejecutar en el SQL Editor la consulta de D-4 (correos con mayúsculas y duplicados).
3. Revisar RLS y la API REST de Supabase en el panel.
4. Correr `npm test` (backend y front), `npm run test:api:test`, `npm run e2e` y las colecciones de Postman.
5. Decidir dónde se despliega la API y cuántos proxies hay delante.
6. Aprobar las especificaciones del perfil y decidir si la encuesta es obligatoria.
7. Aprobar el logo oscuro y cualquier decisión visual.
8. Todos los comandos de git (`CLAUDE.md`); yo propongo los comandos, tú los ejecutas.
9. Confirmar en Jira qué historias se cierran, se descartan o se crean.
10. Decidir qué épicas (chat, alertas, educación) quedan fuera de esta entrega.

---

## 13. Orden recomendado de trabajo

Cada paso va en su propia rama desde `develop`, con sus pruebas en la misma rama (`CLAUDE.md`).

1. **Higiene de git** (tú): fusionar `frontend` en `develop` y `develop` en `master`, o al revés, según tu flujo, y actualizar `master` local. Revisa que el backend del registro y su front no queden mezclados sin remedio.
2. **Base de pruebas** (tú): P0-2, luego `docs/generated/test-database.md` paso a paso.
3. **Verificar lo escrito**: ejecutar API, E2E y Postman (P0-3 y P1-8). Corregir en `fix/...` lo que falle.
4. **`feature/auth-login-rate-limit` + `feature/auth-login-lowercase-email`** (con la migración de D-4, tras la consulta en Supabase).
5. **`feature/front-register`** (usa el backend ya existente).
6. **`feature/front-categories` y `feature/front-goals`** (backend ya existe).
7. **`feature/user-profile`** (back, tras aprobar la especificación) y **`feature/front-profile`**.
8. **`feature/financial-profile`** (especificación, back) y **`feature/front-financial-profile`**.
9. **`feature/security-review`** con `application-security-review` y RLS.
10. **`feature/deploy-prep`**: variables, CORS, `helmet`, `trust proxy`, build; luego desplegar.
11. **`feature/docs-backend` y `feature/docs-architecture`**, ya con todo implementado; actualizar `GUIA_DEL_CODIGO.md`.
12. **Cierre**: actualizar Jira y, si se desea, blueprint y presentación (instalar las skills primero).

Si el tiempo apremia, el **mínimo para "usable y defendible"** es: pasos 1 a 6, 9 (al menos RLS y login) y 10. Perfil y encuesta pueden declararse como trabajo futuro, pero el backlog de Jira debe reflejarlo.

---

## 14. Lo que digo que está hecho sin haberlo comprobado

Para ser fiel a la evidencia:

| Afirmación | Lo que vi | Lo que **no** vi |
|---|---|---|
| "276 pruebas de Vitest en verde" | Esa cifra aparece en `registro-usuario.md` y `plan-skills.md` | No corrí Vitest. Mi conteo aproximado dio ~207 por búsqueda de texto, que subestima. |
| "El registro del backend funciona" | Casos de uso, esquemas, ruta, limitador y pruebas unitarias en el código | Nunca se ejecutó contra una base real ni vía Playwright o Postman. |
| "El resumen del Panel funciona" | Código y pruebas con repositorios falsos | La consulta `groupBy` real contra PostgreSQL no se ejecutó (`dashboard-summary.md`, sección 14). |
| "Movimientos y Cuentas del front funcionan" | Componentes, hooks, servicios y pruebas unitarias | Los E2E nunca se ejecutaron; no sé si funcionan en un navegador real contra la API. |
| "Panel con tema claro/oscuro, diseño responsive" | Código y CSS | No abrí la app en un navegador ni probé tamaños. |
| "CSP aplicada" | El plugin de Vite que la genera en `vite.config.ts` | No construí el front ni vi el HTML final. |
| "Tests de seguridad de `testDbGuard`" | Existen en `tests/config/` | No se corrieron. |
| "`.gitignore` y `docs/generated/` versionados" | `git ls-files docs` los lista; `git status` limpio | Sin problemas observados. |
| "Aislamiento de datos por usuario" | Reglas en `CLAUDE.md`, nombres como `bankAccountAccess.ts`, `categoryAccess.ts` | No leí cada repositorio Prisma línea por línea para confirmar que todos filtran por `userId` y `deletedAt`. |
| Contenido de `UserMenu.tsx`, `LoginPage.tsx` y los demás componentes del front | Solo vi la lista de archivos y las rutas | No los abrí; mis afirmaciones sobre ellos salen de `plan-skills.md` y de las rutas. |
| Estado de Jira | Título, tipo, estado y padre de las 66 incidencias | No leí descripciones, criterios ni comentarios. |
| Qué cubren F-02 a F-08 de la auditoría | Solo leí las 60 primeras líneas | No sé cuáles se aplicaron a `CLAUDE.md`. |

---

## 15. Nota sobre el conector de Atlassian

La conexión usa un endpoint V1 obsoleto que se retirará el 2027-03-01. Si usas el conector oficial, quítalo y vuelve a añadirlo desde el directorio de conectores de Claude. Si es personalizado, recréalo con `https://mcp.atlassian.com/v2/mcp`. Si lo gestiona tu organización, pide el cambio a tu administrador.
