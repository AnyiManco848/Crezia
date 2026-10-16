// Adds the authenticated user set by the auth middleware.
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export {};
