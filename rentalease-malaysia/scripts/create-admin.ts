/**
 * Creates an ADMIN user or promotes an existing user to ADMIN.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password> [name]
 *
 * Examples:
 *   npx tsx scripts/create-admin.ts admin@rentalease.com Admin123 "Site Admin"
 *   npx tsx scripts/create-admin.ts existing@user.com   # promotes without changing password
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, name = 'Admin'] = process.argv;

  if (!email) {
    console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [name]');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Promote existing user to ADMIN
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN', isVerified: true },
    });
    console.log(`✅ Promoted existing user "${existing.name}" (${email}) to ADMIN.`);
  } else {
    // Create a new admin account
    if (!password) {
      console.error('Password is required when creating a new admin account.');
      process.exit(1);
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
    console.log(`✅ Created new ADMIN account: ${email}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
