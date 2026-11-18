const DEFAULT_API_URL = 'http://localhost:3000';

// Base URL of the API, from VITE_API_URL, without a trailing slash.
export function getApiUrl(raw: string | undefined = import.meta.env.VITE_API_URL): string {
  return (raw?.trim() || DEFAULT_API_URL).replace(/\/+$/, '');
}
