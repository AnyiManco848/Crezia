# Pipeline de CI

Archivo: `.github/workflows/ci.yml` (nombre «CI/CD»). Se ejecuta en cada `push` a `master` y `develop` y en cada pull request hacia esas ramas. **No despliega**: Railway (API) y Vercel (front) ya despliegan solos desde GitHub.

## Qué hace

| Orden | Job | Qué ejecuta |
|---|---|---|
| 1 | **Unit Tests** (`test`) | `npm ci` en la raíz y en `frontend/`; `npm run test:coverage` en ambos; sube `coverage/lcov.info` y `frontend/coverage/lcov.info` como artefactos (`coverage-backend`, `coverage-frontend`). |
| 2 | **Build Check** (`build`, necesita `test`) | `npm run build` del backend (`prisma generate` + `tsc`), `npm run lint` y `npm run build` del front (`tsc --noEmit` + `vite build`). |
| 3 | **Sonar Analysis** (`sonar`, necesita `build`) | Descarga los dos lcov (no repite pruebas), antepone `frontend/` a las rutas del lcov del front y ejecuta `SonarSource/sonarqube-scan-action@v8`. Espera el Quality Gate (`sonar.qualitygate.wait=true`, 300 s): si falla, el job falla. |

- Node 22, igual que el `Dockerfile` (`engines` pide `>=20`; no hay `.nvmrc`). Caché de npm con los dos `package-lock.json`.
- Permisos mínimos (`contents: read`) y `concurrency` que cancela la ejecución anterior de la misma rama o PR.
- Las variables que necesitan las pruebas y el build (`DIRECT_URL`, `DATABASE_URL`, `JWT_SECRET`, `VITE_API_URL`) son **valores falsos escritos en el propio workflow**. No usa Supabase, Railway ni Vercel.
- **No incluye** las pruebas de API (Playwright contra `crezia_test`) ni los E2E del front: necesitan una base de pruebas con sus guardas.
- El job de Sonar se omite en pull requests de forks (GitHub no les da secretos).

## Secret `SONAR_TOKEN`

1. En SonarCloud: *My Account → Security → Generate Tokens*.
2. En GitHub: *Settings → Secrets and variables → Actions → New repository secret*, nombre `SONAR_TOKEN`.
3. Rellena `sonar.organization` en `sonar-project.properties` (hoy es el marcador `<ORGANIZATION_KEY>`). El token **no** va en ningún archivo.

## Dónde ver los resultados

- **GitHub Actions:** pestaña *Actions* del repositorio → ejecución «CI/CD»; en una PR, sección *Checks*. Los lcov están en *Artifacts* al final de la ejecución.
- **SonarCloud:** proyecto `AnyiManco848_Crezia` en sonarcloud.io (Quality Gate, cobertura, incidencias, duplicación). En una PR, SonarCloud también comenta el estado.

## Cobertura

- Backend: `npm run test:coverage` (Vitest + `@vitest/coverage-v8`, ya existía). Salida en `coverage/`.
- Front: `npm run test:coverage` (se añadió con `@vitest/coverage-v8` y el bloque `coverage` de `frontend/vite.config.ts`). Salida en `frontend/coverage/`. Ambas carpetas están en `.gitignore`.
- `sonar-project.properties` excluye `src/generated`, `prisma/migrations`, `docs`, `frontend/e2e`, `tests/api` y los archivos de prueba.
