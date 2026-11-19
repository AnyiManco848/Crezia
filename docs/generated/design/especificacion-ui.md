# Especificación de UI — Crezia (escritorio primero)

> Estado: **propuesta para aprobación**. No se ha construido el front.
> Prototipo navegable: [`prototipo-crezia.html`](./prototipo-crezia.html) (abrir con doble clic; datos simulados, sin conexión a la API).

## 1. Alcance y fuentes

| Incluye | No incluye |
|---|---|
| Login, registro, encuesta de perfil financiero (3 vistas) | Cambio de correo y cambio de contraseña (ver 4.8 y `PROF-001`, D-1 y D-2) |
| **Panel** (pantalla inicial): balance de ingresos y egresos, mensaje del día | "Olvidé mi contraseña" (no hay endpoint) |
| Movimientos, cuentas, metas, categorías (listar, crear, editar, borrar) | Confirmación de correo (backlog: requiere migración y envío de correo) |
| Layout con menú lateral: Panel y las 4 secciones; **menú de usuario** y pantalla **Mi perfil** (ver y editar datos personales) | KPIs que no se pueden calcular con los datos actuales (ver la especificación `DASH-001`) |
| | Edición del perfil financiero (encuesta) dentro de Mi perfil (ver 4.8) |

Fuentes: mockups verticales (solo identidad, contenido y flujo de login, registro y encuesta), mensajes y reglas de los casos de uso del backend, README. Las pantallas de los 4 CRUD **no tienen mockup**: son diseño nuevo.

Decisiones ya aprobadas: React + Vite + TypeScript en `frontend/`; web responsive; edad ≥ 18; moneda por defecto COP; el registro y la encuesta aún no tienen endpoint (partes 3 y 4).

## 2. Identidad

- Turquesa de marca `#00C9D1`, blanco, logo "C" con flecha (tomado del mockup), lema "Finanzas y Ahorro". No se usa JAC.
- Tipografía: Montserrat (UI) y Dancing Script solo para el lema.
- **Contraste:** blanco sobre `#00C9D1` = 2,04:1 (no cumple AA). Por eso:
  - Botones, enlaces y navegación activa usan `--primary #087F8A` (4,76:1 con blanco, derivado, documentado como tal).
  - Sobre el turquesa de marca (panel lateral de acceso) el texto es oscuro `#0B2B30`.

### Tokens semánticos (tema claro y oscuro)

Los componentes solo usan estos nombres; el valor cambia según el tema. Los valores salen del propio prototipo (bloque `:root` y `:root[data-theme="dark"]`).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#F4FBFC` | `#071A1D` | Fondo de la página |
| `--surface` | `#FFFFFF` | `#0E2A2F` | Tarjetas, tablas, diálogos, formularios |
| `--surface-2` | `#E6F9FA` | `#153A40` | Encabezado de tabla, hover, zonas suaves |
| `--text` | `#0B2B30` | `#E8F6F7` | Texto |
| `--text-2` | `#4A5F63` | `#A9C4C7` | Texto secundario, pistas, iconos |
| `--border` | `#CFE3E5` | `#24474D` | Separadores decorativos |
| `--border-strong` | `#5B8A90` | `#6A9CA2` | Borde de campos y controles (≥ 3:1) |
| `--primary` / `--primary-hover` | `#087F8A` / `#076F79` | `#2CD3DB` / `#5EE3E9` | Botones, opción elegida, ítem activo |
| `--on-primary` | `#FFFFFF` | `#031F23` | Texto sobre `--primary` (en oscuro es texto oscuro) |
| `--link` | `#06707A` | `#5EE3E9` | Enlaces, marca, botón secundario |
| `--accent` / `--on-accent` | `#00C9D1` / `#0B2B30` | `#0D4D55` / `#E8F6F7` | Panel de marca de acceso, mensaje del día |
| `--success` / `--success-bg` | `#17622F` / `#E5F4EA` | `#6EDC93` / `#12331F` | Ingresos, éxito |
| `--error` / `--error-bg` | `#B3261E` / `#FDECEA` | `#FF9B92` / `#3D1714` | Egresos, errores |
| `--warning` / `--warning-bg` | `#8A5300` / `#FFF4DC` | `#F6BD5A` / `#3A2A08` | Avisos |
| `--info` / `--info-bg` | `#055A63` / `#E6F9FA` | `#7FE6EB` / `#12424A` | Información, porcentajes, avatar |
| `--danger-solid` (+ `-hover`, `--on-danger`) | `#B3261E` / `#8F1D17` / `#FFFFFF` | `#FF8A80` / `#FFB0A9` / `#2B0B09` | Botón de eliminar |
| `--focus` / `--focus-halo` | `#0B2B30` / `#FFFFFF` | `#7FE6EB` / `#071A1D` | Anillo de foco de 3 px más halo |
| `--disabled-bg` / `-text` / `-border` | `#EEF3F4` / `#566A6D` / `#B9CCCF` | `#12292D` / `#8CA9AD` / `#2C4C52` | Campos y botones deshabilitados |
| `--track`, `--row-hover`, `--neutral-bg` | `#D3E8EB`, `#F1FAFB`, `#EEF3F4` | `#24474D`, `#123137`, `#1B3A40` | Pista de barras, fila bajo el puntero, chip neutro |
| `--overlay`, `--shadow` | tinte oscuro 50 % | negro 65 % | Fondo de diálogos, sombras |

