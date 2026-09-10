export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PageRequest {
  page: number;
  pageSize: number;
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  from: string; // ISO date
  to: string; // ISO date
  preset: DateRangePreset;
}

/** Discriminated union used for every list/detail query result presented in the UI. */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string; requestId?: string }
  | { status: 'empty' }
  | { status: 'ready'; data: T };
