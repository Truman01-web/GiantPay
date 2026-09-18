import type { Settlement, SettlementListItem } from '@/types/settlements';

export const MOCK_SETTLEMENTS: Settlement[] = [{ id: 'stl_sandbox_01', currency: 'MWK', periodStart: '2026-01-01T00:00:00.000Z', periodEnd: '2026-01-02T00:00:00.000Z', status: 'APPROVED', grossMinor: '1000000', refundsMinor: '50000', feesMinor: '25000', netMinor: '925000', createdAt: '2026-01-02T01:00:00.000Z', approvedAt: '2026-01-02T02:00:00.000Z', exportedAt: null, externalTransferExecuted: false, sandboxOnly: true }];

export function toSettlementListItem(batch: Settlement): SettlementListItem { return batch; }
