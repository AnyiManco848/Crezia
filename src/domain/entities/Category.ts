// System categories have userId null and are read-only for every user.
export interface Category {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function isSystemCategory(category: Category): boolean {
  return category.userId === null;
}
