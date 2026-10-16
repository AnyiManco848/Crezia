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

## Reglas de arquitectura
- domain y application NO importan Prisma ni Express.
- Los casos de uso reciben los repositorios por constructor.
- DELETE es soft delete (deleted_at, deleted_by). Las consultas ignoran lo borrado.
- Cada usuario solo ve sus propios datos; recurso ajeno → 404.
- Saldos y progreso de metas se calculan en código, nunca se guardan.
- Progreso de meta: suma de movimientos Expense del usuario en la categoría de la meta, entre start_date y end_date, sin borrados.

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
