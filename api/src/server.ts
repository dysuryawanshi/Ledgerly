import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

const port = Number(process.env.PORT ?? 4600);
const host = '0.0.0.0';

const server = createApp().listen(port, host, () => {
  console.log(`Ledgerly API listening on http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
