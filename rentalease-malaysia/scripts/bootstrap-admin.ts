/**
 * Creates the platform admin account from ADMIN_EMAIL / ADMIN_PASSWORD /
 * ADMIN_NAME if it does not exist yet. Runs as part of `npm run build`, after
 * migrations, and can be run on demand:
 *
 *   npm run admin:bootstrap
 *
 * Never fails the build: problems are reported and the build continues.
 */
import { ensureAdminBootstrap } from '../src/lib/admin/bootstrap';
import { prisma } from '../src/lib/prisma';

const MESSAGES = {
  'missing-env': 'ADMIN_EMAIL or ADMIN_PASSWORD is not set — skipped.',
  'weak-password': 'ADMIN_PASSWORD is shorter than 12 characters — admin NOT created.',
  create: 'Admin account created.',
  conflict:
    'A non-admin account already uses ADMIN_EMAIL — left unchanged. Use a different ADMIN_EMAIL, or remove that account first.',
  noop: 'Admin account already exists — nothing to do.',
} as const;

async function main() {
  try {
    const status = await ensureAdminBootstrap();
    console.log(`[admin-bootstrap] ${MESSAGES[status]}`);
  } catch (error) {
    console.error('[admin-bootstrap] Failed (build continues):', error);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
