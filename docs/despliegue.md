# Despliegue: lista de verificación y prueba del flujo principal

Complementa la sección "Despliegue" del [`README.md`](../README.md) (variables, Docker, migraciones, Vercel). Este documento es lo que se revisa **antes** de desplegar y lo que se prueba **después**.

Plan: API en **Railway** (con `Dockerfile`), front en **Vercel**, base de datos en **Supabase**. Nada de esto está desplegado todavía.

> Quien ejecuta los pasos contra Supabase, Railway y Vercel eres tú. Los ajustes de sus paneles marcados con ⚠ **no se han comprobado**: confirma en el panel que existen con ese nombre.

## 1. Antes de desplegar

### Secretos

- [ ] **Ningún `.env` en git.** En la raíz: `git ls-files | Select-String "\.env"` debe listar solo los `*.example`. Si alguna vez se subió un `.env` con credenciales reales, hay que **cambiar** esas credenciales (contraseña de la base en Supabase y `JWT_SECRET`), no basta con borrar el archivo.
- [ ] **`JWT_SECRET` fuerte y propio de producción:** al menos 32 caracteres aleatorios (la API se niega a arrancar con menos, o con un valor de ejemplo). Genera uno y guárdalo **solo** en Railway:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Distinto del de desarrollo y del de pruebas. Cambiarlo más adelante cierra todas las sesiones.
- [ ] **Contraseña de la base de Supabase** guardada solo en las variables de Railway (`DATABASE_URL`, `DIRECT_URL`). No en el repositorio, no en el chat, no en capturas.
- [ ] **Sin `TEST_MODE`, `PERF_MODE`, `PERF_*`, `E2E_*` ni `REGISTER_RATE_LIMIT_*` ni `LOGIN_RATE_LIMIT_*`** entre las variables de Railway (tabla del README). La API lo comprueba al arrancar y se niega si los encuentra.
- [ ] **Usuario de prueba del seed:** `prisma/seed.ts` crea `test@crezia.com` con una contraseña conocida (está en el README). Si el seed ya se corrió contra la base real de Supabase, **ese usuario existe en producción**: decide si lo borras o le cambias la contraseña antes de abrir la API a internet. Hazlo tú, en Supabase.

### Base de datos (Supabase)

- [ ] **Copia de seguridad antes de migrar.** Comprueba en Supabase (Database → Backups) qué copias automáticas tiene tu plan y ⚠ si puedes restaurarlas; no des por hecho que existen. Una copia propia, desde tu equipo (necesita `pg_dump` instalado; ⚠ comprueba que la conexión de sesión de Supabase la admite o usa la conexión directa de tu proyecto):
  ```powershell
  # Con la DIRECT_URL de producción puesta SOLO en tu sesión de PowerShell, no en un archivo
  pg_dump $env:DIRECT_URL --format=custom --file="crezia-antes-de-migrar-AAAAMMDD.dump"
  ```
  Guarda el archivo fuera del repositorio. Prueba que se puede restaurar en la base **local** de Docker, nunca encima de Supabase.
- [ ] **Estado de las migraciones.** Con la `DIRECT_URL` de producción en tu sesión, `npx prisma migrate status` (solo lee) dice cuáles están pendientes. Hoy el repositorio trae `20261014000000_init` y `20261115000000_add_list_pagination_indexes`. Lee las pendientes antes de aplicarlas.
- [ ] **Catálogos presentes:** la base debe tener las monedas `COP` y `USD` (sin ellas el registro falla) y las categorías del sistema. Solo se cargan con el seed, que **no debe correrse en producción** por el usuario de prueba. Si es una base nueva, hay que cargar esos datos de otra forma (propuesta pendiente: un seed solo de catálogos, o una migración de datos). Consulta de comprobación (solo lee):
  ```sql
  select code from currency;
  select name from categories where user_id is null and deleted_at is null;
  ```
