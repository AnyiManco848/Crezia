# Auditoría de preparación para IA (agentic-project-setup, modo Audit)

- **Fecha:** 2026-11-15
- **Repositorio:** `C:\Users\ANYI\Desktop\Crezia` (rama activa `test/api-playwright`)
- **Modo:** Audit. No se modificó ningún archivo del proyecto; este informe es el único archivo creado.
- **Punto de entrada confirmado por la usuaria:** `CLAUDE.md`. No se propone crear `AGENTS.md` ni `.agents/`.

## 1. Alcance y límites de la evidencia

**Leído:** `CLAUDE.md`, `.claude/settings.json`, `README.md`, `docs/GUIA_DEL_CODIGO.md`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example` (sin valores), `.env.perf.example`, `src/` (muestra de imports y composición), `prisma/schema.prisma` y las migraciones, `tests/`, `scripts/`.

**No leído a propósito:** `.env` y `.env.perf` (secretos). Solo sé que existen y que están en `.gitignore`.

**No verificable desde aquí:**
- Si el bloqueo de git de `.claude/settings.json` también cubre la herramienta de PowerShell (solo vi reglas `Bash(...)`).
- Qué hace cada compañera con su propio entorno de Claude Code.
- El estado de Supabase.

**Contexto nuevo aportado por la usuaria (decisiones, no evidencia del repo):** front en `frontend/` (React + Vite + TypeScript), salidas generadas en `docs/generated/`, listas paginadas con cabeceras, registro y perfil financiero pendientes de implementar.

## 2. Perfil del proyecto

| Aspecto | Evidencia |
|---|---|
| Propósito | API REST de finanzas personales: login y CRUD de categorías, cuentas, movimientos y metas (`README.md`, `docs/GUIA_DEL_CODIGO.md` §1). |
| Stack | Node + TypeScript + Express 5, Prisma 7 sobre PostgreSQL (Supabase), Vitest, Playwright (solo API), zod, bcrypt, jsonwebtoken (`package.json`, `CLAUDE.md`). |
| Arquitectura | Clean Architecture: `src/domain`, `src/application`, `src/infrastructure`, `src/presentation`; composición en `src/infrastructure/container.ts`. |
| Base de datos | Solo con migraciones (`prisma/migrations/`, regla de `CLAUDE.md`). Diseño original en `docs/db/crezia_schema_v2.sql`. |
| Pruebas | Vitest en `tests/**/*.test.ts` (195 pruebas en la última corrida); Playwright en `tests/api/**/*.spec.ts`. |
| Rendimiento | Pruebas k6 en un repo aparte (`C:\Users\ANYI\Desktop\Crezia_Performance`); el backend tiene un modo `PERF_MODE` con protección (`src/config/perfGuard.ts`). |
| Front | No existe todavía. Decidido: `frontend/` dentro de este repo. |
| Lenguaje | Respuestas y documentos en español; código, nombres y commits en inglés; mensajes al usuario final en español (`CLAUDE.md`). |

## 3. Aplicabilidad por dimensión

| Dimensión | Disposición | Motivo breve |
|---|---|---|
| Contexto del proyecto | **Improve** | `CLAUDE.md` describe stack y reglas, pero no los comandos, ni los entornos, ni el modo perf. |
| Arquitectura | **Keep** | Las reglas de capas están escritas y coinciden con una muestra del código (ver §5). |
| Diseño (UI/UX) | **Create** (cuando exista el front) | No hay interfaz hoy; se decidió el front, pero no hay reglas escritas para él. |
| Desarrollo | **Keep** | Idioma, soft delete, 404 en recursos ajenos, cálculo de saldos y metas: claros y consistentes con el código. |
| Pruebas y calidad | **Improve** | No hay lint ni formato; `tsc` no tiene script y no revisa los tests (ver F-05). |
| Seguridad base | **Improve** | Reglas de `.env` y de BD correctas; falta advertir que Playwright pega a la BD real. |
| Despliegue e infraestructura | **Not applicable** (por ahora) | La API solo corre en local; no hay archivos de despliegue. |
| CI/CD | **Not applicable** (por ahora) | No hay `.github/` ni pipeline. Se anota, no se propone crear. |
| Datos y bases de datos | **Keep** | Migraciones, `schema.prisma` y regla "solo con migraciones" están alineados. |
| APIs e integraciones | **Improve** | Contrato documentado en `README.md`; `CLAUDE.md` no lo referencia ni menciona la paginación por cabeceras. |
| Observabilidad | **Not applicable** | No hay logs estructurados ni métricas en el código. |
| Operaciones | **Not applicable** | Sin despliegue no hay runbooks que auditar. |
| Documentación | **Improve** | `docs/generated/` y la guía a mano no están descritos; la guía tiene partes desfasadas (F-08). |
| Especificaciones y cambios | **Keep** | Flujo por ramas y Conventional Commits en `CLAUDE.md`. Los specs de registro y perfil irán a `docs/generated/specs/`. |
| Colaboración con agentes | **Improve** | Reglas de git claras, pero con una cobertura parcial en `settings.json` (F-04). Un solo agente basta; no se justifican subagentes. |

## 4. Hallazgos

| ID | Prioridad | Hallazgo | Evidencia | Impacto | Acción propuesta | Estado |
|---|---|---|---|---|---|---|
| F-01 | **P0** | `.gitignore` ignora todo directorio llamado `generated/`; eso incluye `docs/generated/`. Los documentos que generemos no se subirían a Git. | `.gitignore` línea 6 `generated/`; `git status --ignored` muestra `!! docs/generated/`. | Alto: se pierde la documentación al clonar; el commit "parece" correcto pero no incluye nada. | Cambiar la línea a `/src/generated/` (la carpeta que sí se quiso ignorar: cliente de Prisma). Es un cambio funcional, lo hace la usuaria o lo aprueba antes. | Confirmado |
| F-02 | **P1** | Las pruebas Playwright usan la base real: `npm run test:api` levanta `npm run dev` con `.env` (Supabase) y crea y borra (soft delete) datos reales. `CLAUDE.md` no lo advierte. | `playwright.config.ts` (`webServer.command: 'npm run dev'`); `README.md`, sección "Pruebas de API con Playwright". | Alto: un agente puede ejecutarlas sin saber que escriben en Supabase. | Añadir a `CLAUDE.md` una regla: no correr `npm run test:api` sin pedir permiso. Alternativa a evaluar más adelante: apuntarlas a una BD local de pruebas. | Confirmado |
| F-03 | **P1** | `CLAUDE.md` no lista comandos. Un agente tiene que deducirlos de `package.json`. | `CLAUDE.md` (sin sección de comandos); `package.json` scripts. | Medio: errores de ejecución y pruebas olvidadas. | Añadir una sección "Comandos" solo con los que existen (ver propuesta en §6). | Confirmado |
| F-04 | **P2** | El bloqueo de git de `settings.json` es parcial. `CLAUDE.md` prohíbe todo lo que modifique el repo, pero el `deny` no cubre, por ejemplo, `git restore`, `git clean`, `git revert`, `git cherry-pick`, `git tag`, `git apply`, `git config` ni `git worktree`. Además, todas son reglas `Bash(...)`. | `.claude/settings.json`; `CLAUDE.md`, sección Git. | Medio: la regla escrita es más fuerte que la que se hace cumplir. | Ampliar el `deny` con esos comandos y comprobar si el equipo usa también la herramienta de PowerShell. | Cobertura confirmada, efecto en PowerShell sin verificar |
| F-05 | **P2** | `tsc` solo revisa `src/` y no existe script de typecheck. Los tests, `services/`, `fixtures/`, `data/` y `utils/` (Playwright) quedan sin revisar por el compilador. | `tsconfig.json` (`include: ["src"]`, `exclude: ["tests"]`); `package.json` (sin script `typecheck`, sin `lint`). | Medio: errores de tipos en tests solo aparecen al ejecutarlos. | Con aprobación: script `typecheck` y un `tsconfig` adicional que incluya los tests. Es un cambio de configuración; no lo hace esta auditoría. | Confirmado |
| F-06 | **P2** | No hay reglas para el front (stack, carpeta, identidad, contrato de la API). | `CLAUDE.md` solo describe el backend. Decisiones de la usuaria: `frontend/`, React + Vite + TypeScript, escritorio primero, identidad de Crezia. | Medio: sin reglas, un agente podría inventar endpoints o pantallas. | Añadir una sección "Frontend" con lo decidido (ver §6). Cuando exista `frontend/`, añadir sus comandos reales. | Decisión recibida |
| F-07 | **P2** | El modo de pruebas de rendimiento no está en `CLAUDE.md`: `.env.perf`, `PERF_MODE`, `db:perf:reset` (con el backend detenido), el repo externo `Crezia_Performance`, y "nunca contra Supabase". | `package.json` (`dev:perf`, `db:perf:*`); `src/config/perfGuard.ts`; `.env.perf.example`. | Medio: esas reglas viven solo en la conversación. | Añadir una sección corta "Rendimiento" (ver §6). | Confirmado |
| F-08 | **P2** | La guía a mano tiene partes desfasadas: dice que existe "la única migración", no lista `src/config/`, `scripts/`, `prisma/seed.perf.ts` ni la migración de índices; los números de línea cambian con el código. El `README.md` no menciona el modo perf. | `docs/GUIA_DEL_CODIGO.md` §3 (mapa de carpetas); `prisma/migrations/` (2 migraciones); `grep perf README.md` sin resultados. | Bajo-medio: confunde a quien la usa como referencia. | Entregar a `backend-documentation` (parte 5) y mantener la guía a mano. No duplicar contenido en `CLAUDE.md`. | Confirmado |
| F-09 | **P2** | `CLAUDE.md` no explica `docs/generated/` ni la convivencia con `GUIA_DEL_CODIGO.md`. | `docs/generated/plan-skills.md` (sección 3, parte 5). | Bajo: un agente podría sobrescribir la guía. | Añadir una sección "Documentación" (ver §6). | Decisión recibida |
| F-10 | **P3** | Las convenciones del contrato (formato de errores, paginación por cabeceras, dinero en centavos) están en `README.md`, no en `CLAUDE.md`. | `README.md`, "Reglas importantes" y "Paginación…". | Bajo. | No duplicar: que `CLAUDE.md` apunte al `README.md` como fuente del contrato. | Propuesta |
| F-11 | **P3** | No hay CI, lint, formato ni hooks de pre-commit. | Sin `.github/`, `.eslintrc*`, `.prettierrc*`, `.editorconfig`, `.husky/`. | Bajo hoy; crece al sumar el front. | No crear nada ahora. Decidirlo cuando exista `frontend/`. | Informativo |
| F-12 | **P3** | `settings.json` solo tiene `deny`; no hay `allow` para comandos seguros de lectura (Vitest, `tsc`), así que cada uno pide permiso. | `.claude/settings.json`. | Bajo (comodidad). | Opcional: skill `fewer-permission-prompts` más adelante. | Informativo |

**Sin hallazgo (se conserva, Keep):**

- La regla "`domain` y `application` no importan Prisma ni Express" se cumple en una muestra: `grep` de `@prisma`, `express` y `generated/prisma` en esas dos carpetas no devuelve nada. Es una verificación de muestra, no una prueba de cumplimiento total.
- "Los casos de uso reciben los repositorios por constructor": confirmado en `src/infrastructure/container.ts`.
- La política de git de `CLAUDE.md` (solo `status`, `diff` y `log`; la usuaria hace commits y ramas) está clara y no se contradice con ningún otro documento revisado.
- No hay skills locales ni agentes propios: no hacen falta, y las 5 skills instaladas son globales.

## 5. Contradicciones, duplicados y referencias rotas

- **Contradicción parcial:** `CLAUDE.md` dice que solo se pueden usar `git status`, `git diff` y `git log`, mientras que el `deny` de `settings.json` solo bloquea una lista de comandos (F-04). Lo escrito es más estricto que lo que se hace cumplir.
- **Duplicado:** la `GUIA_DEL_CODIGO.md` y el `docs/generated/main.md` futuro se solaparán; la convivencia está definida en `docs/generated/plan-skills.md` (parte 5).
- **Referencia rota:** ninguna en `CLAUDE.md`. La guía a mano menciona ciertos números de línea que ya no coinciden (aviso añadido en su sección 5.1).
- **Autoridad desconocida:** `docs/db/crezia_schema_v2.sql` define RLS, y `prisma/schema.prisma` y la migración inicial dicen que no las incluyen. No se sabe cuál refleja Supabase; lo revisará la usuaria en Supabase (parte 6).

## 6. Cambios propuestos a `CLAUDE.md` (no aplicados)

Resumen:

1. Añadir "Comandos" (F-03).
2. Añadir "Seguridad con las pruebas" con la regla de Playwright (F-02).
3. Añadir "Rendimiento" (F-07).
4. Añadir "Documentación" (F-09, F-10).
5. Añadir "Frontend" (F-06).
6. Mantener intactas las secciones actuales.

**Archivo completo propuesto.** Las secciones existentes van tal cual; las nuevas están marcadas con `(NUEVA)` solo en este informe, no en el archivo.

```markdown
# Crezia API

