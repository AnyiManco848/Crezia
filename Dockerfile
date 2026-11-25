# Crezia API image (Railway builds it from this file). Multi-stage: the final image has only the compiled code,
# the production dependencies and the Prisma migrations. No secrets are copied or baked in: the configuration
# (DATABASE_URL, JWT_SECRET, ...) is injected as environment variables when the container starts.
# Build context = repository root (the front end is excluded by .dockerignore: it is deployed separately, on Vercel).

ARG NODE_VERSION=22

# ---------- 0. Shared base of the build stages (never shipped) ----------
# Everything that runs "prisma generate" (npm ci's postinstall and "npm run build") needs DIRECT_URL, because prisma.config.ts
# reads it with env(): without it the build fails with PrismaConfigEnvError. "generate" never connects, so these are DUMMY
# values (user "build", password "build", host localhost), not secrets. They live ONLY in this base and in the stages built
# on it (build, prod-deps, tools); the runtime image does not derive from it and gets the real ones when the container starts.
FROM node:${NODE_VERSION}-bookworm-slim AS prisma-base
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
WORKDIR /app
COPY package.json package-lock.json ./
# prisma.config.ts and the schema are needed by "prisma generate" (npm's postinstall).
COPY prisma.config.ts ./
COPY prisma ./prisma

# ---------- 1. Build: all dependencies, Prisma client and TypeScript compilation ----------
FROM prisma-base AS build
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- 2. Production dependencies only ----------
FROM prisma-base AS prod-deps
RUN npm ci --omit=dev

# ---------- 3. Local tools (docker-compose only: seed with tsx). NOT the production image. ----------
FROM build AS tools
# The dummy build values must not look like a database: empty them so the seed only runs with the URLs the compose file gives.
ENV DIRECT_URL="" DATABASE_URL=""
COPY scripts ./scripts

# ---------- 4. Runtime: the API, ready for production ----------
# It MUST stay the LAST stage of the file: "docker build ." and Railway (no target set) build the last stage, so the image
# you get without naming a target is this one, with its HEALTHCHECK and the unprivileged "node" user. The compose file names
# targets explicitly (runtime, tools). Railway ignores the Docker HEALTHCHECK and uses its own health check setting
# (path /api/health in the service settings, see docs/despliegue.md).
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json prisma.config.ts ./
# Migrations: applied with "npm run db:deploy" (prisma migrate deploy) before each deploy, see README.
COPY prisma ./prisma
COPY scripts/refuse-in-production.cjs ./scripts/refuse-in-production.cjs
# The "node" user already exists in the official image: the app never runs as root.
USER node
# Railway injects PORT; 3000 when it is not set. EXPOSE is only documentation.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
