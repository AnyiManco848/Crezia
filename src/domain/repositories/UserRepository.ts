import type { NewUser, User, UserWithCredentials } from '../entities/User';

export interface UserRepository {
  // Ignores soft-deleted users.
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;

  // True when a non-deleted user already has that email (compared ignoring case) or that document id.
  existsByEmailOrDocumentId(email: string, documentId: string): Promise<boolean>;

  // Creates a user with role `User`. Throws UserAlreadyExistsError if the database rejects a repeated
  // email or document id (two registrations racing each other).
  create(data: NewUser): Promise<User>;
}
