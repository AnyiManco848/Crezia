import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(__dirname, '../../scripts/refuse-in-production.cjs');

function run(nodeEnv: string | undefined) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (nodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = nodeEnv;
  return spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
}

// Guard of "npm run db:migrate" (prisma migrate dev) and "npm run db:seed": they must not run in production.
describe('scripts/refuse-in-production.cjs', () => {
  it('refuses with NODE_ENV=production and points to db:deploy', () => {
    const result = run('production');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('db:deploy');
  });

  it.each([undefined, 'development', 'test'])('lets it through with NODE_ENV=%s', (nodeEnv) => {
    expect(run(nodeEnv).status).toBe(0);
  });
});