Radios: 12 px (controles) y 20 px (paneles). Los tokens `--brand`, `--ink`, `--line`, `--ok`, `--warn` y `--danger` de la versión anterior se renombraron a estos; el prototipo ya no usa colores fijos en los componentes.

**Identidad en oscuro.** Se mantiene el turquesa, el blanco, el logo "C" con flecha y el lema. El turquesa pleno `#00C9D1` queda como fondo de marca en claro; en oscuro los botones y enlaces usan un turquesa más claro (`#2CD3DB`, `#5EE3E9`) para que destaquen sobre el fondo oscuro, y el panel de marca pasa a un verde azulado profundo (`#0D4D55`). No se usa JAC.

**Logo para fondo oscuro (propuesta mía, derivada, no aprobada).** El logo original (turquesa con "C" blanca) pierde contraste sobre fondos oscuros. Se generó una variante con mosaico verde azulado oscuro y la "C" con flecha en turquesa claro `#7FE6EB`: `assets/logo-crezia-oscuro.png`. Es una derivación del logo del mockup, no un archivo oficial de marca; si tienes el maestro vectorial del logo, conviene rehacerla desde ahí. El prototipo muestra una u otra según el tema (tokens `--show-light-logo` y `--show-dark-logo`).

## 3. Layout por tamaño

| Ancho | Navegación | Contenido |
|---|---|---|
| ≥ 1100 px (escritorio) | Menú lateral de 248 px: logo, 5 enlaces (**Panel**, Movimientos, Cuentas, Metas, Categorías) con icono y texto, bloque de usuario clicable abajo (nombre real, correo e iniciales) que abre el menú **Mi perfil / Cerrar sesión** | Tablas completas, tarjetas en rejilla, filtros en una fila; Panel con 3 tarjetas en una fila |
| 720–1099 px (tablet) | Menú lateral compacto de 92 px (icono sobre texto corto) | Filtros en 3 columnas; Panel con Ingresos y Egresos en dos columnas y Balance a todo el ancho |
| < 720 px (celular) | Barra superior con logo, alternador de tema y avatar con iniciales (abre el mismo menú de usuario); **barra inferior** con las 5 secciones | Las tablas pasan a filas tipo tarjeta; formularios a 1 columna; botones de 44 px; Panel en una columna |

**Alternador de tema** (claro / oscuro / sistema): tres iconos pequeños (sol, luna, monitor), **sin la palabra "Tema"**, con nombre accesible (`aria-label`) y tooltip (`title`) "Claro", "Oscuro" y "Sistema". Es un grupo de radios nativos: se mueve con las flechas del teclado. Mide 28 px de alto en cada opción en escritorio y tablet y 30 px en celular.

Posición, en todas las pantallas:
- **Escritorio y tablet, pantallas de la app:** arriba a la derecha de la cabecera de la página, **junto al selector de periodo** en el Panel y junto al botón principal en las demás (siempre el último elemento de la derecha). Va en el flujo de la cabecera, no flotando: si falta espacio, la cabecera se reparte en dos líneas en vez de taparse.
- **Celular:** dentro de la barra superior, entre el logo y el avatar de usuario.
- **Login, registro y encuesta:** esquina superior derecha; el formulario tiene 64 px de margen superior para que no lo toque.

Pantallas de acceso: dos columnas en escritorio (panel turquesa con logo y lema + formulario), apiladas en celular.

## 4. Pantallas

### 4.1 Login
Correo y contraseña (con botón mostrar/ocultar), "Iniciar sesión" y "Registrarse". Error 401: banner **"Correo o contraseña incorrectos"** (mensaje del backend). Tras entrar se abre el **Panel** (decisión aprobada, reemplaza la propuesta de abrir Movimientos). Al terminar la encuesta también se llega al Panel. En el prototipo, usar la contraseña `mal` muestra el error.

### 4.0 Panel (pantalla inicial)

Orden de arriba abajo, pensado para que lo primero que se lea sea cómo va el periodo:

