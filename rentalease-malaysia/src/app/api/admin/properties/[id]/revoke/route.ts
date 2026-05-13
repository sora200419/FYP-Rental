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
  const body = await request.json();
  const reason = (body.reason as string)?.trim();

  if (!reason)
    return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, address: true, landlordId: true, isVerified: true },
  });

  if (!property)
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  if (!property.isVerified)
    return NextResponse.json({ error: 'Property is not currently verified' }, { status: 400 });

  await prisma.property.update({
    where: { id },
    data: { isVerified: false, rejectedReason: reason },
  });

  await createNotification(
    property.landlordId,
    'PROPERTY_VERIFICATION_REVOKED',
    'Property verification revoked',
    `Your property at "${property.address}" has had its verification revoked. Reason: ${reason}. Please update the listing and it will be reviewed again.`,
    '/dashboard/landlord/properties',
  );

  return NextResponse.json({ message: 'Property verification revoked' });
}
