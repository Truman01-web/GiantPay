/**
 * Typed placeholders for API modules whose features are routed but not yet
 * built (reports, developer platform, team, support, admin — see
 * docs/frontend-architecture.md phased plan). Each export documents the
 * intended shape so the real module can be written without redesigning the
 * API layer, but none are called by any page yet: those routes render a
 * `FeatureComingSoon` state instead of invoking unimplemented network
 * calls. Kept in one file until each feature lands, at which point it is
 * split into its own `services/api/<domain>.ts` (as settlements and
 * reconciliation already were — see services/api/settlements.ts and
 * services/api/reconciliation.ts, with real types in types/settlements.ts
 * and types/reconciliation.ts).
 */

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  environment: 'sandbox' | 'production';
  createdAt: string;
  lastUsedAt: string | null;
  status: 'ACTIVE' | 'REVOKED';
}

export interface WebhookEndpointSummary {
  id: string;
  url: string;
  enabled: boolean;
  events: string[];
  lastDeliveryAt: string | null;
  deliverySuccessRate: number;
}

export interface TeamMemberSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  mfaEnabled: boolean | null;
  lastLoginAt: string | null;
}

export interface SupportCaseSummary {
  id: string;
  reference: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}
