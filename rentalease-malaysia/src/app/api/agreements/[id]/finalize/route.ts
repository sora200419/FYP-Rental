import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSystemMessage } from '@/lib/messages'; // ← new import

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

  const { id } = await params; // this is the agreement ID

  // Verify the agreement belongs to a tenancy owned by this landlord.
  // We use the property → landlord chain to confirm ownership.
  const agreement = await prisma.agreement.findFirst({
    where: {
      id,
      tenancy: {
        property: { landlordId: session.user.id },
      },
    },
    include: {
      // We need the full tenancy to know who to notify
      tenancy: {
        select: {
          id: true,
          tenantId: true,
          property: {
            select: { landlordId: true },
          },
        },
      },
    },
  });

  if (!agreement) {
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );
  }

  // Only DRAFT agreements can be finalized.
  // If the status is already FINALIZED or SIGNED, reject the action.
  if (agreement.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only DRAFT agreements can be finalized' },
      { status: 409 },
    );
  }

  // Transition the agreement status from DRAFT → FINALIZED.
  const updated = await prisma.agreement.update({
    where: { id },
    data: { status: 'FINALIZED' },
    select: { id: true, status: true },
  });

  // Send an automatic notification message to the tenant.
  // This fires only when the landlord finalizes — which covers both the
  // first-time finalization AND re-finalization after a negotiation round.
  // The message appears in the tenant's Messages tab alongside any
  // human-typed messages, giving them a clear prompt to review.
  try {
    await sendSystemMessage(
      agreement.tenancy.id,
      agreement.tenancy.property.landlordId, // sender = landlord
      agreement.tenancy.tenantId, // receiver = tenant
      '📄 Your tenancy agreement is ready for review. Please visit the "My Tenancy" page to read the full agreement, review the plain-language summary and red-flag analysis, then either accept it or request changes.',
    );
  } catch (msgError) {
    // We don't want a messaging failure to roll back the finalization.
    // Log the error but return success — the agreement status change is
    // more important than the notification.
    console.error('Auto-message failed after finalize:', msgError);
  }

  return NextResponse.json({ agreement: updated });
}
