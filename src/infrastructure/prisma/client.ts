import { PrismaPg } from '@prisma/adapter-pg';
import { poolConfigFromEnv } from '../../config/dbPool';
import { PrismaClient } from '../../generated/prisma/client';

// Runtime connection goes through the Supabase transaction pooler (DATABASE_URL).
// Pool size and connection wait come from DB_POOL_MAX and DB_POOL_CONNECTION_TIMEOUT_MS (see config/dbPool.ts).
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, ...poolConfigFromEnv() }) });
}
