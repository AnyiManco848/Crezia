import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: connection URLs live here, not in schema.prisma.
// The CLI (migrate, db seed) uses DIRECT_URL (session pooler, port 5432).
// The runtime client uses DATABASE_URL through the pg driver adapter.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
