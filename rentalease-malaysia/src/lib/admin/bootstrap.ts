import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';

// Creates the platform admin account from ADMIN_EMAIL / ADMIN_PASSWORD /
// ADMIN_NAME. Run by scripts/bootstrap-admin.ts during `npm run build` (and on
// demand with `npm run admin:bootstrap`) — never on page requests.
//
// It only ever CREATES the account. If a non-admin account already uses
// ADMIN_EMAIL it is left alone: promoting it would hand admin rights to
// whoever registered that address first, with their own password.

export type AdminBootstrapEnv = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_NAME?: string;
};

export type ExistingUserRole = 'LANDLORD' | 'TENANT' | 'ADMIN';

export type ExistingUser = {
  id: string;
  role: ExistingUserRole;
  name: string;
} | null;

export type AdminBootstrapDecision =
  | { status: 'missing-env' }
  | { status: 'weak-password' }
  | { status: 'create'; email: string; password: string; name: string }
  | { status: 'conflict'; email: string }
  | { status: 'noop'; email: string };

export function buildAdminBootstrapDecision(input: {
  env: AdminBootstrapEnv;
  existingUser: ExistingUser;
}): AdminBootstrapDecision {
  const email = input.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = input.env.ADMIN_PASSWORD?.trim() ?? '';
  const name = input.env.ADMIN_NAME?.trim() || 'RentalEase Admin';

  if (!email || !password) {
    return { status: 'missing-env' };
  }

  if (!input.existingUser) {
    if (password.length < PASSWORD_MIN_LENGTH) {
      return { status: 'weak-password' };
    }
    return { status: 'create', email, password, name };
  }

  if (input.existingUser.role !== 'ADMIN') {
    return { status: 'conflict', email };
  }

  return { status: 'noop', email };
}

export async function ensureAdminBootstrap(): Promise<AdminBootstrapDecision['status']> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const existingUser = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true, name: true },
      })
    : null;

  const decision = buildAdminBootstrapDecision({
    env: {
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
      ADMIN_NAME: process.env.ADMIN_NAME,
    },
    existingUser,
  });

  if (decision.status === 'create') {
    const passwordHash = await bcrypt.hash(decision.password, 12);
    await prisma.user.upsert({
      where: { email: decision.email },
      create: {
        name: decision.name,
        email: decision.email,
        password: passwordHash,
        role: 'ADMIN',
        isVerified: true,
      },
      update: {},
    });
  }

  return decision.status;
}
