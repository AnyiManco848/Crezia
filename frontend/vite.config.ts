import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const DEFAULT_API_URL = 'http://localhost:3000';

// Builds the Content-Security-Policy <meta>. The build policy is strict (no inline scripts, no eval).
// The dev policy is looser only because Vite needs it: the React Refresh preamble is an inline script,
// Vite injects CSS through <style> tags, and HMR talks over a WebSocket.
function cspPlugin(apiUrl: string): Plugin {
  const apiOrigin = new URL(apiUrl).origin;

  return {
    name: 'crezia-csp',
    transformIndexHtml(_html, ctx) {
      const dev = Boolean(ctx.server);
      const policy = [
        "default-src 'self'",
        dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
        dev
          ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
          : "style-src 'self' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        `connect-src 'self' ${apiOrigin}${dev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');

      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), cspPlugin(env.VITE_API_URL || DEFAULT_API_URL)],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
