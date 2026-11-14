import {createBrowserRouter} from 'react-router-dom';
import {AuthLayout} from '@/layouts/AuthLayout';
import {AdminLayout} from '@/layouts/AdminLayout';
import {RequireAuth,RequirePermission,RequirePlatformAdmin,RedirectIfAuthenticated} from './guards';
import {LoginPage,NotFoundPage,AdminSupportPage,AdminSupportDetailPage,AdminHomePage,MerchantApplicationsListPage,MerchantApplicationDetailPage,AdminMerchantsPage,AdminMerchantDetailPage,AdminTransactionsPage,AdminTransactionDetailPage,AdminRefundsPage,PendingRefundApprovalsPage,AdminSettlementsPage,AdminReconciliationPage,AdminExceptionsPage,AdminExceptionDetailPage,AdminProvidersPage,AdminUsersPage,AdminRolesPage,AuditLogsPage,AdminIncidentsPage,AdminSecurityPage,AdminReportsPage,SystemHealthPage,AdminSettingsPage} from './staffLazyPages';
import type {Permission} from '@/types/auth';

const protectedPage=(permission:Permission,element:React.ReactNode)=><RequirePermission permission={permission}>{element}</RequirePermission>;
export const router=createBrowserRouter([
 {element:<AuthLayout/>,children:[{path:'/login',element:<RedirectIfAuthenticated><LoginPage/></RedirectIfAuthenticated>}]},
 {element:<RequireAuth><RequirePlatformAdmin><AdminLayout/></RequirePlatformAdmin></RequireAuth>,children:[
  {path:'/admin',element:<RequirePermission anyOf={['platform.health.read','platform.operations.read']}><AdminHomePage/></RequirePermission>},
  {path:'/admin/support',element:protectedPage('platform.support.read',<AdminSupportPage/>)},{path:'/admin/support/:id',element:protectedPage('platform.support.read',<AdminSupportDetailPage/>)},
  {path:'/admin/merchant-applications',element:protectedPage('compliance:read',<MerchantApplicationsListPage/>)},{path:'/admin/merchant-applications/:id',element:protectedPage('compliance:read',<MerchantApplicationDetailPage/>)},
  {path:'/admin/merchants',element:protectedPage('platform.merchants.read',<AdminMerchantsPage/>)},{path:'/admin/merchants/:id',element:protectedPage('platform.merchants.read',<AdminMerchantDetailPage/>)},
  {path:'/admin/transactions',element:protectedPage('platform.transactions.read',<AdminTransactionsPage/>)},{path:'/admin/transactions/:id',element:protectedPage('platform.transactions.read',<AdminTransactionDetailPage/>)},
  {path:'/admin/refunds',element:protectedPage('platform.refunds.read',<AdminRefundsPage/>)},{path:'/admin/refunds/pending',element:protectedPage('admin.refunds:approve',<PendingRefundApprovalsPage/>)},
  {path:'/admin/settlements',element:protectedPage('platform.settlements.read',<AdminSettlementsPage/>)},{path:'/admin/reconciliation',element:protectedPage('platform.reconciliation.read',<AdminReconciliationPage/>)},
  {path:'/admin/exceptions',element:protectedPage('platform.reconciliation.read',<AdminExceptionsPage/>)},{path:'/admin/exceptions/:id',element:protectedPage('platform.reconciliation.read',<AdminExceptionDetailPage/>)},
  {path:'/admin/providers',element:protectedPage('platform.operations.read',<AdminProvidersPage/>)},{path:'/admin/users',element:protectedPage('platform.staff.read',<AdminUsersPage/>)},{path:'/admin/roles',element:protectedPage('platform.staff.read',<AdminRolesPage/>)},
  {path:'/admin/audit-logs',element:protectedPage('platform.audit.read',<AuditLogsPage/>)},{path:'/admin/incidents',element:protectedPage('platform.incidents.read',<AdminIncidentsPage/>)},{path:'/admin/security',element:protectedPage('platform.controls.read',<AdminSecurityPage/>)},
  {path:'/admin/reports',element:protectedPage('platform.metrics.read',<AdminReportsPage/>)},{path:'/admin/system-health',element:protectedPage('platform.health.read',<SystemHealthPage/>)},{path:'/admin/settings',element:protectedPage('platform.operations.read',<AdminSettingsPage/>)}
 ]},{path:'*',element:<NotFoundPage/>}
]);
