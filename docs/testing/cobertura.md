# Cobertura: qué se excluye y por qué

Fecha de la revisión: 2026-11-25. Las exclusiones están en tres lugares, con los mismos patrones, para que Vitest y SonarCloud den los mismos números:

- `vitest.config.ts` (`coverage.exclude`, backend)
- `frontend/vite.config.ts` (`coverage.exclude`, frontend)
- `sonar-project.properties` (`sonar.coverage.exclusions`; los patrones del frontend llevan el prefijo `frontend/`)

Las tres listas coinciden (verificado el 2026-11-25 expandiendo cada patrón contra los archivos del repositorio: ningún archivo de `src` o `frontend/src` queda excluido solo por un lado). `src/config/**` y los repositorios Prisma no se excluyen en ninguna.

Criterio: solo se excluye código que no es lógica probable con pruebas unitarias. Casos de uso, entidades, validadores, middlewares, controladores, hooks, componentes y servicios **no** se excluyen.

## Qué se excluye de la cobertura y por qué

| Grupo | Archivos | Justificación |
|---|---|---|
| Código generado | `src/generated/**` | Lo produce `prisma generate`; no se escribe a mano y se regenera. |
| Arranque y composición (backend) | `src/server.ts`, `src/infrastructure/container.ts`, `src/infrastructure/prisma/client.ts` | Solo levantan el servidor y conectan clases entre sí; no deciden nada. Se ejercitan en las pruebas de API contra el servidor real. |
| Arranque y composición (frontend) | `src/main.tsx`, `src/presentation/app/App.tsx`, `src/application/validation/zodSetup.ts` | Montaje de React, árbol de providers y una línea de configuración de zod. Sin lógica. |
| Tipos y puertos puros | `src/domain/repositories/**`, `src/domain/pagination.ts`, `src/application/services.ts`, `src/application/**/index.ts`, `**/*.d.ts` | Solo declaran interfaces y tipos o reexportan; no tienen sentencias ejecutables. |
| Archivos de prueba | `**/*.test.ts(x)`, `**/*.spec.ts`, `frontend/src/test/**` | Son las pruebas, no el código a medir. |
| Ya fuera del alcance (sin patrón) | `prisma/`, `scripts/`, `utils/`, `services/`, `data/`, `fixtures/`, `tests/**`, `frontend/e2e`, `frontend/scripts` | Vitest solo mide `src/**` y Sonar solo analiza `src` y `frontend/src`. |

`sonar.cpd.exclusions` no se usa: no hay evidencia de duplicación que deba ocultarse.

Comprobación de que no se oculta lógica: tras aplicar las exclusiones, las líneas cubiertas no cambian (backend 520, frontend 1176); solo desaparecen líneas sin cubrir.

## Resultado

Backend y frontend medidos con `npm run test:coverage` (335 → 473 pruebas en el backend y 315 → 371 en el frontend).

| Paquete | Líneas | Ramas | Funciones |
|---|---|---|---|
| Backend, medición inicial | 67,62 % | 78,29 % | 68,12 % |
| Backend, tras las exclusiones de la categoría A | 80,24 % | 82,36 % | 70,27 % |
| Backend, tras las pruebas nuevas y sin excluir `src/config/**` | **90,01 %** | **87,70 %** | **82,66 %** |
| Frontend, medición inicial | 97,75 % | 91,29 % | 96,23 % |
| Frontend, tras las exclusiones de la categoría A | 98,00 % | 91,29 % | 96,43 % |
| Frontend, tras las pruebas nuevas y borrar las páginas sin uso | **99,16 %** | **94,05 %** | **97,89 %** |

Al dejar de excluir `src/config/**` el denominador del backend crece (sus pruebas ya existían), así que ese paso no es una exclusión nueva sino la vuelta a medir código real.

## Pruebas añadidas (2026-11-25)

| Qué | Archivo | Comportamiento que verifican |
|---|---|---|
| Controladores de categorías, cuentas, metas y movimientos | `tests/presentation/routes/resourceRoutes.test.ts` | Router, controlador y middlewares reales con casos de uso simulados, sin BD. Por recurso: 401 sin token, con token inválido y con usuario ya borrado; 400 por cuerpo, id o paginación inválidos sin llegar al caso de uso; 404 de recurso ajeno o inexistente; éxito con el dueño tomado del token; un campo protegido enviado por el cliente (`userId`, `status`, `isDefault`) no llega al caso de uso; mensaje de borrado en español. |
| `BcryptPasswordHasher` | `tests/infrastructure/BcryptPasswordHasher.test.ts` | El hash no contiene la clave, cada hash lleva su sal, la clave correcta pasa y la incorrecta no, coste por defecto 10. |
| `UpdateMovementUseCase` | `tests/application/movements/UpdateMovementCurrency.test.ts` | Un movimiento sin cuenta cambia de moneda solo si la nueva está activa (las líneas 60 a 62 que no se cubrían). |
| `errorHandler` y `notFound` | `tests/presentation/middlewares/errorHandlerStatuses.test.ts` | Código HTTP de cada error de dominio (400, 401, 403, 409, 429), detalles de validación, JSON mal formado y error no estándar. |
| `PrismaUserRepository` | `tests/infrastructure/PrismaUserRepositoryQueries.test.ts` | Con dobles del delegado de Prisma: las consultas ignoran borrados, comparan el correo sin distinguir mayúsculas y no seleccionan el hash donde no toca. |
| `routes.tsx` | `frontend/src/presentation/app/routes.test.tsx` | Con `MemoryRouter`: rutas públicas, las cinco rutas protegidas redirigen al login sin sesión y abren con sesión, la raíz va al Panel, ruta no encontrada. |
| `Dialog`, `Pager` | `frontend/src/presentation/components/*.test.tsx` | Estado ocupado (no se cierra ni se reenvía), Escape, foco de vuelta al botón que lo abrió, API nativa de `<dialog>`, paginación vacía y última página parcial. |
| `UserMenu`, `AppLayout` | `frontend/src/presentation/layout/*.test.tsx` | Patrón de menú accesible (flechas, Escape, Tab, clic fuera), variante compacta, foco en `<main>` tras navegar, las cinco secciones en las dos navegaciones. |
| `GoalsPage` | `frontend/src/presentation/features/goals/GoalsPageEdgeCases.test.tsx` | Tras borrar la última meta de la última página vuelve a la anterior; si la lista no se puede refrescar conserva las filas y ofrece reintentar; si fallan las categorías el diálogo lo dice y se recupera. |

## Pendiente de decisión (no excluido)

- Repositorios Prisma (`src/infrastructure/repositories/Prisma*Repository.ts`) y `prisma/softDelete.ts`: **decidido, no se excluyen.** Siguen en 0 % unitario; solo los cubre la API real.
- `PendingPage.tsx` y `RegisterPendingPage.tsx`: eliminados (ninguna ruta ni archivo los usaba), por lo que ya no cuentan en el frontend.
- Frontend con ramas aún bajas: `CategoriesPage`, `AccountsPage`, `MovementFilters` y `GoalFormDialog` (92 a 96 % de líneas).
