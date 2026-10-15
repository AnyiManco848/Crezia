// Ports implemented in infrastructure (bcrypt, JWT) and injected into use cases.

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface TokenPayload {
  userId: string;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  // Throws UnauthorizedError when the token is missing, malformed or expired.
  verify(token: string): TokenPayload;
}
