export type RefundDecision = 'APPROVE' | 'REJECT';

export interface PendingRefund {
  status: string;
  requested_by: string;
}

export class RefundDecisionError extends Error {
  constructor(
    public readonly code: 'ALREADY_DECIDED' | 'MAKER_CHECKER_VIOLATION',
    public readonly statusCode: 403 | 409,
    message: string,
  ) {
    super(message);
  }
}

export function decideRefundState(refund: PendingRefund, actorId: string, decision: RefundDecision) {
  if (refund.status !== 'PENDING_APPROVAL') {
    throw new RefundDecisionError('ALREADY_DECIDED', 409, 'This refund has already been decided.');
  }
  if (refund.requested_by === actorId) {
    throw new RefundDecisionError('MAKER_CHECKER_VIOLATION', 403, 'The requester cannot decide their own refund.');
  }
  const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  return { status, approvedBy: decision === 'APPROVE' ? actorId : null, decidedBy: actorId } as const;
}
