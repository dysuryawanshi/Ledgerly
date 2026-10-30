// Dev-only: runs a real PostgreSQL server on port 5433 without a system install.
// Data persists in api/.local-pg. Production uses any PostgreSQL via DATABASE_URL.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const databaseDir = fileURLToPath(new URL('../.local-pg', import.meta.url));
const fresh = !existsSync(databaseDir);

const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'ledgerly',
  password: 'ledgerly',
  port: 5433,
  persistent: true,
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('ledgerly');
console.log('PostgreSQL ready on postgresql://ledgerly:ledgerly@localhost:5433/ledgerly');

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
setInterval(() => {}, 1 << 30);
