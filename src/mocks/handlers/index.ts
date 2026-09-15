import { authHandlers } from './auth';
import { paymentsHandlers } from './payments';
import { paymentLinksHandlers } from './paymentLinks';
import { refundsHandlers } from './refunds';
import { checkoutHandlers } from './checkout';
import { merchantsHandlers } from './merchants';
import { dashboardHandlers } from './dashboard';
import { settlementsHandlers } from './settlements';
import { reconciliationHandlers } from './reconciliation';
import { reportsHandlers } from './reports';
import { developersHandlers } from './developers';
import { teamHandlers } from './team';
import { adminHandlers } from './admin';
import { supportHandlers } from './support';

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...paymentLinksHandlers,
  ...refundsHandlers,
  ...checkoutHandlers,
  ...merchantsHandlers,
  ...dashboardHandlers,
  ...settlementsHandlers,
  ...reconciliationHandlers,
  ...reportsHandlers,
  ...developersHandlers,
  ...teamHandlers,
  ...adminHandlers,
  ...supportHandlers,
];
