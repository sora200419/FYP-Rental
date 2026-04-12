import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSystemMessage } from '@/lib/messages';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Authorization chain: Agreement → Tenancy → Room → Property → landlordId
  const agreement = await prisma.agreement.findFirst({
    where: {
      id,
      tenancy: {
        room: { property: { landlordId: session.user.id } },
      },
    },
    include: {
      tenancy: {
        select: {
          id: true,
          tenantId: true,
          room: {
            select: {
              property: { select: { landlordId: true } },
            },
          },
        },
      },
    },
  });

  if (!agreement)
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );

  if (agreement.status !== 'DRAFT')
    return NextResponse.json(
      { error: 'Only DRAFT agreements can be finalized' },
      { status: 409 },
    );

  const updated = await prisma.agreement.update({
    where: { id },
    data: { status: 'FINALIZED' },
    select: { id: true, status: true },
  });

  try {
    await sendSystemMessage(
      agreement.tenancy.id,
      agreement.tenancy.room.property.landlordId,
      agreement.tenancy.tenantId,
      '📄 Your tenancy agreement is ready for review. Please visit the "My Tenancy" page to read the full agreement, review the plain-language summary and red-flag analysis, then either accept it or request changes.',
    );
  } catch (msgError) {
    console.error('Auto-message failed after finalize:', msgError);
  }

  return NextResponse.json({ agreement: updated });
}
