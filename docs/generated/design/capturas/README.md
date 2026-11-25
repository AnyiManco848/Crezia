# Capturas del front (cierre visual)

Generadas el 2026-11-24 con Playwright (Chromium) contra el front y la API simulada (no la real). Nombre: `pantalla-ancho-tema.png`.

- Pantallas: `login`, `registro`, `panel`, `movimientos`, `cuentas`, `categorias`, `metas`.
- Menú de usuario: `menu-usuario-<ancho>-<tema>.png` (se abre en el Panel).
- Diálogo de crear: `<pantalla>-nuevo-<ancho>-<tema>.png` (movimientos, cuentas, categorias, metas).
- Registro con errores del servidor (solo 1366): `registro-409-…` y `registro-429-…`.
- Anchos: 1366, 900 y 390 px. Temas: `claro` y `oscuro`.

Notas para leerlas:
- Las capturas de página completa muestran el menú lateral o la barra inferior en medio de la imagen; es un efecto de la captura (son elementos fijos), no del diseño.
- Los campos de fecha muestran `mm/dd/yyyy` porque el Chromium de pruebas está en inglés; en un navegador en español se ven como `dd/mm/aaaa`.
- Los datos son inventados (API simulada).
