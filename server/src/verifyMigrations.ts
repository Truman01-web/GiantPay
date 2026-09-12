import { createDb } from './db.js';
import { applyMigrations,EXPECTED_MIGRATIONS } from './migrationRunner.js';
import { requireSafeTestDatabase } from './testDatabase.js';

const url=requireSafeTestDatabase(process.env.TEST_DATABASE_URL,process.env.ALLOW_REMOTE_TEST_DATABASE==='true');
const db=createDb(url.toString());
try{const first=await applyMigrations(db),second=await applyMigrations(db);const rows=await db.query('SELECT name,count(*)::int count FROM schema_migrations GROUP BY name ORDER BY name');if(rows.rows.length!==EXPECTED_MIGRATIONS.length||rows.rows.some(r=>r.count!==1))throw new Error('Migrations were not recorded exactly once.');console.log(`Verified ${rows.rows.length} migrations; first pass applied ${first}, repeat applied ${second}.`);}finally{await db.end();}