- [ ] **RLS (seguridad por filas) en Supabase — tu parte.** La API se conecta como rol de base de datos por el pooler, así que RLS no la afecta. Pero Supabase expone además su API REST (PostgREST) con una clave pública (`anon`): una tabla del esquema `public` **sin RLS** puede leerse con esa clave si alguien conoce la URL y la clave del proyecto. Opciones: activar RLS en todas las tablas sin definir políticas (nadie accede por la API REST; la API de Crezia sigue funcionando), o desactivar la Data API del proyecto. Revísalo en Supabase (Advisors → Security) y decide. Como la base se maneja **solo con migraciones**, lo coherente es que activar RLS sea una migración del repositorio; no la he escrito, no está pedida: dímelo y la preparo.
- [ ] **Conexiones:** `DATABASE_URL` por el pooler de transacciones (6543, `pgbouncer=true`); `DIRECT_URL` por el de sesión (5432). El pool de la API es de 10 conexiones por proceso.

### Código y construcción

- [ ] `npm test` en la raíz y `npm test` + `npm run typecheck` + `npm run lint` en `frontend/` en verde.
- [ ] `docker build --target runtime -t crezia-api .` termina sin errores y `docker compose up --build` deja la API respondiendo en `http://localhost:3000/api/health` (se probó por partes sin Docker, ver "No verificado" abajo).
- [ ] Build del front con la URL real: `$env:VITE_API_URL="https://tu-api.up.railway.app"; npm run build` en `frontend/` termina bien y `dist/index.html` no menciona localhost.

### Railway (⚠ comprueba cada ajuste en el panel)

- [ ] Servicio creado desde el repositorio de GitHub, directorio raíz = la raíz del repositorio, constructor = `Dockerfile` (Settings → Build).
- [ ] Variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGINS`, `TRUST_PROXY` (ver README). **Sin** `PORT` propia.
- [ ] Comando previo al despliegue (Pre-deploy Command): `npm run db:deploy`.
- [ ] Healthcheck Path: `/api/health`.
- [ ] Dominio público generado (Settings → Networking) y la URL anotada.

### Vercel (⚠ comprueba cada ajuste en el panel)

- [ ] Proyecto importado del repositorio con Root Directory = `frontend`, preset Vite, build `npm run build`, salida `dist`.
- [ ] Variable `VITE_API_URL` = URL https de la API de Railway, **antes** del primer build. Sin `VITE_ALLOW_LOCAL_API`.

## 2. Orden recomendado

El front necesita la URL de la API y la API necesita la URL del front (CORS). Se resuelve así:

1. Copia de seguridad de la base (arriba).
2. Railway: crea el servicio con las variables. Pon en `CORS_ORIGINS` un valor provisional **https** (por ejemplo `https://pendiente.example.com`; la API no acepta localhost en producción ni la variable vacía). Despliega: el comando previo aplica las migraciones y arranca la API.
3. Comprueba `https://tu-api.up.railway.app/api/health` → `{"status":"ok"}`.
4. Vercel: define `VITE_API_URL` con esa URL y despliega. Anota la URL del front.
5. Railway: cambia `CORS_ORIGINS` a la URL del front de Vercel (sin barra final) y vuelve a desplegar.
6. Prueba de `TRUST_PROXY` (README, "Proxy y límite de intentos").
7. Prueba del flujo principal (abajo).

Con dominio propio para cada pieza, los pasos 2 y 4 no necesitan valores provisionales.

## 3. Probar lo desplegado con el flujo principal

Esta prueba **crea datos reales** en la base de producción. Usa una cuenta claramente de prueba (por ejemplo `prueba-despliegue@tu-dominio.com`, identificación `PRUEBA001`) y, al terminar, bórrala tú en Supabase (la API no tiene un endpoint para borrar usuarios).

### 3.1 Desde la terminal (la API sola)

```powershell
$api = "https://tu-api.up.railway.app"
$front = "https://tu-proyecto.vercel.app"

# Salud
curl.exe -s "$api/api/health"                                   # {"status":"ok"}

# CORS: el origen del front debe aparecer en la respuesta; otro origen, no
curl.exe -s -i -H "Origin: $front" "$api/api/health" | Select-String "access-control-allow-origin"
curl.exe -s -i -H "Origin: https://otro.example.com" "$api/api/health" | Select-String "access-control-allow-origin"   # sin resultado

# Cabeceras de seguridad de helmet
curl.exe -s -i "$api/api/health" | Select-String "content-security-policy|x-content-type-options|strict-transport-security|x-powered-by"   # x-powered-by no debe salir
```

