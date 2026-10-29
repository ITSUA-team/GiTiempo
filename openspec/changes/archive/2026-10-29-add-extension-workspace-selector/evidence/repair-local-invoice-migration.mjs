import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root='/Users/alexeytsukanov/Documents/work/GiTiempo';
const require=createRequire(root+'/apps/api/package.json');
const {Client}=require('pg');
const {readMigrationFiles}=require('drizzle-orm/migrator');
const target=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(target.hostname),'Only a local database is permitted');
const migrations=readMigrationFiles({migrationsFolder:root+'/apps/api/drizzle'});
const migration=migrations.find(m=>m.folderMillis===1791796554260);
assert(migration,'Expected existing migration 0022');
assert.equal(migration.hash,'30022518362f4485be244009f69069de0761de5603717a310fdc325d52d56139','Migration 0022 changed since approval');
const source=readFileSync(root+'/apps/api/drizzle/0022_tricky_black_panther.sql','utf8');
assert.equal(migration.hash,createHash('sha256').update(source).digest('hex'));
assert(!/\b(?:DROP|TRUNCATE|DELETE|UPDATE)\s+(?:TABLE|FROM|"?time_entries"?\s+SET)/i.test(source),'Only additive existing migration is permitted');
const apply=process.argv.includes('--apply');
const db=new Client({connectionString:target.href});
await db.connect();
let inTransaction=false;
try {
 await db.query('BEGIN'); inTransaction=true;
 await db.query("SET LOCAL lock_timeout = '5s'");
 await db.query("SET LOCAL statement_timeout = '15s'");
 if(apply){await db.query('SELECT pg_advisory_xact_lock(455,22)');await db.query('LOCK TABLE drizzle.__drizzle_migrations IN EXCLUSIVE MODE');}
 const rows=(await db.query('SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at')).rows;
 const knownTimestamps=new Set(migrations.map(m=>m.folderMillis));
 const allowedHashDrift=new Set([1781504617712,1784799076000]);
 assert(rows.every(r=>knownTimestamps.has(Number(r.created_at))),'Unknown migration journal timestamp');
 for(const item of migrations){
  const matches=rows.filter(r=>Number(r.created_at)===item.folderMillis);
  const expectedCount=[1781260341414,migration.folderMillis].includes(item.folderMillis)?0:1;
  assert.equal(matches.length,expectedCount,'Unexpected missing/duplicate migration row '+item.folderMillis);
  if(matches.length&&!allowedHashDrift.has(item.folderMillis))assert.equal(matches[0].hash,item.hash,'Unexpected migration hash drift '+item.folderMillis);
 }
 const last=Math.max(...rows.map(r=>Number(r.created_at)));
 const missing=migrations.filter(m=>m.folderMillis<=last&&!rows.some(r=>Number(r.created_at)===m.folderMillis));
 assert.deepEqual(missing.map(m=>m.folderMillis),[1781260341414,migration.folderMillis],'Unexpected migration gaps; stop and investigate');
 assert(rows.some(r=>Number(r.created_at)===1791878400000),'Expected 0023 already applied');
 const before=(await db.query("SELECT to_regclass('public.invoices') IS NULL AS invoices_absent, NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_entries' AND column_name='invoice_id') AS invoice_column_absent")).rows[0];
 assert(before.invoices_absent&&before.invoice_column_absent,'Expected both invoice objects absent; partial state needs separate review');
 const workspace=(await db.query('SELECT EXISTS(SELECT 1 FROM workspaces WHERE id=$1 AND name=$2) AS matches_report',['097791a6-2de7-4b55-9925-c45f0c00a48d','GitHub OAuth acceptance 2026-10-09'])).rows[0];
 assert(workspace.matches_report,'Expected the local database from the user report');
 const report={date:'2026-10-16',mode:apply?'apply':'read-only-preflight',localOnly:true,reportedWorkspaceMatches:true,migration:'0022_tricky_black_panther',sha256:migration.hash,missingMigrationTimestamps:missing.map(m=>m.folderMillis),untouchedHistoryGaps:['0010_register_lookup_uniqueness'],scope:'Apply only 0022; do not rewrite older history or run other migrations',before};
 if(apply){
  for(const sql of migration.sql)if(sql.trim())await db.query(sql);
  await db.query('INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES($1,$2)',[migration.hash,migration.folderMillis]);
  const after=(await db.query("SELECT to_regclass('public.invoices') IS NOT NULL AS invoices_present, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_entries' AND column_name='invoice_id') AS invoice_column_present, EXISTS(SELECT 1 FROM pg_constraint WHERE conname='time_entries_invoice_id_invoices_id_fk' AND conrelid='public.time_entries'::regclass) AS invoice_fk_present, to_regclass('public.time_entries_invoice_id_idx') IS NOT NULL AS invoice_index_present")).rows[0];
  assert(Object.values(after).every(Boolean),'Migration postconditions failed');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations WHERE created_at=$1 AND hash=$2',[migration.folderMillis,migration.hash])).rows[0].n,1);
  await db.query('COMMIT');inTransaction=false;report.after=after;report.committed=true;
 }else{await db.query('ROLLBACK');inTransaction=false;report.databaseChanged=false;}
 writeFileSync('/private/tmp/gitiempo-455-invoice-migration-'+(apply?'applied':'preflight')+'.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}catch(error){if(inTransaction)await db.query('ROLLBACK');console.error(JSON.stringify({name:error.name,code:error.code??null,message:error.message}));process.exitCode=1;}finally{await db.end();}
