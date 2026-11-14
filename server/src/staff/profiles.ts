export const STAFF_DOMAIN='giantplus-mw.com';
export const STAFF_PROFILES={
  COMPLIANCE:['compliance:read','compliance:review','compliance:approve'],
  SUPPORT:['platform.support.read','platform.support.reply','platform.support.manage','platform.support.assign','platform.merchants.read','platform.transactions.read'],
  FINANCE:['platform.settlements.read','platform.reconciliation.read','platform.refunds.read','admin.refunds:approve','settlements:read','settlements:manage','settlements:approve','reconciliation:read','reconciliation:manage','reconciliation:approve','ledger:read','ledger:integrity','reports:read','reports:export'],
  OPERATIONS:['platform.operations.read','platform.health.read','platform.incidents.read','platform.incidents.manage','platform.controls.read','platform.controls.propose','platform.controls.approve','platform.metrics.read','platform.disputes.read','platform.disputes.assign','platform.disputes.investigate','platform.disputes.decide','platform.disputes.reopen','platform.disputes.request_information','platform.notifications.read','platform.notifications.templates.read','platform.notifications.delivery.read','platform.notifications.delivery.retry'],
  SECURITY_ADMIN:['platform.staff.read','platform.staff.manage','platform.audit.read','platform.sessions.manage'],
} as const;
export type StaffProfile=keyof typeof STAFF_PROFILES;
export const isExactStaffEmail=(email:string)=>/^[^@\s]+@giantplus-mw[.]com$/i.test(email.trim());
