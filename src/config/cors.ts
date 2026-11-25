// CORS allowed origins, read from the CORS_ORIGINS environment variable. Pure functions so they can be tested
// without a server.

// Used when CORS_ORIGINS is not set: only the Vite dev server of the front (npm run dev in frontend/, and the
// Playwright E2E). Production must set CORS_ORIGINS explicitly (src/config/productionGuard.ts enforces it).
export const DEFAULT_CORS_ORIGINS: readonly string[] = ['http://localhost:5173', 'http://127.0.0.1:5173'];

// "https://app.example.com, https://www.example.com" -> ["https://app.example.com", "https://www.example.com"].
// An origin is scheme + host (+ port), nothing else: no path, no trailing slash (the browser never sends one in
// the Origin header, so "https://app.example.com/" would never match). Each value is normalised with URL.origin.
// "*" is rejected on purpose: the API answers with a bearer token in the Authorization header and must not be
// readable from any website.
export function parseCorsOrigins(raw: string | undefined): string[] {
  const value = raw?.trim() ?? '';
  if (value === '') return [...DEFAULT_CORS_ORIGINS];

  const origins: string[] = [];
  for (const item of value.split(',')) {
    const entry = item.trim();
    if (entry === '') continue; // tolerate "a,,b" and a trailing comma
    if (entry.includes('*')) {
      throw new Error(
        `CORS_ORIGINS no admite comodines ("${entry}"). Escribe cada origen completo, por ejemplo https://app.example.com.`,
      );
    }
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error(`CORS_ORIGINS tiene un valor que no es una URL: "${entry}". Usa el formato https://dominio[:puerto].`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`CORS_ORIGINS solo admite http o https ("${entry}").`);
    }
    if (url.pathname !== '/' || url.search !== '' || url.hash !== '' || url.username !== '') {
      throw new Error(`CORS_ORIGINS debe llevar solo el origen, sin ruta ni parámetros ("${entry}").`);
    }
    if (!origins.includes(url.origin)) origins.push(url.origin);
  }

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS no tiene ningún origen válido. Déjala sin definir para usar el valor de desarrollo.');
  }
  return origins;
}
