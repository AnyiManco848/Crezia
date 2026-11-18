import { getApiUrl } from '../config';
import { sessionStore } from '../storage/sessionStore';
import { createHttpClient } from './client';

// The single HTTP client of the app. A 401 ends the session; the router then sends the user to the login.
export const http = createHttpClient({
  baseUrl: getApiUrl(),
  getToken: () => sessionStore.getState().session?.token ?? null,
  onUnauthorized: () => sessionStore.clear({ expired: true }),
});