1. **Encabezado:** título "Panel", subtítulo con el rango y el número de movimientos, y a la derecha el **selector de periodo** (Este mes por defecto; Mes anterior, Últimos 30 días, Este año). Es un `<select>` nativo, simple y accesible. El front calcula `from` y `to` y los envía al endpoint propuesto.
2. **Mensaje del día:** franja turquesa de marca con texto oscuro (contraste alto). Cambia cada día: la frase se elige con `día del año % 30` de una lista de 30 frases aprobadas que vive en el front (el prototipo ya la incluye, en la constante `PHRASES`). Sin base de datos ni endpoint; la frase se repite cada 30 días.
3. **Tarjetas de KPIs (COP):** Ingresos (verde, con `+`), Egresos (rojo, con `−`) y Balance (la diferencia). El balance lleva una etiqueta con texto ("Ingresos mayores que egresos" / "Egresos mayores que ingresos") y un signo `−` si es negativo, así que no depende solo del color. Debajo va la **tasa de ahorro** (balance / ingresos, ej. "86,9 % de tus ingresos"), calculada en el front con los totales del resumen; si no hay ingresos en el periodo, no se muestra.
4. **Ingresos frente a egresos:** barra de dos tramos con su porcentaje en texto, calculada con los mismos totales (no es un dato nuevo).

Estados (los mismos del resto de pantallas):

| Estado | Diseño |
|---|---|
| Con datos | Tarjetas y barra |
| Vacío (`movementCount` = 0 en el periodo) | "Aún no tienes movimientos en este periodo" con botón "Nuevo movimiento"; el mensaje del día se conserva |
| Cargando | Esqueletos |
| Error | "No pudimos cargar tu resumen" con "Reintentar" |

Reglas y límites:
- Solo se muestran los KPIs aprobados: ingresos, egresos, balance y tasa de ahorro. Otros posibles quedan como sugerencia futura en `plan-skills.md` y en la sección 11 de la especificación del backend.
- Solo COP (una moneda por respuesta; `currencyCode` por defecto COP). Cómo mostrar movimientos en USD en el Panel no está definido.
- Periodo máximo de 366 días: los 4 periodos del selector caben siempre dentro del límite.
- Los datos salen de `GET /api/movements/summary` (implementado en la rama `feature/dashboard-summary`, con verificación parcial). El prototipo calcula lo mismo con datos simulados.
- Accesibilidad: el selector tiene etiqueta visible, la barra tiene alternativa en texto (`role="img"` con `aria-label`) y la leyenda repite los porcentajes.

### 4.2 Registro
Campos del mockup: nombre completo, identificación, fecha de nacimiento (≥ 18), correo, teléfono, contraseña. Sin confirmación de correo. Las reglas de contraseña y los campos exactos se fijarán en la spec de la parte 3; el prototipo no inventa reglas.

### 4.3 Encuesta (3 pasos, barra de progreso)
1. Ingresos al mes, gastos fijos, % en gastos hormiga, ¿compras innecesarias? (sí/no).
2. Utilidad de la app 1–10, ¿ahorras? (sí/no), cuánto te propones ahorrar.
3. Conocimientos financieros (sí/no), ¿detectas gastos hormiga? (sí/no), forma principal de mover el dinero (efectivo, transferencia, tarjeta de crédito, otro).

"Atrás" conserva lo respondido; el último paso envía. Los campos definitivos dependen del modelo de la parte 4.

### 4.4 Movimientos
- Tabla: descripción (con fecha y categoría), cuenta, método, tipo, monto (verde/rojo con signo, no solo color), acciones.
- Filtros: tipo, categoría, cuenta, desde, hasta (error si desde > hasta), "Limpiar filtros".
- Paginación: "Mostrando 1–20 de 57", selector 10/20/50/100, anterior/siguiente. Usa `{data,page,limit,total}`.
- Formulario (diálogo): tipo, monto > 0, fecha, categoría, cuenta (opcional), método de pago, moneda (solo si no hay cuenta; con cuenta se hereda), descripción.

### 4.5 Cuentas
- Tarjetas: banco, alias, tipo (Ahorros/Corriente/Crédito/Otra), **saldo calculado** (negativo en rojo con signo), moneda.
- Formulario: banco, alias, tipo, moneda (bloqueada si la cuenta ya tiene movimientos).
- Eliminar: aviso de que los movimientos se conservan.
- Paginación por cabeceras `X-Total-Count`, `X-Page`, `X-Limit` (límite por defecto 50).

### 4.6 Metas
- Tarjetas: nombre, motivo y categoría, estado (Activa, Completada, Cancelada, Vencida), porcentaje, barra de progreso accesible, ahorrado, falta, fechas.
- Formulario: nombre, motivo (campo "otro" aparece solo con "Otro"), categoría, monto objetivo > 0, moneda, inicio, fin (> inicio; no en el pasado al crear), estado (solo al editar).
- Texto de ayuda: ahorrar se registra como gasto en la categoría; el progreso suma esos gastos entre las fechas.
- Error del servidor para meta duplicada: "Ya tienes una meta activa en esta categoría…".

### 4.7 Categorías
Tabla: nombre, descripción, tipo (Sistema/Propia). Las del sistema muestran un candado y no se pueden editar ni borrar (solo lectura). Formulario: nombre y descripción (máx. 255).

### 4.8 Mi perfil

