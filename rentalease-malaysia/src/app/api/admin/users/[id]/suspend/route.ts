import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: { suspended: boolean };
  try {
    body = await request.json() as { suspended: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { suspended } = body;
  if (typeof suspended !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.role === 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.user.update({
    where: { id },
    data: { isSuspended: suspended },
  });

  if (suspended) {
    await createNotification(
      id,
      'ACCOUNT_SUSPENDED',
      'Account suspended',
      'Your account has been suspended. Contact support for assistance.',
      '/login',
    );
  } else {
    await createNotification(
      id,
      'ACCOUNT_REACTIVATED',
      'Account reactivated',
      'Your account has been reactivated. You can now log in.',
      user.role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant',
    );
  }

  return NextResponse.json({
    message: suspended ? 'User suspended' : 'User reactivated',
  });
}
