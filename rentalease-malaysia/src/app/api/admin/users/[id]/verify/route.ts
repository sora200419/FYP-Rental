import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!user || user.role === 'ADMIN')
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.update({
    where: { id },
    data: { isVerified: true, kycRejectedReason: null },
  });

  await createNotification(
    id,
    'ACCOUNT_VERIFIED',
    'Identity verified',
    `Welcome, ${user.name}! Your identity has been verified by an admin. You can now use all features on RentalEase.`,
    user.role === 'LANDLORD' ? '/dashboard/landlord/properties' : '/dashboard/tenant',
  );

  return NextResponse.json({ message: 'User verified successfully' });
}