Ruta `#/perfil`. Se llega **solo desde el menú de usuario** (no es una sección del menú lateral ni de la barra inferior). Columna única de hasta 880 px: en escritorio queda a la izquierda con aire a la derecha, para que las líneas se lean bien.

**Menú de usuario.** El bloque de abajo del menú lateral (y el avatar de la barra superior en celular) es un botón con el nombre completo (hasta 2 líneas), el correo e iniciales. Al activarlo abre un menú con **Mi perfil** y **Cerrar sesión**. Las iniciales son la primera letra de las dos primeras palabras del nombre ("Camila Rodríguez Pérez" → **CR**; una sola palabra, una letra). En el prototipo el usuario es de ejemplo; en la app real el nombre sale de la respuesta del login (`user.name`) y de `GET /api/users/me`, y el menú se actualiza al guardar.

**Datos** (columnas reales de `users`; el detalle y las reglas están en `docs/generated/specs/perfil/campos-usuario.md`):

| Dato | Modo ver | Modo editar | Validación (mensaje en español) |
|---|---|---|---|
| Nombre completo | Sí | **Editable** | Obligatorio, máx. 150: "El nombre es obligatorio" |
| Teléfono | Sí ("No indicado" si no hay) | **Editable**, opcional | 7–20 caracteres con números, espacios, `+`, `-`, paréntesis (propuesta) |
| Dirección | Sí | **Editable**, opcional | Máx. 255 |
| Género | Sí | **Editable**, opcional (Femenino, Masculino, Otro, "Prefiero no decirlo") | Con "Otro" aparece "Describe tu género" (obligatorio, máx. 100) |
| Correo electrónico | Sí | Solo lectura | — |
| Identificación | Sí | Solo lectura | — |
| Fecha de nacimiento | Sí | Solo lectura | — |
| Moneda preferida | Sí | Solo lectura | — |
| "Miembro desde" | Sí | Solo lectura | — |

No se muestran el rol, la contraseña, el doble factor ni las columnas de auditoría. Los cuatro datos de solo lectura van en una sección aparte con la etiqueta "Solo lectura" y el texto "Estos datos no se pueden cambiar desde aquí.", tanto al ver como al editar (no se muestran como campos deshabilitados para no sugerir que "casi" se pueden editar).

**Ver:** tarjeta con avatar grande, nombre, "Miembro desde …", botón **Editar** y dos secciones ("Datos personales", "Datos de la cuenta").
**Editar:** el foco va al nombre; botones **Guardar** (primario) y **Cancelar** (secundario) al final; el formulario ocupa las mismas secciones.

**Estados**

| Estado | Diseño |
|---|---|
| Cargando el perfil | Esqueleto con `role="status"` |
| Error al cargar | Mensaje con `role="alert"` y "Reintentar" |
| Validación | Mensaje bajo cada campo, `aria-invalid`, el foco va al primer campo con error; no se envía nada |
| Guardando | El botón pasa a "Guardando…" con indicador y se deshabilita; los campos se bloquean; `aria-busy` y anuncio "Guardando tus datos…" |
| Éxito | Vuelve al modo ver con un mensaje verde "Tus datos se actualizaron correctamente." (`role="status"`, con icono, no solo color); el foco va al mensaje; el menú lateral ya muestra el nombre nuevo |
| Error al guardar | Banner rojo `role="alert"` arriba del formulario con el foco; se conserva todo lo escrito y se reactiva Guardar; el dato guardado no cambia |
| Cancelar | Descarta los cambios (sin confirmación) y devuelve el foco a **Editar** |

En el prototipo, "Guardar" simula 0,9 s de espera; el error se provoca con "Simular error del servidor al guardar" del Panel de revisión.

**Mi recomendación para tus tres preguntas** (detalle y motivos en `PROF-001`, sección 10):
- **Correo: solo lectura** en esta fase. Es el dato de inicio de sesión, no hay recuperación de contraseña ni confirmación de correo (regla aprobada), y un error de digitación dejaría a la persona sin acceso. Cuando se quiera, un flujo propio "Cambiar correo" que pida la contraseña actual.
- **Cambio de contraseña: después**, como tarjeta "Seguridad" dentro de esta misma pantalla, con su propio botón y endpoint. No se diseña un botón que no funcione.
- **Perfil financiero (encuesta): fuera de esta pantalla.** Cuando la parte 4 defina sus endpoints, se añade un acceso "Actualizar mi perfil financiero".

## 5. Estados y comportamiento

| Estado | Diseño |
|---|---|
| Cargando | Esqueletos con `role="status"` |
| Vacío | Icono, título, explicación y acción principal |
| Sin resultados por filtro | Mensaje y botón "Limpiar filtros" |
| Error de carga | Mensaje y "Reintentar" |
| Error al guardar | Banner rojo dentro del diálogo, conserva lo escrito |
| Eliminar | Diálogo de confirmación; sin deshacer (soft delete en backend) |
| Validación | Mensaje bajo el campo, `aria-invalid`, no solo color |
| Guardando (perfil) | Botón "Guardando…" deshabilitado, campos bloqueados, `aria-busy` |
| Éxito (perfil) | Mensaje verde con icono y `role="status"` |

