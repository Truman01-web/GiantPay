import { z } from 'zod';
import type { ReconciliationExceptionStatus } from '@/types/reconciliation';

/** Mirrors the backend's allowed transitions (see resetReconciliationMockState
 * / mocks/handlers/reconciliation.ts) — a UI affordance only. The backend
 * independently enforces this and is authoritative; an invalid transition
 * attempted anyway comes back as a normal 422 handled like any other. */
export const NEXT_STATUS_OPTIONS: Record<ReconciliationExceptionStatus, { value: ReconciliationExceptionStatus; label: string }[]> = {
  OPEN: [
    { value: 'INVESTIGATING', label: 'Start investigating' },
    { value: 'ESCALATED', label: 'Escalate' },
  ],
  INVESTIGATING: [
    { value: 'ACTION_REQUIRED', label: 'Mark action required' },
    { value: 'RESOLVED', label: 'Resolve' },
    { value: 'ESCALATED', label: 'Escalate' },
  ],
  ACTION_REQUIRED: [
    { value: 'RESOLVED', label: 'Resolve' },
    { value: 'ESCALATED', label: 'Escalate' },
  ],
  RESOLVED: [],
  ESCALATED: [{ value: 'INVESTIGATING', label: 'Reopen investigation' }],
};

const NOTE_REQUIRED_FOR: ReconciliationExceptionStatus[] = ['RESOLVED', 'ESCALATED'];

export const updateExceptionSchema = z
  .object({
    status: z.enum(['OPEN', 'INVESTIGATING', 'ACTION_REQUIRED', 'RESOLVED', 'ESCALATED']),
    note: z.string().max(2000),
  })
  .refine((v) => !NOTE_REQUIRED_FOR.includes(v.status) || v.note.trim().length >= 5, {
    error: 'Add a short note explaining this update',
    path: ['note'],
  });

export type UpdateExceptionFormValues = { status: ReconciliationExceptionStatus; note: string };