## Idioma
- Responde SIEMPRE en español, aunque el código, los nombres y los commits estén en inglés.
- El código (variables, funciones, archivos, comentarios) va en inglés.
- Los mensajes de error que ve el usuario final van en español.

## Stack
- Node + TypeScript + Express 5, Clean Architecture básica.
- Prisma 7 con PostgreSQL en Supabase. La BD se maneja SOLO con migraciones.
- Vitest para pruebas, zod para validación, bcrypt + jsonwebtoken para login.
- El diseño de la BD está en docs/db/crezia_schema_v2.sql.

## Comandos
- `npm run dev`: servidor local (usa `.env`, es decir, la BD real).
- `npm test`: pruebas unitarias con Vitest.
- `npx tsc --noEmit`: revisión de tipos de `src/` (no revisa los tests).
- `npm run test:api`: pruebas de API con Playwright. Ver "Seguridad con las pruebas".
- `npm run db:migrate`, `npm run db:seed`: Prisma. Una migración nueva necesita mi aprobación.
- Rendimiento: ver la sección "Rendimiento".

## Reglas de arquitectura
- domain y application NO importan Prisma ni Express.
- Los casos de uso reciben los repositorios por constructor.
- DELETE es soft delete (deleted_at, deleted_by). Las consultas ignoran lo borrado.
- Cada usuario solo ve sus propios datos; recurso ajeno → 404.
- Saldos y progreso de metas se calculan en código, nunca se guardan.
- Progreso de meta: suma de movimientos Expense del usuario en la categoría de la meta, entre start_date y end_date, sin borrados.
- El contrato de la API (rutas, errores, paginación por cabeceras) está en README.md. No lo cambies sin avisarme.

