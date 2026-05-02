/**
 * Prisma seed — run with: npx prisma db seed
 *
 * Creates the first ADMIN account if it does not already exist.
 * Credentials are read from .env (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME).
 *
 * This is the standard way real apps bootstrap their first admin:
 * the developer sets the credentials in .env and runs the seed on deployment.
 * Nobody can create an ADMIN account through the website UI.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'RentalEase Admin';

  if (!email || !password) {
    console.warn(
      'Skipping admin seed — ADMIN_EMAIL or ADMIN_PASSWORD not set in .env',
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN', isVerified: true },
      });
      console.log(`✅ Promoted existing user "${existing.name}" to ADMIN.`);
    } else {
      console.log(`ℹ️  Admin account already exists: ${email}`);
    }
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log(`✅ Admin account created: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
