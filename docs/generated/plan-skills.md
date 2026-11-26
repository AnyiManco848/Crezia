# Plan de trabajo con las skills de agentic-skills

Estado: **propuesta, pendiente de aprobación**. Nada de lo que describe este plan se ha ejecutado todavía, salvo la instalación de las 5 skills y la actualización de la documentación de paginación (ver sección 1).

## 1. Punto de partida

**Ya hecho en esta fase**

- Instaladas de forma global (`~\.claude\skills\`, copia) las 5 skills de prioridad alta: `agentic-project-setup`, `backend-documentation`, `architecture-documentation`, `application-security-review` y `ui-ux-design-system`. No se tocó el repo `agentic-skills`.
- Documentada la paginación de categorías, cuentas y metas (`X-Total-Count`, `X-Page`, `X-Limit`) en `README.md` y en `docs/GUIA_DEL_CODIGO.md` (sección 5.1 nueva y filas actualizadas).

**Decisiones tomadas**

| Tema | Decisión |
|---|---|
| Carpeta de salida | Todo lo generado va en `docs/generated/`. No se sobrescribe nada existente. |
| Front | React + Vite + TypeScript, web responsive pensada primero para escritorio, adaptada a tablet y celular. |
| Mockups actuales | Solo referencia de identidad, contenido y flujo; no son el formato final. |
| Identidad visual | Turquesa, blanco, logo "C" con flecha y lema "Finanzas y Ahorro". Sin identidad JAC. |
| Despliegue actual | Supabase. No se propone AWS. |
| Instrucciones para IA | `CLAUDE.md` es el punto de entrada. No se crea `AGENTS.md` ni `.agents/`. |
| Registro y encuesta | Se implementan con `spec-driven-development`, una rama por funcionalidad, empezando por registro. |
| Jira | Proyecto SCRUM, lectura solo con el conector de Atlassian. |
| Seguridad | No se toca Supabase. La revisión de RLS queda anotada como pendiente para la usuaria. |
| Git | Lo ejecuta la usuaria. Al terminar cada parte se entrega la lista de archivos y los comandos de PowerShell. |

**Lo que existe hoy (evidencia)**

- Backend: `POST /api/auth/login` y CRUD de categorías, cuentas bancarias, movimientos y metas. No hay registro ni perfil financiero (`docs/GUIA_DEL_CODIGO.md`, sección 5).
- La tabla `financial_profile` y los campos de `users` ya existen en `prisma/schema.prisma`, por lo que registro y encuesta no necesitan migración para guardar sus datos. Lo que sí la necesitaría es la confirmación de correo con token (no hay columnas para eso).
- Mockups: solo registro, inicio de sesión, error de validación y encuesta de perfil financiero (3 vistas), en `Crezia Docs\Mockup CREZIA.docx`. No hay mockups de categorías, cuentas, movimientos ni metas.
- Front: no existe.

## 2. Orden recomendado

El orden propuesto difiere un poco del ejemplo del pedido original por dos motivos: (1) registro y encuesta añaden casos de uso, y conviene documentarlos una sola vez, ya implementados; (2) el diseño de pantallas necesita tu aprobación, así que conviene arrancarlo temprano para no quedar esperando.

| # | Parte | Skill | Rama sugerida (sale de `develop`) | Depende de |
|---|---|---|---|---|
| 0 | Paginación documentada y este plan | — | `feature/docs-pagination-plan` | Nada (ya hecho, falta commit) |
| 1 | Auditoría de preparación para IA | `agentic-project-setup` | `feature/agent-setup` | 0 |
| 2 | Diseño de pantallas (propuesta, solo diseño) | `ui-ux-design-system` | `feature/front-design` | 0. Puede ir en paralelo con 3 y 4 |
| 2b | Panel (dashboard) inicial: diseño ya incluido en la parte 2 y **endpoint de resumen** (especificación) | `ui-ux-design-system`, `spec-driven-development` | `feature/dashboard-summary` | 2. La implementación espera tu aprobación de la especificación |
| 2c | Mi perfil: diseño (menú de usuario, alternador de tema reubicado, pantalla Mi perfil) y **endpoint de perfil** (especificación) | `ui-ux-design-system`, `spec-driven-development` | `feature/user-profile` | 2. La implementación espera tu aprobación de la especificación |
| 3 | Registro de usuario | `spec-driven-development` | `feature/auth-register` | Lectura de Jira (SCRUM) y el catálogo de campos de la parte 2c |
| 4 | Encuesta de perfil financiero | `spec-driven-development` | `feature/financial-profile` | 3 |
| 5 | Documentación del backend | `backend-documentation` | `feature/docs-backend` | 3 y 4, para documentarlos ya implementados |
| 6 | Revisión de seguridad del código | `application-security-review` | `feature/security-review` | 3 y 4 |
| 7 | Arquitectura | `architecture-documentation` | `feature/docs-architecture` | 5 |
| 8 | Front: estructura, conexión y pantallas | (implementación, guiada por el diseño aprobado) | `feature/front-setup`, luego una rama por pantalla | 2 aprobado |
| 9 | Blueprint, backlog, presentación | `project-documentation-blueprint`, `requirements-engineering`, `html-presentations` | `feature/docs-blueprint` y siguientes | 5, 7 y 8; se instalan al llegar |

Si prefieres el orden original (setup → backend-documentation → architecture → seguridad → ui-ux → blueprint), se puede; el costo es volver a actualizar la documentación del backend y la arquitectura cuando se agreguen registro y encuesta.

Regla de ramas (`CLAUDE.md`): `feature/<nombre>` desde `develop`, commits en inglés con Conventional Commits, y las pruebas de cada funcionalidad en su misma rama. Hoy la rama activa es `test/api-playwright`.

## 3. Detalle por parte

### 0. `feature/docs-pagination-plan`

- Cambia: `README.md`, `docs/GUIA_DEL_CODIGO.md`. Nuevo: `docs/generated/plan-skills.md`.
- Verificación pendiente: ninguna del código; solo revisión de texto.

### 1. `feature/agent-setup` — agentic-project-setup

- Modo: **Audit**. No se crea `AGENTS.md` ni `.agents/`; se pide a la skill que trate `CLAUDE.md` como punto de entrada.
- Salida: `docs/generated/agent-setup-audit.md` con hallazgos priorizados (P0 a P3) y acciones propuestas.
- Cambios a `CLAUDE.md`: solo propuestos en el informe; se aplican si los apruebas.
- Pendiente de esta parte: el `CLAUDE.md` actual no menciona el front, la carpeta `docs/generated/` ni las reglas de la paginación; son candidatos a hallazgo.

### 2. `feature/front-design` — ui-ux-design-system (solo diseño)

- Identidad: la de Crezia (turquesa, blanco, logo "C", lema). Sin valores de JAC.
- **Cambio aprobado:** se añade un **Panel** como pantalla inicial (primero en el menú lateral, antes de Movimientos). Sustituye la decisión anterior de abrir Movimientos tras iniciar sesión. Ver parte 2b.
- Pantallas con evidencia de endpoint: **Inicio de sesión**, **Categorías**, **Cuentas**, **Movimientos** y **Metas** (listar, crear, editar y borrar, con paginación y los filtros de movimientos que existen). Las pantallas de **Registro** y **Encuesta** se diseñan desde los mockups, pero se construyen cuando existan sus endpoints (partes 3 y 4).
- Formato: **escritorio primero**, con su adaptación a tablet y celular, en un único prototipo HTML navegable (datos y acciones simulados, marcados como tales). Los mockups verticales se usan solo como referencia de contenido y flujo.
- Salida: `docs/generated/design/prototipo-crezia.html` y `docs/generated/design/especificacion-ui.md` (tokens, componentes, estados y decisiones).
- **Modo oscuro (solo diseño, parte del front):** el prototipo y la especificación incluyen tema claro, oscuro y "sistema" con alternador, tokens semánticos y tabla de contrastes. La elección se guarda en `localStorage` del navegador: **no hay cambios de backend, endpoints ni migraciones**. Al construir el front, el script anti-parpadeo va en `index.html` y los componentes usan solo tokens. La variante oscura del logo es una derivación propuesta, pendiente de tu aprobación.
- **No se construye nada del front hasta que apruebes el diseño.** Si falta algo (por ejemplo gráficos), no se inventa: se te pregunta.

### 2b. `feature/dashboard-summary` — Panel y endpoint de resumen

- **Diseño (parte 2):** Panel con selector de periodo (mes actual por defecto), tarjetas de ingresos, egresos y balance en COP, barra comparativa, mensaje motivacional diario y estados con datos, vacío, cargando y error. Ya está en el prototipo y en `especificacion-ui.md`.
- **Mensaje motivacional:** solo en el front, lista de 30 frases en español dentro del código; se elige con `día del año % número de frases`. Sin base de datos ni endpoint. Las frases se aprueban antes de entrar al código.
- **Backend:** hoy ningún endpoint entrega totales (la lista de movimientos está paginada y sumar en el cliente solo cubriría una página). Se propone `GET /api/movements/summary?from=&to=&currencyCode=` con Clean Architecture, `auth` y `validate`, pruebas Vitest, pruebas Playwright de API y petición de Postman.
- **Especificación:** `docs/generated/specs/dashboard-summary.md` (criterios de aceptación, diseño, plan de pruebas, tareas, KPIs calculables y no calculables, preguntas abiertas). **No se implementa hasta que la apruebes.**
- **Sin migración:** no cambia el esquema; se aprovecha el índice existente `idx_movements_user_date_active`.
- **Hallazgo:** no hay colecciones de Postman en el repo, solo instrucciones en el README; la especificación propone cómo resolverlo (decisión tuya).
- **Front del Panel:** rama aparte, `feature/front-dashboard`, después de aprobar el diseño y cuando el endpoint exista.
- **Decisiones aprobadas:** ruta `GET /api/movements/summary`; una sola moneda con `currencyCode` (COP por defecto); periodo máximo de 366 días; `movementCount` en la respuesta; Postman opción A; frases aprobadas; diseño del Panel y sus 4 periodos aprobados; token `#087F8A` aprobado.
- **Estado:** DASH-001 implementado en `feature/dashboard-summary`, con verificación parcial (Vitest y `tsc` en verde; Playwright, consulta real y Postman sin ejecutar). Detalle en la sección 14 de la especificación.
- **KPIs del Panel:** ingresos, egresos, balance y **tasa de ahorro** (calculada en el front: balance / ingresos; sin ingresos no se muestra).

**Sugerencias futuras de KPIs (no aprobadas, calculables con los datos actuales):**

| KPI | Qué haría falta |
|---|---|
| Gasto promedio diario | Solo front |
| Comparación con el periodo anterior | Solo front, con dos llamadas al resumen |
| Gasto por categoría (top) | Ampliar el endpoint o crear otro (`groupBy categoryId`) |
| Saldo total de cuentas | Endpoint nuevo (hoy el saldo sale por cuenta y paginado) |
| Metas activas y su progreso medio | Hoy el listado de metas está paginado |

No calculables hoy: presupuesto frente a lo real (no hay presupuestos), gastos hormiga (no hay marca en los movimientos), patrimonio neto y deudas (no hay activos ni pasivos), y totales que mezclen COP y USD (no hay tasas de cambio).

### 2c. `feature/user-profile` — Mi perfil y endpoint de perfil

- **Diseño (parte 2, ya en el prototipo y en `especificacion-ui.md`, sección 4.8):**
  - El alternador de tema (solo iconos, sin la palabra "Tema") pasó a la parte superior derecha, junto al selector de periodo (o al botón principal en las demás pantallas); en celular va dentro de la barra superior; en login, registro y encuesta, en la esquina superior derecha.
  - El bloque de usuario del menú lateral es un botón que abre un menú con **Mi perfil** y **Cerrar sesión** (teclado completo, ambos temas); muestra el nombre real, el correo y las iniciales.
  - Pantalla **Mi perfil** con modo ver y modo editar, validaciones por campo, estados cargando, guardando, éxito y error.
- **Campos reales** (revisados en `prisma/schema.prisma` y la migración): `users` tiene nombre, identificación, correo, teléfono, dirección, fecha de nacimiento, género (+ "otro"), moneda preferida, rol, doble factor y auditoría. **El teléfono sí existe**; no hace falta migración. El detalle, qué se muestra y qué se edita está en `docs/generated/specs/perfil/campos-usuario.md`.
- **Especificación:** `docs/generated/specs/perfil/perfil-usuario.md` (`PROF-001`): `GET` y `PATCH /api/users/me`, `userId` solo del token, lista blanca de campos (`name`, `phone`, `address`, `gender`, `genderOther`), sin tocar rol, id, correo ni otros campos sensibles, errores que no revelan otras cuentas y pruebas previstas. **No se implementa hasta que la apruebes.**
- **Decisiones que necesito de ti** (recomendación entre paréntesis; motivos en la especificación): correo (solo lectura por ahora), cambio de contraseña (después, tarjeta propia con su endpoint), perfil financiero (fuera de esta pantalla), usuario borrado con token válido (401), formato del teléfono y `genderOther` obligatorio con "Otro", moneda preferida (solo lectura), claves no permitidas (descartarlas), Postman (opción A).
- **Relación con el registro (parte 3):** comparten campos, así que se definen **una sola vez** en el catálogo `campos-usuario.md`; la especificación del registro lo referencia. Por eso la parte 3 se retoma cuando apruebes ese catálogo.
- **Front de Mi perfil:** rama aparte, `feature/front-profile`, después de aprobar el diseño y cuando exista el endpoint.
- **Estado:** diseño verificado en el prototipo (ver `especificacion-ui.md`, sección 6); backend sin implementar.

### 3. `feature/auth-register` — spec-driven-development

- Antes de especificar: leer en Jira SCRUM (solo lectura) las historias de registro, y contrastarlas con el mockup y con el esquema.
- **Campos compartidos con el perfil:** nombre, identificación, correo, teléfono, fecha de nacimiento y moneda se toman de `docs/generated/specs/perfil/campos-usuario.md` (reglas, límites y mensajes) en lugar de redefinirlos.
- Salida de la especificación en `docs/generated/specs/registro/`: propuesta, especificación, tareas y verificación.
- Preguntas que la especificación debe cerrar contigo (no se asumen):
  - Campos obligatorios y reglas de contraseña.
  - Validación de edad (el documento viejo del mockup habla de ≥ 18 años).
  - Unicidad de correo y cédula (existe en la base: `uq_users_email` y `uq_users_document_id`).
  - Si el registro inicia sesión de inmediato o exige confirmar el correo. La confirmación con token necesita migración y envío de correo, y requiere tu aprobación explícita.
  - Moneda preferida por defecto.
- Implementación sigue `CLAUDE.md`: Clean Architecture, errores en español, pruebas en Vitest y Playwright en la misma rama.

### 4. `feature/financial-profile` — spec-driven-development

- Usa la tabla existente `financial_profile` (una fila por usuario). Las preguntas de las vistas 1 y 3 del mockup hay que leerlas con detalle y confirmarlas contigo antes de fijar los campos.
- Salida: especificación en `docs/generated/specs/perfil-financiero/` y el código con sus pruebas.
- Decisión abierta: si la encuesta es obligatoria tras el registro o se puede omitir, y si se puede editar después.

### 5. `feature/docs-backend` — backend-documentation

- La skill escribe por convención en `docs/main.md`. Para respetar tu instrucción, saldrá en `docs/generated/main.md`; tú decides después si lo mueves a `docs/main.md`.
- Casos de uso en `docs/generated/use-cases/<modulo>/` (autenticación, categorías, cuentas, movimientos, metas, y registro y perfil cuando existan). Hoy son 21 implementados: login más 5 por cada uno de los 4 recursos. La skill pide un documento por caso de uso y se hará por lotes por módulo.
- Plantilla: no hay una local; se usará la plantilla opcional de la skill, que es una de las cosas a confirmar contigo antes de empezar.
- Cada documento cita archivos como evidencia y lleva un diagrama Mermaid del flujo real.
- Resumen de cambios al final: creados, actualizados, conservados y sin resolver.

**Cómo conviven `GUIA_DEL_CODIGO.md` y `main.md`** (recomendación)

| | `GUIA_DEL_CODIGO.md` | `generated/main.md` |
|---|---|---|
| Para qué sirve | Guía didáctica para entender el código y aprender a leerlo | Referencia técnica: visión general e índice de casos de uso |
| Quién la mantiene | Tú, a mano | La skill, a partir del código |
| Qué no duplica | El detalle de cada caso de uso | Mapa de carpetas, glosario ni recorrido paso a paso |

- Enlazarse mutuamente: `main.md` apunta a la guía para los recorridos y el glosario; la guía apuntaría a `main.md` y a los casos de uso, si lo apruebas (hoy no se modifica).
- Si algo se contradice, manda el código; se corrige la guía a mano o se pide a la skill que reporte el conflicto.
- La guía tiene muchos números de línea que se desfasan con cada cambio. Conviene dejar los números de línea solo en la guía y usar solo nombres de archivo y función en lo generado.

### 6. `feature/security-review` — application-security-review

- Alcance: **solo el código** del repo (JWT, middlewares, validación, contraseñas y bcrypt, CORS, manejo de errores, dependencias y manejo de `.env`). Sin pruebas activas y sin tocar Supabase.
- Salida: `docs/generated/security/revision-seguridad.md` con hallazgos, evidencia y propuesta; los arreglos se hacen solo si los apruebas y quedan fuera de esta rama.
- **Pendiente para ti (RLS en Supabase):** `docs/db/crezia_schema_v2.sql` define políticas RLS, pero el esquema de Prisma y la migración inicial dicen que no las incluyen. Hay que confirmar en Supabase si las tablas del esquema `public` tienen RLS activado y si la API REST de Supabase está expuesta con la clave anónima. Queda como lista de verificación en el informe, sin ejecutar nada.
- Observaciones ya conocidas que entrarán al informe: el login responde distinto en tiempo para correo inexistente y contraseña errónea (no hace `compare` cuando no encuentra el usuario) y no hay límite de intentos de login.

### 7. `feature/docs-architecture` — architecture-documentation

- Salida en `docs/generated/architecture/`: `architecture.md`, `component-diagram.mmd` y `component-diagram.drawio`.
- Despliegue: la skill propone un diagrama de AWS por defecto; se cambia a una vista del **despliegue actual en Supabase** (`current-deployment.drawio`), marcada como reportada. No se genera un diagrama de nube objetivo.
- Pregunta abierta: dónde corre hoy la API de Express (Supabase solo es la base de datos). Si no lo sabemos, queda como desconocido.
- Archify no está instalado, así que no se generan sus archivos.
- Validaciones: `check_drawio.py` de la skill. La vista previa renderizada requiere Draw.io Desktop y no se intentará salvo que lo pidas.

### 8. Front (React + Vite + TypeScript)

Se empieza solo con el diseño aprobado (parte 2).

- **Ubicación del proyecto:** carpeta `frontend/` dentro de este repo (decidido).
- **Estructura propuesta:** `src/api/` (cliente HTTP con el token y lectura de `X-Total-Count`, `X-Page` y `X-Limit`), `src/features/<recurso>/`, `src/components/`, `src/routes/`, `src/styles/` (tokens de la identidad Crezia), `tests/`. URL de la API por variable `VITE_API_URL`; la API ya acepta CORS.
- **Conexión (solo endpoints que existen):** `POST /api/auth/login`; `/api/categories`, `/api/bank-accounts`, `/api/movements` y `/api/goals` con listar, ver, crear, editar (PATCH) y borrar. Registro, perfil financiero y el resumen del Panel (`GET /api/movements/summary`) cuando existan en el backend.
- **Ramas:** `feature/front-setup` (estructura, cliente de API, login y rutas protegidas), luego una por recurso: `feature/front-categories`, `feature/front-bank-accounts`, `feature/front-movements`, `feature/front-goals`, `feature/front-dashboard` (Panel), y después `feature/front-register` y `feature/front-financial-profile`.
- **Pruebas:** Vitest con Testing Library para componentes y para el cliente de API; prueba de extremo a extremo con Playwright más adelante.
- **Almacenamiento del token:** el JWT dura 1 día. Dónde guardarlo (memoria, `sessionStorage` o `localStorage`) es una decisión de seguridad; se propondrá con sus riesgos antes de implementar.
- Qué se versiona: código, `package-lock.json` y `.env.example`. No se versiona `.env`, `node_modules`, `dist`, ni informes de prueba.

## 4. Documentos que se generarán

Todo dentro de `docs/generated/`. Los 2 archivos existentes de `docs/` y los 38 que ya tienes (no están en este repo) no se tocan. Antes de crear cualquier archivo se comprueba que no exista.

| Ruta | Parte | Skill |
|---|---|---|
| `docs/generated/plan-skills.md` | 0 | — |
| `docs/generated/agent-setup-audit.md` | 1 | agentic-project-setup |
| `docs/generated/design/prototipo-crezia.html`, `especificacion-ui.md` | 2 | ui-ux-design-system |
| `docs/generated/specs/dashboard-summary.md` | 2b | spec-driven-development |
| `docs/generated/specs/perfil/campos-usuario.md`, `perfil-usuario.md` | 2c | spec-driven-development |
| `docs/generated/specs/registro/`, `specs/perfil-financiero/` | 3 y 4 | spec-driven-development |
| `docs/generated/main.md`, `docs/generated/use-cases/<modulo>/*.md` | 5 | backend-documentation |
| `docs/generated/security/revision-seguridad.md` | 6 | application-security-review |
| `docs/generated/architecture/*` | 7 | architecture-documentation |
| `docs/generated/blueprint/project-blueprint.html`, backlog y presentación | 9 | blueprint, requirements, presentations |

Los documentos van en español, salvo el código y los identificadores. Las skills están en inglés, pero eso no cambia el idioma de lo que generan.

## 5. Riesgos, conflictos y preguntas

**Riesgos y conflictos**

1. **Rutas por defecto de las skills contra tu estructura.** `backend-documentation` usa `docs/main.md`, `architecture-documentation` usa `docs/architecture/`. Se redirigen a `docs/generated/`; se indica en cada informe.
2. **Solapamiento de documentos.** Se resuelve con la tabla de convivencia de la parte 5.
3. **Documentación que se desactualiza.** Registro y encuesta cambian el backend. Por eso van antes de la documentación.
4. **Identidad visual.** Si `ui-ux-design-system` no recibe la identidad de Crezia, aplica la de JAC. Se le dará siempre explícita.
5. **Los mockups vienen de un documento antiguo** (SQL Server, Flask/Django, correo de confirmación con token a 24 h). Sirven para flujo y contenido, no para tecnología ni para reglas de negocio sin confirmar.
6. **Paginación por defecto de 50.** El front debe leer `X-Total-Count`; si no, mostrará solo los primeros 50 elementos sin avisar.
7. **Confirmación de correo.** Necesitaría migración y envío de correo; no entra sin tu aprobación (regla de migraciones y de no inventar funcionalidad).
8. **Reglas de `CLAUDE.md`.** Respuestas y documentos en español, código en inglés, sin git por mi parte, nada de `.env` en commits, y la BD solo con migraciones.
9. **Versionado de las skills.** Están instaladas de forma global; tus compañeras no las tendrán a menos que las instalen también.

**Preguntas abiertas**

1. Ubicación del front: ¿carpeta `frontend/` dentro de este repo, o repo aparte?
2. ¿Dónde corre hoy la API de Express (para el diagrama de despliegue)?
3. ¿Alguna pantalla más, aparte de las listadas? Por ejemplo un panel de inicio. No existe en mockups ni en endpoints, así que no se incluye salvo que lo pidas.
4. Plantilla de casos de uso: ¿usamos la plantilla opcional de `backend-documentation` o prefieres definir una propia?
5. Registro: confirmación de correo, validación de edad y moneda por defecto (ver parte 3).
6. Orden: ¿el propuesto o el original?

## 6. Qué no se podrá verificar

- Estado de RLS y de la API REST en Supabase (queda para ti).
- Vista previa renderizada de los diagramas de Draw.io (requiere Draw.io Desktop).
- Archify (no instalado).
- Pruebas de Playwright contra la base real (necesitan servidor y BD; no las ejecutaré sin tu aviso).
- Mockups en su formato original: se leyeron las imágenes del `.docx`; las vistas de la encuesta 1 y 3 se revisarán con detalle al especificar.

## 7. Avance del front (React + Vite + TypeScript)

Última actualización: 2026-11-22.

### Estado por parte

| Rama | Estado | Contenido |
|---|---|---|
| `feature/front-setup` | **Hecha, pendiente de commit** | Proyecto Vite + TS, tokens claro/oscuro aprobados, alternador de tema, cliente HTTP único, adaptador de paginación, sesión en `sessionStorage`, rutas protegidas, layout (menú lateral, barra superior, barra inferior, menú de usuario) y login. En esa etapa las 5 secciones del menú eran marcadores de posición; hoy todas tienen su pantalla real. |
| `feature/front-dashboard` | **Hecha, pendiente de commit** | Panel conectado a `GET /api/movements/summary` (periodo, ingresos, egresos, balance en COP, tasa de ahorro solo en el front y oculta sin ingresos, barra de ingresos frente a egresos, mensaje del día con las 30 frases aprobadas) con los estados con datos, vacío, cargando y error. El botón "Nuevo movimiento" del estado vacío lleva a `/movimientos` (por ahora pendiente). |
| `feature/front-movements` | **Hecha, pendiente de commit** | Tabla paginada con el total del cuerpo `{data,page,limit,total}` (10/20/50/100 por página), filtros (tipo, categoría, cuenta, desde, hasta; el rango invertido no se envía), crear, editar y eliminar en diálogo, con los estados con datos, vacío (primer uso y sin resultados), cargando y error. Categorías y cuentas salen de `GET /api/categories` y `GET /api/bank-accounts` (todas las páginas). Los E2E están escritos y **no se han ejecutado**. |
| `feature/front-accounts` | **Hecha, pendiente de commit** | Cuentas como tarjetas (banco, alias, tipo, saldo con signo en texto, moneda) con paginación por cabeceras `X-Total-Count`/`X-Page`/`X-Limit` (10/20/50/100), crear, editar y eliminar en diálogo, y los estados con datos, vacío, cargando y error. En la edición la moneda solo se envía si cambió; un 409 (cuenta con movimientos) se muestra en el campo Moneda. Los E2E están escritos y **no se han ejecutado**. |
| `feature/front-goals` | **Hecha, pendiente de commit y de tu revisión visual** | Metas con progreso calculado por el backend (barra accesible, estados cumplida y superada), CRUD en diálogo, paginación por cabeceras. Defecto conocido: ver `DEF-001` más abajo. E2E escrito, **no ejecutado**. |
| `feature/front-register` | **Hecha, pendiente de commit y de tu revisión visual** | `/registro` conectada a `POST /api/auth/register`: validación con zod copiada del backend, requisitos de contraseña visibles, mostrar/ocultar, 409 genérico, 429 con cuenta regresiva si se puede leer `Retry-After`, 400 por campo, redirección al Panel con sesión. E2E escrito, **no ejecutado**. |
| `fix/cors-retry-after` | **Hecha, pendiente de commit** | Backend: `Retry-After` en `exposedHeaders` de CORS (`src/app.ts`) con su prueba (`tests/presentation/corsHeaders.test.ts`). Sin este cambio desplegado, el navegador no puede leer los segundos y el registro muestra el mensaje genérico del 429. |
| `feature/front-categories` | **Hecha, pendiente de commit y de tu revisión visual** | Tabla y CRUD de categorías con paginación por cabeceras y los estados con datos, vacío, cargando y error. E2E escrito, **no ejecutado**. |

### Pantallas sin endpoint (no conectadas)

| Pantalla | Estado | Qué falta en el backend |
|---|---|---|
| Registro | **Conectado en el front** (`feature/front-register`). | `POST /api/auth/register`. **Es lo más urgente**: sin él solo entran usuarios sembrados. Especificación escrita, **pendiente de tu aprobación**: [`specs/registro/registro-usuario.md`](specs/registro/registro-usuario.md) (`AUTH-REG-001`, rama `feature/auth-register`). No necesita migración; no toca `financial_profile`; tiene 9 decisiones abiertas (D-1 a D-9). |
| Encuesta de perfil financiero | **Pendiente, no construida.** | La tabla `FinancialProfile` existe en Prisma, pero no hay casos de uso ni rutas. |
| Mi perfil | **Pendiente, no construida.** El menú de usuario solo tiene "Cerrar sesión". | `GET /api/users/me` y `PATCH /api/users/me`. Hoy el nombre, el correo y las iniciales salen del `user` guardado con el login. |

### Deuda técnica y decisiones abiertas

- **Formato de paginación inconsistente en el backend:** `GET /api/movements` devuelve `{ data, page, limit, total }` en el cuerpo; categorías, cuentas y metas devuelven un arreglo más las cabeceras `X-Total-Count`, `X-Page` y `X-Limit`. No se cambió el backend: el front lo absorbe con un adaptador (`frontend/src/infrastructure/http/pagination.ts`). Unificar queda como deuda. La documentación de paginación de movimientos en `README.md` y `docs/GUIA_DEL_CODIGO.md` se revisó y es correcta (describe el formato de cuerpo y `limit` por defecto 20); no hizo falta corregirla.
- **Monedas:** no hay endpoint para listarlas. El front usará una lista fija con las sembradas en `prisma/seed.ts`: **COP y USD**.
- **Token JWT:** `sessionStorage` (decidido). Riesgo aceptado: un XSS puede leerlo. Se mitiga con la CSP, sin `dangerouslySetInnerHTML` (regla de ESLint) y cierre de sesión ante 401. La opción más segura (cookie httpOnly) exige cambios en el backend y queda para más adelante.
- **Logo oscuro:** variante **provisional, no oficial**, derivada del original (`design/assets/logo-crezia-oscuro.png`). Pendiente de revisión gráfica.
- **Fuentes:** vienen de Google Fonts (como el prototipo). Si se quiere evitar el CDN, hay que alojarlas en el proyecto.
- **Cabeceras de seguridad en el despliegue:** la CSP del front va en `<meta>`; `frame-ancestors` y el resto de cabeceras deben configurarse en el servidor donde se despliegue.
- **E2E del front:** escritos en `frontend/e2e/`, **no ejecutados**: esperan la base de pruebas (segundo proyecto de Supabase). Comandos en `README.md`, sección "Pruebas E2E del front".
- **`docs/generated/` ya es versionable:** F-01 aplicado (2026-11-18): la regla `generated/` del `.gitignore` raíz pasó a `/src/generated/`. Verificado con `git status` (`docs/generated/` aparece sin seguimiento) y `git check-ignore` (`src/generated/` sigue ignorada, `.env.test` también). Falta tu commit del `.gitignore` y de `docs/generated/`.
- **Login sin límite de intentos:** hallazgo de la especificación de registro (D-9); se propone otra rama con el mismo limitador.
- **Registro (`feature/auth-register`):** especificación aprobada; backend implementado y probado con Vitest (276 pruebas). Pendientes: ejecutar las pruebas de API y la colección de Postman contra la base de pruebas ([`test-database.md`](test-database.md)); la parte del login de D-4 (correo en minúsculas) hasta que se confirme que no hay correos con mayúsculas en Supabase; revisión de seguridad (T8); `GUIA_DEL_CODIGO.md`. Mientras D-4 siga pendiente, quien se registre con mayúsculas en el correo no podrá iniciar sesión escribiéndolas igual.
- **D-9, límite de intentos del login:** pendiente, en otra rama (`feature/auth-login-rate-limit`), reutilizando el limitador del registro.
- **Montos en COP sin decimales:** el diseño aprobado muestra COP sin decimales, así que un movimiento de 45.000,50 se ve como "$ 45.001" (se redondea solo al mostrar; el dato guardado es exacto). Si se quiere ver los centavos, hay que cambiarlo en el diseño.
- **El Panel solo cuenta COP:** los movimientos en USD no entran en el resumen (limitación de la API: una moneda por respuesta, sin tasas de cambio). El Panel lo avisa con una nota. Mostrar USD no está definido.

### Fuera de alcance de esta entrega (trabajo futuro)

- **Mi perfil** (`GET/PATCH /api/users/me`, pantalla y entrada en el menú de usuario): no se construye ahora.
- **Encuesta de perfil financiero** (3 pasos, tabla `FinancialProfile`): no se construye ahora; hace falta backend.

### Defecto conocido DEF-001 (listo para cuando exista la documentación de defectos)

- **Título:** el progreso de una meta suma gastos sin filtrar por moneda.
- **Dónde:** backend, cálculo de progreso de metas (`GET /api/goals`).
- **Qué pasa:** suma los movimientos Expense del usuario en la categoría y el rango de la meta sin distinguir COP de USD; un gasto en USD cuenta como si fuera COP.
- **Efecto en el front:** las tarjetas muestran ese progreso tal cual. No se corrige en el front.
- **Estado:** abierto, sin decisión. Mover a `docs/generated/defectos/` cuando se cree.
- **Registro (parte 3), nota de la regla del nombre:** la especificación dice 1 a 150 caracteres y el código del backend 2 a 120; el front sigue el código.
