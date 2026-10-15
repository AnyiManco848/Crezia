import type { UserWithCredentials } from '../entities/User';

export interface UserRepository {
  // Ignores soft-deleted users.
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;
}
