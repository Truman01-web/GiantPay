import argon2 from 'argon2';
import { createDb } from './db.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const db = createDb(config.DATABASE_URL);
const permissions = [
  'payments:read', 'payments.links:manage', 'payments.refunds:request', 'payments.refunds:approve',
  'settlements:read', 'reconciliation:read', 'reconciliation:manage', 'reports:read',
  'ledger:read',
  'developer.apiKeys:manage', 'developer.webhooks:manage', 'team:manage', 'roles:manage',
  'settings:manage', 'support:read', 'support:manage', 'compliance:read',
];
const onboarding = {
  status: 'DRAFT', currentStep: 1,
  business: { legalName: 'Kambaza Traders Limited', tradingName: 'Kambaza Traders', city: 'Blantyre', contactName: 'Chikondi Banda', contactEmail: 'chikondi.banda@kambazapay.mw', contactPhone: '+265991234567' },
  owners: [], documents: [], settlement: {}, declarationAccepted: false,
  timeline: [{ status: 'DRAFT', occurredAt: new Date().toISOString() }],
};

try {
  const passwordHash = await argon2.hash(`GiantPay!Demo1${config.PASSWORD_PEPPER}`, { type: argon2.argon2id });
  await db.query(
    `INSERT INTO merchants(id,name,onboarding) VALUES('mch_kambaza','Kambaza Traders Ltd',$1)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name`, [onboarding],
  );
  await db.query(
    `INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions,mfa_enabled)
     VALUES('usr_owner_01','mch_kambaza','Chikondi Banda','chikondi.banda@kambazapay.mw',$1,'OWNER',$2,false)
     ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, permissions=excluded.permissions`,
    [passwordHash, permissions],
  );
  await db.query(
    `INSERT INTO users(id,merchant_id,name,email,password_hash,role,permissions,mfa_enabled)
     VALUES('usr_platform_admin_01',NULL,'Esther Kaunda','admin@giantpay.mw',$1,'PLATFORM_ADMIN',$2,false)
     ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, permissions=excluded.permissions`,
    [passwordHash, ['admin.merchants:review', 'admin.refunds:approve', 'admin.platform:manage']],
  );
  await db.query(
    `INSERT INTO payment_links(id,merchant_id,token,name,mode,amount_minor,currency,description,customer_reference,status,reusable,max_successful_payments,expires_at)
     VALUES('plink_demo','mch_kambaza','demo_token_ready','Demo checkout','FIXED',4550000,'MWK','Order #4821','INV-4821','ACTIVE',true,100,now()+interval '30 days')
     ON CONFLICT(id) DO NOTHING`,
  );
  console.log('Seeded demo merchant and account');
} finally {
  await db.end();
}