El prototipo incluye un **Panel de revisión** (esquina inferior derecha) para alternar estos estados y simular un error del servidor. No forma parte del producto.

## 6. Accesibilidad (objetivo WCAG 2.2 AA)

- Enlace "Saltar al contenido", foco visible de 3 px, `prefers-reduced-motion` respetado.
- Etiquetas asociadas a cada campo, errores con `role="alert"`, botones de solo icono con nombre accesible.
- Objetivos táctiles ≥ 44 px en celular; tablas con `<caption>` y `scope`.
- Diálogos nativos `<dialog>` (foco atrapado, Esc cierra).

### Alternador y menú de usuario

- **Alternador:** radios nativos con `aria-label` y `title`. El tooltip es el `title` del navegador: aparece con el puntero, **no** con el teclado ni en pantallas táctiles; para esos casos sirve el nombre accesible y el estado marcado. No se implementó un tooltip propio, así que el criterio WCAG 1.4.13 (contenido al pasar el puntero o enfocar) no aplica a algo propio, pero tampoco se probó con lector de pantalla.
- **Tamaño del alternador:** 28 px (escritorio y tablet) y 30 px (celular). Cumple el mínimo de 24 px de WCAG 2.2 (2.5.8) pero **queda por debajo de los 44 px** que usa el resto de la interfaz en celular: es una excepción deliberada por tu pedido de "tamaño pequeño".
- **Menú de usuario** (patrón "menu button" de WAI-ARIA): `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`; el menú es `role="menu"` con dos `role="menuitem"`. Teclado: Enter, Espacio o ↓ abren y enfocan el primer ítem; ↑ abre y enfoca el último; ↑ ↓ se mueven con vuelta circular; Inicio y Fin; Esc cierra y devuelve el foco al botón; Tab cierra; clic fuera cierra. Foco visible de 3 px en los ítems en ambos temas.
- **Nombre accesible del botón:** "Menú de cuenta: " + nombre (en tablet y celular, donde solo se ve el avatar, el texto queda oculto visualmente pero disponible para lectores).

### Modo oscuro: comportamiento y decisión de almacenamiento

- **Por defecto** se sigue `prefers-color-scheme` del sistema. Con "Sistema" no se guarda nada y el tema cambia solo si cambia el sistema.
- **Elegir Claro u Oscuro** fija `data-theme` en `<html>` y lo guarda en `localStorage` con la clave `crezia-theme`. Esa elección **tiene prioridad** sobre el sistema. Elegir "Sistema" borra la clave.
- **Sin parpadeo:** un script en línea dentro de `<head>`, antes de cualquier estilo visible, lee la clave y pone `data-theme` antes de que exista `<body>`. En el front real debe quedar en `index.html`, no en un componente de React.
- **Si `localStorage` no está disponible** (modo privado, datos bloqueados) todas las lecturas y escrituras van en `try/catch`: el alternador sigue funcionando durante la sesión y al recargar vuelve a mandar el sistema. No hay errores en consola.
- **Por qué `localStorage` y no cookie o base de datos:** es una preferencia visual por navegador; no hace falta enviarla al servidor ni tocar el backend (se pidió sin backend). Consecuencia: la elección no viaja entre dispositivos.
- `color-scheme` y `<meta name="color-scheme">` se declaran para que los controles nativos (selectores de fecha, barras de desplazamiento, diálogos) también cambien.

### Accesibilidad en ambos temas

- **Ingresos y egresos no dependen solo del color:** signo `+` / `−` en cada monto, chip con texto ("Ingreso", "Gasto"), barra del Panel con **rayas** en el tramo de egresos y leyenda con el mismo patrón, y la etiqueta "Ingresos mayores que egresos".
- **Foco visible:** anillo de 3 px (`--focus`) con halo exterior (`--focus-halo`) en ambos temas; en el selector Sí/No elegido el anillo interior usa el color del texto del botón.
- **Errores:** borde del campo en `--error` más mensaje con icono "⚠" y `role="alert"`; no solo color.
- **Deshabilitados:** fondo, texto y borde propios (`--disabled-*`), cursor `not-allowed`; el texto deshabilitado está exento de contraste (WCAG 1.4.3) pero aun así supera 4,5:1.
- Ratios WCAG 2.2: texto 4,5:1 (1.4.3) y componentes y foco 3:1 (1.4.11).

### Tabla de contrastes

Calculada con un script a partir de los tokens del propio HTML (no copiada a mano); el bloque de oscuro del sistema y el de elección manual son idénticos.

