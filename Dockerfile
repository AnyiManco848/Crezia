# Crezia API image (Railway builds it from this file). Multi-stage: the final image has only the compiled code,
# the production dependencies and the Prisma migrations. No secrets are copied or baked in: the configuration
# (DATABASE_URL, JWT_SECRET, ...) is injected as environment variables when the container starts.
# Build context = repository root (the front end is excluded by .dockerignore: it is deployed separately, on Vercel).

ARG NODE_VERSION=22

# ---------- 1. Build: all dependencies, Prisma client and TypeScript compilation ----------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# prisma.config.ts and the schema are needed by "prisma generate" (npm's postinstall).
COPY prisma.config.ts ./
COPY prisma ./prisma
# DIRECT_URL is only read by Prisma to build its config; "generate" never connects. A dummy value, not a secret.
RUN DIRECT_URL="postgresql://build:build@localhost:5432/build" npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- 2. Production dependencies only ----------
FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN DIRECT_URL="postgresql://build:build@localhost:5432/build" npm ci --omit=dev

# ---------- 3. Local tools (docker-compose only: seed with tsx). NOT the production image. ----------
FROM build AS tools
COPY scripts ./scripts

# ---------- 4. Runtime (this is the stage Railway uses: the last one in the file) ----------
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
