import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Verify the agreement belongs to a tenancy owned by this landlord
  const agreement = await prisma.agreement.findFirst({
    where: {
      id,
      tenancy: {
        property: { landlordId: session.user.id },
      },
    },
  });

  if (!agreement) {
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );
  }

  if (agreement.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only DRAFT agreements can be finalized' },
      { status: 409 },
    );
  }

  const updated = await prisma.agreement.update({
    where: { id },
    data: { status: 'FINALIZED' },
    select: { id: true, status: true },
  });

  return NextResponse.json({ agreement: updated });
}
