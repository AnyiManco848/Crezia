// Authorization header for a token; without a token no header is sent (used by the 401 cases).
export function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
