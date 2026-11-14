import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enforceLimit, tenantLookupRateLimit } from '@/lib/ratelimit';
import { normalizeEmail } from '@/lib/emailAddress';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { allowed, message } = await enforceLimit(
    tenantLookupRateLimit,
    session.user.id,
    'Too many tenant lookups. Please wait before trying again.',
  );
  if (!allowed) {
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email query parameter is required' },
      { status: 400 },
    );
  }

  // Only return name and email — never password, IC number, or internal IDs
  const tenant = await prisma.user.findFirst({
    where: {
      email: normalizeEmail(email),
      role: 'TENANT',
      // Removed and suspended accounts cannot be invited, so don't reveal them.
      deletedAt: null,
      isSuspended: false,
    },
    select: {
      name: true,
      email: true,
    },
  });

  if (!tenant) {
    return NextResponse.json({ tenant: null }, { status: 404 });
  }

  return NextResponse.json({ tenant }, { status: 200 });
}
