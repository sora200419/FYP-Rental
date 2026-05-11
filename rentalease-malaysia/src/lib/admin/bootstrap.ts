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
  | {
      status: 'create';
      email: string;
      password: string;
      name: string;
    }
  | {
      status: 'promote';
      userId: string;
      email: string;
      name: string;
    }
  | {
      status: 'noop';
      userId: string;
      email: string;
      name: string;
    };

export function buildAdminBootstrapDecision(input: {
  env: AdminBootstrapEnv;
  existingUser: ExistingUser;
}): AdminBootstrapDecision {
  const email = input.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = input.env.ADMIN_PASSWORD?.trim() ?? '';
  const name = input.env.ADMIN_NAME?.trim() || 'RentalEase Admin';

  if (!email || !password) {
    return { status: 'missing-env' as const };
  }

  if (!input.existingUser) {
    return { status: 'create' as const, email, password, name };
  }

  if (input.existingUser.role !== 'ADMIN') {
    return {
      status: 'promote' as const,
      userId: input.existingUser.id,
      email,
      name,
    };
  }

  return {
    status: 'noop' as const,
    userId: input.existingUser.id,
    email,
    name,
  };
}
