import { api, type RequestOptions } from './client';

export type PlatformRecord = Record<string, unknown>;

export const platformApi = {
  get: (path: string, options?: RequestOptions) => api.get<unknown>(path, options),
};
