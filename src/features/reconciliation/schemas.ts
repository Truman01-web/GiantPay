import { z } from 'zod';
import type { ReconciliationExceptionStatus } from '@/types/reconciliation';

/** Mirrors the backend's allowed transitions (see resetReconciliationMockState
 * / mocks/handlers/reconciliation.ts) — a UI affordance only. The backend
 * independently enforces this and is authoritative; an invalid transition
 * attempted anyway comes back as a normal 422 handled like any other. */
export const NEXT_STATUS_OPTIONS: Record<ReconciliationExceptionStatus, { value: ReconciliationExceptionStatus; label: string }[]> = {
  OPEN: [{ value: 'UNDER_REVIEW', label: 'Start review' }],
  UNDER_REVIEW: [
    { value: 'RESOLVED', label: 'Resolve' },
    { value: 'DISMISSED', label: 'Dismiss' },
  ],
  RESOLVED: [],
  DISMISSED: [],
};

const NOTE_REQUIRED_FOR: ReconciliationExceptionStatus[] = ['RESOLVED', 'DISMISSED'];

export const updateExceptionSchema = z
  .object({
    status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
    note: z.string().max(2000),
    evidenceRef: z.string().max(200).optional(),
  })
  .refine((v) => !NOTE_REQUIRED_FOR.includes(v.status) || v.note.trim().length >= 5, {
    error: 'Add a short note explaining this update',
    path: ['note'],
  })
  .refine((v) => !NOTE_REQUIRED_FOR.includes(v.status) || (v.evidenceRef?.trim().length ?? 0) >= 3, {
    error: 'Add an evidence reference for a terminal decision',
    path: ['evidenceRef'],
  });

export type UpdateExceptionFormValues = z.infer<typeof updateExceptionSchema>;