### 3.2 Desde el navegador (el flujo completo)

Abre la URL del front con las herramientas de desarrollo (pestañas **Consola** y **Red**) a la vista. Durante todo el flujo no debe aparecer ningún error de CORS ni de Content-Security-Policy.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Entra a `/registro` y crea la cuenta de prueba. | La petición `POST /api/auth/register` responde **201** y llega al **Panel** con la sesión iniciada, sin datos. |
| 2 | Cierra sesión (menú de usuario) e inicia sesión con esa cuenta. **Escribe el correo en minúsculas** (el login distingue mayúsculas: decisión D-4 pendiente). | `POST /api/auth/login` responde **200** y entra al Panel. |
| 3 | `/cuentas` → **Nueva cuenta** (banco, tipo, moneda COP). | La cuenta aparece con saldo `$ 0`. |
| 4 | `/movimientos` → **Nuevo movimiento**: un ingreso de 1.000.000 y un gasto de 85.000 asociado a la cuenta. | Ambos aparecen en la lista y el saldo de la cuenta pasa a `$ 915.000`. |
| 5 | **Panel:** periodo "Este mes". | Ingresos 1.000.000, egresos 85.000, balance 915.000. |
| 6 | `/categorias` → crea una categoría ("Ahorro de prueba"). `/metas` → **Nueva meta** con esa categoría, objetivo 200.000, fechas que incluyan hoy. | La meta aparece al 0 %. |
| 7 | Registra un gasto de 50.000 en esa categoría. | La meta pasa al 25 %: `$ 50.000 de $ 200.000`. |
| 8 | **Recarga la página** estando en `/metas` y en `/movimientos`. | Se vuelve a mostrar la pantalla (sin 404): funciona la reescritura de `vercel.json`. |
| 9 | Elimina el movimiento de prueba, la meta, la categoría y la cuenta. | Desaparecen de las listas (borrado lógico). |
| 10 | Abre `/registro` con la sesión iniciada. | Te lleva al Panel. |

No pruebes el límite del registro (429) en producción salvo que sea la prueba de `TRUST_PROXY`: bloquea tu IP 15 minutos.

### 3.3 Qué mirar en los logs de Railway

- Sin avisos `ERR_ERL_*` (límite de intentos y `TRUST_PROXY`).
- Sin avisos `Aviso: TRUST_PROXY no está definida` ni errores `Configuración no válida para producción`.
- Sin errores de Prisma al conectar.

## 4. Si algo sale mal

- **Falló el comando previo (migración):** el despliegue no continúa y sigue sirviendo la versión anterior. Revisa el mensaje de Prisma; no repitas a ciegas.
- **Falló la API después de desplegar:** en Railway, vuelve a desplegar el despliegue anterior (⚠ comprueba que el panel lo ofrece). Eso **no** deshace migraciones ya aplicadas: si una migración dañó datos, la recuperación es la copia de seguridad.
- **El front no llega a la API:** casi siempre es `CORS_ORIGINS` (URL distinta, barra final, `http` en vez de `https`) o un `VITE_API_URL` equivocado (hay que volver a construir el front al cambiarlo).
- **Las vistas previas de Vercel (URL por rama) no funcionan:** esperado, su origen no está en `CORS_ORIGINS`.

## 5. No verificado en esta preparación

- La imagen Docker y el `docker-compose.yml` **no se construyeron ni se ejecutaron** (el motor de Docker estaba apagado). Se comprobó por partes: `docker compose config` resuelve solo a la base local; las etapas del `Dockerfile` se reprodujeron con npm en una carpeta limpia (instalación, compilación, dependencias de producción, arranque y `prisma migrate deploy` contra una base inexistente).
- Nada de lo que aparece en los paneles de Railway y Vercel (nombres de ajustes, detección del `Dockerfile`, comando previo, healthcheck, valor de `TRUST_PROXY`, reescrituras y cabeceras de `vercel.json`).
- Ninguna migración ni consulta se ejecutó contra Supabase.
