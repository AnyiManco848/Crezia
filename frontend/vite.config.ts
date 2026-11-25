import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { buildCsp, resolveApiOrigin } from './src/build/csp';

// Injects the Content-Security-Policy <meta> (see src/build/csp.ts). The API origin comes from VITE_API_URL at build
// time: in a production build it is required, must be https and cannot be localhost.
function cspPlugin(apiOrigin: string): Plugin {
  return {
    name: 'crezia-csp',
    transformIndexHtml(_html, ctx) {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: buildCsp({ apiOrigin, dev: Boolean(ctx.server) }) },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiOrigin = resolveApiOrigin(env.VITE_API_URL, {
    production: command === 'build',
    allowLocal: env.VITE_ALLOW_LOCAL_API === 'true',
  });

  return {
    plugins: [react(), cspPlugin(apiOrigin)],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
      },
    },
  };
});