| Par | Mín. | Claro | Oscuro | Dónde |
|---|---|---|---|---|
| Texto sobre fondo | 4,5:1 | 14,30:1 ✅ (#0B2B30 / #F4FBFC) | 16,14:1 ✅ (#E8F6F7 / #071A1D) | Cuerpo de la página |
| Texto sobre superficie | 4,5:1 | 14,97:1 ✅ (#0B2B30 / #FFFFFF) | 13,63:1 ✅ (#E8F6F7 / #0E2A2F) | Tarjetas, tablas, formularios, diálogos |
| Texto secundario sobre fondo | 4,5:1 | 6,45:1 ✅ (#4A5F63 / #F4FBFC) | 9,71:1 ✅ (#A9C4C7 / #071A1D) | Notas, subtítulos |
| Texto secundario sobre superficie | 4,5:1 | 6,76:1 ✅ (#4A5F63 / #FFFFFF) | 8,20:1 ✅ (#A9C4C7 / #0E2A2F) | Subtítulos, pistas, placeholders |
| Texto secundario sobre superficie 2 | 4,5:1 | 6,21:1 ✅ (#4A5F63 / #E6F9FA) | 6,67:1 ✅ (#A9C4C7 / #153A40) | Encabezado de tabla |
| Texto secundario sobre neutro | 4,5:1 | 6,04:1 ✅ (#4A5F63 / #EEF3F4) | 6,61:1 ✅ (#A9C4C7 / #1B3A40) | Chip neutro |
| Enlace sobre superficie | 4,5:1 | 5,82:1 ✅ (#06707A / #FFFFFF) | 9,81:1 ✅ (#5EE3E9 / #0E2A2F) | Enlaces, botón secundario, marca |
| Enlace sobre fondo | 4,5:1 | 5,56:1 ✅ (#06707A / #F4FBFC) | 11,61:1 ✅ (#5EE3E9 / #071A1D) | Enlaces en la página |
| Enlace sobre superficie 2 | 4,5:1 | 5,35:1 ✅ (#06707A / #E6F9FA) | 7,97:1 ✅ (#5EE3E9 / #153A40) | Hover del botón secundario y de iconos |
| Texto del botón primario | 4,5:1 | 4,76:1 ✅ (#FFFFFF / #087F8A) | 9,35:1 ✅ (#031F23 / #2CD3DB) | Botones, ítem activo del menú |
| Texto del botón primario (hover) | 4,5:1 | 5,90:1 ✅ (#FFFFFF / #076F79) | 11,14:1 ✅ (#031F23 / #5EE3E9) | Hover de botones |
| Texto sobre turquesa de marca | 4,5:1 | 7,33:1 ✅ (#0B2B30 / #00C9D1) | 8,58:1 ✅ (#E8F6F7 / #0D4D55) | Panel de acceso, mensaje del día |
| Texto del botón de eliminar | 4,5:1 | 6,54:1 ✅ (#FFFFFF / #B3261E) | 7,97:1 ✅ (#2B0B09 / #FF8A80) | Confirmar eliminación |
| Texto del botón de eliminar (hover) | 4,5:1 | 8,91:1 ✅ (#FFFFFF / #8F1D17) | 10,42:1 ✅ (#2B0B09 / #FFB0A9) | Hover de eliminar |
| Éxito sobre superficie | 4,5:1 | 7,43:1 ✅ (#17622F / #FFFFFF) | 8,86:1 ✅ (#6EDC93 / #0E2A2F) | Ingresos, "+" |
| Éxito sobre su fondo | 4,5:1 | 6,54:1 ✅ (#17622F / #E5F4EA) | 8,11:1 ✅ (#6EDC93 / #12331F) | Chip de ingreso / activa |
| Error sobre superficie | 4,5:1 | 6,54:1 ✅ (#B3261E / #FFFFFF) | 7,45:1 ✅ (#FF9B92 / #0E2A2F) | Egresos, "−", mensajes de error |
| Error sobre fondo | 4,5:1 | 6,24:1 ✅ (#B3261E / #F4FBFC) | 8,82:1 ✅ (#FF9B92 / #071A1D) | Mensajes de error en la página |
| Error sobre su fondo | 4,5:1 | 5,72:1 ✅ (#B3261E / #FDECEA) | 7,78:1 ✅ (#FF9B92 / #3D1714) | Banner de error, chip de gasto |
| Advertencia sobre su fondo | 4,5:1 | 5,79:1 ✅ (#8A5300 / #FFF4DC) | 8,15:1 ✅ (#F6BD5A / #3A2A08) | Chips de aviso |
| Info sobre su fondo | 4,5:1 | 7,28:1 ✅ (#055A63 / #E6F9FA) | 7,57:1 ✅ (#7FE6EB / #12424A) | Chips, avatar, banner informativo |
| Info sobre superficie | 4,5:1 | 7,93:1 ✅ (#055A63 / #FFFFFF) | 10,37:1 ✅ (#7FE6EB / #0E2A2F) | Porcentaje de la meta |
| Texto del aviso (toast) | 4,5:1 | 14,97:1 ✅ (#FFFFFF / #0B2B30) | 16,14:1 ✅ (#071A1D / #E8F6F7) | Toast, enlace "Saltar al contenido" |
| Texto de la franja de prototipo | 4,5:1 | 14,97:1 ✅ (#FFFFFF / #0B2B30) | 15,08:1 ✅ (#CFE3E5 / #02090A) | Franja superior |
| Texto deshabilitado (informativo, exento) | 4,5:1 | 5,10:1 ✅ (#566A6D / #EEF3F4) | 6,08:1 ✅ (#8CA9AD / #12292D) | Campos y botones deshabilitados |
| Borde de controles sobre superficie | 3:1 | 3,83:1 ✅ (#5B8A90 / #FFFFFF) | 4,95:1 ✅ (#6A9CA2 / #0E2A2F) | Campos, selectores, opciones |
| Borde de controles sobre fondo | 3:1 | 3,66:1 ✅ (#5B8A90 / #F4FBFC) | 5,87:1 ✅ (#6A9CA2 / #071A1D) | Selector de tema, filtros |
| Borde de controles sobre superficie 2 | 3:1 | 3,52:1 ✅ (#5B8A90 / #E6F9FA) | 4,03:1 ✅ (#6A9CA2 / #153A40) | Controles sobre zonas suaves |
| Primario sobre superficie | 3:1 | 4,76:1 ✅ (#087F8A / #FFFFFF) | 8,23:1 ✅ (#2CD3DB / #0E2A2F) | Opción elegida, borde de campo activo |
| Primario sobre pista | 3:1 | 3,74:1 ✅ (#087F8A / #D3E8EB) | 5,49:1 ✅ (#2CD3DB / #24474D) | Relleno de progreso y de pasos |
| Éxito sobre pista | 3:1 | 5,85:1 ✅ (#17622F / #D3E8EB) | 5,91:1 ✅ (#6EDC93 / #24474D) | Tramo de ingresos, meta completada |
| Error sobre pista | 3:1 | 5,14:1 ✅ (#B3261E / #D3E8EB) | 4,97:1 ✅ (#FF9B92 / #24474D) | Tramo de egresos |
| Borde de error sobre superficie | 3:1 | 6,54:1 ✅ (#B3261E / #FFFFFF) | 7,45:1 ✅ (#FF9B92 / #0E2A2F) | Campo con error |
| Anillo de foco sobre superficie | 3:1 | 14,97:1 ✅ (#0B2B30 / #FFFFFF) | 10,37:1 ✅ (#7FE6EB / #0E2A2F) | Foco en controles |
| Anillo de foco sobre fondo | 3:1 | 14,30:1 ✅ (#0B2B30 / #F4FBFC) | 12,28:1 ✅ (#7FE6EB / #071A1D) | Foco en controles de la página |
| Anillo de foco sobre su halo | 3:1 | 14,97:1 ✅ (#0B2B30 / #FFFFFF) | 12,28:1 ✅ (#7FE6EB / #071A1D) | Halo exterior del foco |
| Anillo de foco sobre superficie 2 | 3:1 | 13,76:1 ✅ (#0B2B30 / #E6F9FA) | 8,43:1 ✅ (#7FE6EB / #153A40) | Foco en zonas suaves |
| Anillo interior de la opción elegida | 3:1 | 4,76:1 ✅ (#FFFFFF / #087F8A) | 9,35:1 ✅ (#031F23 / #2CD3DB) | Selector Sí/No elegido con foco |
| Iconos (texto 2) sobre superficie | 3:1 | 6,76:1 ✅ (#4A5F63 / #FFFFFF) | 8,20:1 ✅ (#A9C4C7 / #0E2A2F) | Iconos de acciones |

Hallazgos corregidos con este trabajo: el borde de controles anterior (`#8FB5B9`) daba menos de 3:1 y se sustituyó por `--border-strong`; el enlace sobre fondo suave (`#087F8A` sobre `#E6F9FA`, 4,36:1) pasó a `--link` (5,35:1). El logo es un elemento de marca exento de contraste (el glifo claro sobre su mosaico da ≈2,98:1 en claro y ≈6,52:1 en oscuro).

**Verificado (con Chromium headless y Playwright sobre `prototipo-crezia.html`):**
- **73 comprobaciones de comportamiento, todas en verde.** Tema: sistema claro/oscuro, elección manual que gana al sistema, persistencia, "Sistema" borra la elección, teclado, `localStorage` bloqueado, `data-theme` antes de `<body>`. Alternador: exactamente uno visible por pantalla, sin la palabra "Tema", solo iconos, nombres y tooltips "Claro/Oscuro/Sistema", dentro de la pantalla y **sin tapar el título, el selector de periodo, la marca ni el avatar** en las 6 pantallas de la app (Panel, Movimientos, Cuentas, Metas, Categorías, Mi perfil) y en login, registro y encuesta 1–3, a 1366, 900 y 390 px en ambos temas. Menú de usuario: nombre real e iniciales, abrir con clic/Enter/Espacio/↓/↑, flechas, Inicio, Fin, Esc, Tab, clic fuera, Enter en "Mi perfil" abre la pantalla, cerrar sesión solo con teclado, y posición dentro de la pantalla y por encima del contenido en tablet y celular. Mi perfil: ver, editar, validación por campo con foco, estado guardando, éxito, cancelar, error del servidor con lo escrito conservado, reintento, estados cargando y error, y nombre de 150 caracteres sin desbordamiento.
- **Auditoría de contraste sobre el DOM real:** 184 vistas (acceso, encuesta, las seis pantallas con sus estados, los diálogos, Mi perfil en ver, editar, validación, guardando, éxito y error del servidor, y el menú de usuario abierto) a 1366 y 390 px en ambos temas: 6 820 comprobaciones de texto y campos, **0 fallos**. Una autoprueba confirma que la auditoría detecta un contraste insuficiente. No se agregaron tokens: el mensaje de éxito usa `--success` sobre `--success-bg` (7,43:1 en claro y 8,11:1 en oscuro, ya en la tabla).
- **Capturas** de Panel, Mi perfil, login, registro y Movimientos a 1366, 900 y 390 px en ambos temas, más Mi perfil en edición y el menú abierto. **Revisé a ojo 11 de ellas** (Panel claro y oscuro en escritorio y tablet, Mi perfil claro y oscuro en escritorio, tablet y celular, edición en escritorio, menú abierto en escritorio y celular, registro oscuro en tablet).
- La revisión encontró y corregí **cuatro defectos**: (1) en tablet el selector de periodo y el alternador caían bajo el título; (2) en celular el nombre de Mi perfil se partía junto a "Editar"; (3) **ya existentes:** en tablet la tabla de Movimientos era 18 px más ancha que el área útil y hacía scroll horizontal de toda la página; (4) **ya existente:** en celular el paginador de Cuentas y Metas se salía de la pantalla (y en Movimientos quedaba recortado). No los había visto antes porque solo medía el desbordamiento del Panel; ahora se mide en las seis pantallas.

**No verificado:**
- Lector de pantalla (NVDA, VoiceOver, TalkBack), navegación solo con teclado de punta a punta, dispositivos reales, Safari y Firefox (solo Chromium), texto ampliado al 200 % y modo de contraste forzado de Windows.
- La auditoría automática **no mide** texto sobre degradados ni iconos y bordes (esos están en la tabla de pares, por token).
- No revisé a ojo todas las capturas ni todas las combinaciones de pantalla, tema y tamaño.
- El tooltip es el nativo (`title`); no se probó cómo lo anuncian los lectores.
- La variante oscura del logo no pasó por diseño gráfico: es una derivación mía.
- El prototipo no llama a la API: el guardado, la espera y los errores están simulados.

## 7. Límites conocidos del prototipo

- Datos y nombres de ejemplo; nada llama a la API.
- La moneda de las metas no se filtra en el cálculo de progreso (limitación actual de la API, indicada en el formulario).
- Los datos de cuentas/metas calculados aquí son estáticos; en la app real vienen de la API.
- Fuentes desde Google Fonts: sin conexión se usa una fuente del sistema.

## 8. Decisiones que necesito de ti

1. ~~¿Tras iniciar sesión se abre Movimientos?~~ **Resuelta:** se abre el Panel.
2. ~~Token derivado `#087F8A` para botones y enlaces~~ **Aprobado.**
3. ¿Cuentas y metas como **tarjetas** y movimientos/categorías como **tabla** te parece bien? (sin respuesta todavía)
4. ¿Algún cambio en campos del registro o de la encuesta antes de la spec? (se resuelve en la parte 3)
5. ~~Panel: orden y los 4 periodos~~ **Aprobados.**
6. ~~Las 30 frases y las preguntas de `DASH-001`~~ **Aprobadas** (ver `dashboard-summary.md`, sección 13).
7. **Modo oscuro (nuevo):** ¿apruebas los tokens de oscuro, el alternador de tres opciones (claro / oscuro / sistema) y guardar la elección en `localStorage`? ¿Y la variante oscura del logo, o prefieres rehacerla desde el maestro vectorial?
8. **Menú de usuario y Mi perfil (nuevo):** ¿apruebas el menú de usuario (nombre e iniciales, Mi perfil y Cerrar sesión), la pantalla Mi perfil con ver/editar y los datos que se editan (nombre, teléfono, dirección, género)?
9. **Tres preguntas abiertas de Mi perfil** (mi recomendación entre paréntesis; detalle en `docs/generated/specs/perfil/perfil-usuario.md`, sección 10): correo (solo lectura), cambio de contraseña (después, tarjeta propia), perfil financiero (fuera de esta pantalla). Además: ¿la moneda preferida queda de solo lectura por ahora? ¿apruebas el formato propuesto del teléfono?