## Seguridad con las pruebas
- `npm run test:api` (Playwright) usa la BD real del `.env`: crea y borra datos reales con el usuario del seed. NO la ejecutes sin preguntarme antes.

## Rendimiento
- Las pruebas k6 están en otro repo (C:\Users\ANYI\Desktop\Crezia_Performance). No lo modifiques salvo que lo pida.
- El backend de pruebas de carga corre con `npm run dev:perf` y la BD local `crezia_perf` (`.env.perf`). Nunca contra Supabase.
- `npm run db:perf:reset` solo con el backend detenido; después se reinicia una sola instancia.
- No bajes el coste de bcrypt ni debilites la seguridad para mejorar tiempos sin mi aprobación.

## Documentación
- `docs/GUIA_DEL_CODIGO.md` se mantiene a mano: no la borres ni la reemplaces.
- Lo generado con skills va en `docs/generated/`. No sobrescribas archivos existentes sin avisarme.
- Los documentos van en español; el código y los identificadores, en inglés.

## Frontend
- Va en `frontend/` dentro de este repo: React + Vite + TypeScript.
- Web responsive con enfoque en escritorio (menú lateral), adaptada a tablet y celular.
- Identidad de Crezia: turquesa, blanco, logo "C" con flecha, lema "Finanzas y Ahorro".
- Solo usa endpoints y pantallas que existan en el código o en los mockups aprobados. Si falta algo, pregunta.
- No construyas pantallas sin mi aprobación del diseño.

