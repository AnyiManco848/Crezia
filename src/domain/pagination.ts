// Offset pagination shared by every list repository.
export interface Pagination {
  skip: number;
  take: number;
}

export interface Page<T> {
  data: T[];
  // Matching rows before pagination.
  total: number;
}
