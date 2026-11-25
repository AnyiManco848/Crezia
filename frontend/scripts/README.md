# Scripts de revisión visual y accesibilidad

Herramientas de desarrollo, **no** forman parte de la aplicación ni del build. Funcionan contra una **API simulada** (sin base de datos ni datos reales), así que se pueden repetir en cualquier momento sin tocar Supabase.

| Script | Comando | Qué hace |
|---|---|---|
| `mock-api.mjs` | `npm run mock:api` | API simulada en `http://127.0.0.1:3999` (cambia el puerto con `MOCK_API_PORT`). Login, resumen, cuentas, movimientos, categorías, metas y registro, con datos inventados. |
| `capture-screens.mjs` | `npm run visual:capture [filtro]` | Capturas de las 7 pantallas, el menú de usuario y un diálogo de crear por pantalla, a 1366, 900 y 390 px en tema claro y oscuro (72 PNG). Además corre **axe** y busca desbordes de página y diálogos fuera de pantalla. |
| `axe-states.mjs` | `npm run visual:axe` | axe en los estados que cambian la página: formularios con errores, registro con 409 y 429, diálogos con errores, listas vacías, con error y cargando. También mide el contraste de las barras de progreso. |

## Cómo repetirlo

Necesitas tres terminales (PowerShell), todas dentro de `frontend/`:

```powershell
# 1) API simulada
npm run mock:api

# 2) El front apuntando a la API simulada (el CSP de desarrollo usa VITE_API_URL)
$env:VITE_API_URL = "http://127.0.0.1:3999"
npm run dev

# 3) Las comprobaciones (el front sirve en el puerto 5173)
npm run visual:capture
npm run visual:axe
```

Si el front corre en otro puerto: `$env:FRONT_URL = "http://127.0.0.1:5174"`.

Los navegadores de Playwright deben estar instalados (`npx playwright install chromium`, una sola vez).

## Dónde deja los resultados

- **Capturas:** `docs/generated/design/capturas/` (nombre `pantalla-ancho-tema.png`). Cámbialo con `CAPTURES_DIR`. **Sobrescriben** las capturas anteriores: revisa `git diff` antes de hacer commit.
- **Informes JSON:** `frontend/scripts/out/` (`audit.json`, `states.json`; ignorada por git). Cámbialo con `REPORT_DIR`.
- **Resumen en consola:** número de violaciones de axe, páginas con desborde horizontal y diálogos fuera de pantalla. Lo esperado es `0`, `none` y `0`.

## Cosas que conviene saber

- El detector de desbordes también marca textos que solo leen los lectores de pantalla (`sr-only`) y el nombre del usuario cuando el menú se colapsa; son falsos positivos conocidos que quedan en `audit.json`. Lo que importa son las tres líneas del resumen.
- En las capturas de página completa el menú lateral y la barra inferior aparecen a media imagen: es un efecto de la captura (son elementos fijos).
- Los campos de fecha salen como `mm/dd/yyyy` por el idioma del Chromium de pruebas.
- axe detecta solo una parte de los problemas de accesibilidad. No sustituye una revisión con lector de pantalla y teclado.
- `axe-states.mjs` cambia el modo de la API simulada (`/__mode/…`, `/__reg/…`) y lo deja en `normal` y `created` al terminar.
