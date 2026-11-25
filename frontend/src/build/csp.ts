// Build-time helpers for vite.config.ts: which API the build talks to and the Content-Security-Policy that goes with
// it. Kept out of vite.config.ts so they can be unit tested. Not imported by the app code (nothing here ships in the
// bundle).

export const DEFAULT_API_URL = 'http://localhost:3000';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export interface ApiOriginOptions {
  // true for "vite build" (what Vercel runs), false for the dev server.
  production: boolean;
  // VITE_ALLOW_LOCAL_API=true: lets a production build point at a local API, only to try "npm run build && npm run
  // preview" on your machine. Never set it on Vercel.
  allowLocal?: boolean;
}

// The origin (scheme + host + port) the policy lets the page call. In development: VITE_API_URL or localhost:3000.
// In a production build VITE_API_URL is REQUIRED and must be https and not local: a build that silently falls back to
// localhost would ship a front end that cannot reach the API (and a policy that allows localhost).
export function resolveApiOrigin(raw: string | undefined, { production, allowLocal = false }: ApiOriginOptions): string {
  const value = raw?.trim() ?? '';
  if (!production) return new URL(value || DEFAULT_API_URL).origin;

  if (value === '') {
    throw new Error('Falta VITE_API_URL en el build de producción (la URL https de la API, por ejemplo https://api.crezia.com).');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`VITE_API_URL no es una URL válida: "${value}".`);
  }
  if (allowLocal) return url.origin;
  if (LOCAL_HOSTS.includes(url.hostname)) {
    throw new Error(
      `VITE_API_URL apunta a ${url.hostname}: en producción debe ser la URL pública de la API. (Para probar el build en tu equipo: VITE_ALLOW_LOCAL_API=true.)`,
    );
  }
  if (url.protocol !== 'https:') {
    throw new Error(`VITE_API_URL debe usar https en producción ("${value}").`);
  }
  return url.origin;
}

// The policy of the <meta> tag. The build policy is strict (no inline scripts, no eval, API origin only). The dev
// policy is looser only because Vite needs it: the React Refresh preamble is an inline script, Vite injects CSS
// through <style> tags, and HMR talks over a WebSocket.
// "frame-ancestors" is ignored in a <meta> tag: the real header is set in vercel.json.
export function buildCsp({ apiOrigin, dev }: { apiOrigin: string; dev: boolean }): string {
  return [
    "default-src 'self'",
    dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    dev ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" : "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self' ${apiOrigin}${dev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
