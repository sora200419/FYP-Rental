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
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, address: true, landlordId: true },
  });

  if (!property)
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  await prisma.property.update({
    where: { id },
    data: { rejectedReason: reason },
  });

  await createNotification(
    property.landlordId,
    'PROPERTY_VERIFICATION_REJECTED',
    'Property listing rejected',
    `Your property at "${property.address}" could not be approved. Reason: ${reason}. Please update the listing details and it will be reviewed again.`,
    '/dashboard/landlord/properties',
  );

  return NextResponse.json({ message: 'Property rejected' });
}
