import { describe, expect, it } from 'vitest';
import { decideRefundState } from './refundDecision.js';

describe('maker-checker refund decisions', () => {
  const pending = { status: 'PENDING_APPROVAL', requested_by: 'maker' };

  it('records an independent approver', () => {
    expect(decideRefundState(pending, 'checker', 'APPROVE')).toEqual({ status: 'APPROVED', approvedBy: 'checker', decidedBy: 'checker' });
  });

  it('records a rejector without calling them an approver', () => {
    expect(decideRefundState(pending, 'checker', 'REJECT')).toEqual({ status: 'REJECTED', approvedBy: null, decidedBy: 'checker' });
  });

  it('blocks self-approval', () => {
    expect(() => decideRefundState(pending, 'maker', 'APPROVE')).toThrow(/requester cannot/i);
  });

  it('blocks a second decision', () => {
    expect(() => decideRefundState({ ...pending, status: 'APPROVED' }, 'other', 'REJECT')).toThrow(/already been decided/i);
  });
});