## Git
- Claude Code NO ejecuta comandos de git ni gh que modifiquen el repo: nada de branch, checkout, switch, add, commit, push, pull, fetch, merge, stash, rm, reset ni rebase.
- Solo puede usar git status, git diff y git log para revisar.
- Al terminar una fase, propone los commits con los comandos exactos (en PowerShell) y yo los ejecuto.
- Ramas: master (estable), develop (integración), feature/<nombre> por funcionalidad, saliendo de develop.
- Commits con Conventional Commits en inglés. Las pruebas de cada funcionalidad van en su misma rama.
- NUNCA se hace commit del .env.

## Seguridad con archivos
- Antes de borrar o mover archivos que NO estén en git, pregúntame primero.
- Después de mover un archivo, verifica que esté en el destino antes de borrar el origen.
- Nunca corras comandos que borren la BD (migrate reset, drop) sin mi confirmación.
```

Notas sobre ese texto:

- Todos los comandos están en `package.json`, salvo `npx tsc --noEmit`, que se deduce de `tsconfig.json` y no tiene script (F-05).
- No se añadieron comandos de lint ni de formato porque no existen.
- La sección "Frontend" recoge solo decisiones ya tomadas por la usuaria. Los comandos del front se añaden cuando exista `frontend/`.
- La primera regla de "Rendimiento" resume lo pedido en la sesión de rendimiento; confirma que quieres conservarla como regla permanente.

**Cambio propuesto en `.claude/settings.json`** (F-04, solo propuesta): añadir al `deny` `Bash(git restore:*)`, `Bash(git clean:*)`, `Bash(git revert:*)`, `Bash(git cherry-pick:*)`, `Bash(git tag:*)`, `Bash(git apply:*)`, `Bash(git config:*)` y `Bash(git worktree:*)`.

**Cambio propuesto en `.gitignore`** (F-01): reemplazar `generated/` por `/src/generated/`.

## 7. Plan de mejora (priorizado, sin destruir nada)

1. **F-01:** corregir `.gitignore` (antes de cualquier commit de documentación).
2. **F-02, F-03, F-07, F-09, F-06:** aplicar el `CLAUDE.md` propuesto (una sola edición, aprobada por ti).
3. **F-04:** ampliar el `deny` de `settings.json`.
4. **F-05:** script `typecheck` y `tsconfig` para tests (con tu aprobación).
5. **F-08:** actualizar la guía y el README en la parte 5 (`backend-documentation`).
6. **F-11, F-12:** diferidos.

## 8. Preguntas abiertas

1. ¿Corrijo yo `.gitignore` y `CLAUDE.md` o prefieres hacerlo tú? Esta auditoría no los modificó.
2. ¿La regla de rendimiento sobre bcrypt queda como regla permanente?
3. ¿Quieres que las pruebas de Playwright apunten a una BD local de pruebas? Evitaría el riesgo de F-02, pero implica configuración y datos nuevos (decisión aparte).
4. ¿Las compañeras también usan Claude Code en este repo? Importa para F-04 y para instalar las skills globales.

## 9. Traspasos a otras skills

| Tema | Skill | Parte del plan |
|---|---|---|
| Guía desfasada, índice de casos de uso | `backend-documentation` | 5 |
| Revisión del dato RLS y `.env` | `application-security-review` | 6 |
| Diagramas y despliegue | `architecture-documentation` | 7 |
| Reglas del front | `ui-ux-design-system` | 2 |

## 10. Verificaciones realizadas y no realizadas

**Realizadas:** lectura de las instrucciones y de la configuración listada en la sección 1; búsqueda de imports prohibidos en `src/domain` y `src/application`; comprobación de `git status --ignored` para F-01; comprobación de la ausencia de CI, lint y formato.

**No realizadas:** efecto del `deny` sobre la herramienta de PowerShell; ejecución de comandos (no se corrió nada); estado de Supabase; lectura de `.env` y `.env.perf`.
