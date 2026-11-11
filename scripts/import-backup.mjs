// Restores an All Uplinks backup (Admin → Site settings → Download backup) into the configured database.
// Usage (Windows or Mac/Linux), with the target database in environment variables:
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/import-backup.mjs alluplinks-backup.json --yes
// Without TURSO_DATABASE_URL it restores into the local database in ./storage.
import fs from 'node:fs';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Usage: node scripts/import-backup.mjs <backup.json> --yes'); process.exit(1); }
const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
const { importAll, ready, DB_KIND, client } = await import('../server/db.js');
await ready;
const counts = Object.entries(backup.tables || {}).map(([t, rows]) => `${t}: ${rows.length}`).join(', ');
console.log(`Backup from ${backup.exported_at}\n${counts}\nTarget database: ${DB_KIND}`);
if (flag !== '--yes') { console.log('\nThis REPLACES all data in the target database. Re-run with --yes to continue.'); process.exit(0); }
await importAll(backup);
console.log('Restore complete.');
client.close();
