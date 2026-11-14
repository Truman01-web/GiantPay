export interface BackendPage<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  nextCursor?: string | null;
}

export function itemsPage<T>(page: BackendPage<T>): { items: T[]; total: number; nextCursor?: string | null } {
  return {
    items: page.data,
    total: page.total ?? page.data.length,
    ...(page.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
  };
}
