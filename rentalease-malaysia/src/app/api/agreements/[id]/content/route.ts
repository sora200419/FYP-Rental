import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bodySchema = z.object({
  rawContent: z
    .string()
    .min(
      100,
      'Agreement content is too short — please do not delete the entire document.',
    ),
});

// PATCH /api/agreements/[id]/content
// Allows the landlord to save a manually edited (or AI-assisted) version
// of the agreement rawContent. The status is reset to DRAFT so they must
// re-finalize before the tenant can see the changes.
// Blocked if the agreement is SIGNED — a signed agreement is immutable.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: agreementId } = await params;

  // Authorization: landlord must own this agreement via the room chain
  const agreement = await prisma.agreement.findFirst({
    where: {
      id: agreementId,
      tenancy: {
        room: { property: { landlordId: session.user.id } },
      },
    },
    select: { id: true, status: true },
  });

  if (!agreement)
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );

  // A SIGNED agreement is a legally acknowledged document — it cannot be
  // altered. If changes are needed after signing, a new tenancy must be
  // created. This mirrors real-world contract law.
  if (agreement.status === 'SIGNED')
    return NextResponse.json(
      {
        error:
          'This agreement has been signed by the tenant and can no longer be edited. If changes are required, please discuss with your tenant.',
      },
      { status: 409 },
    );

  try {
    const body = await request.json();
    const { rawContent } = bodySchema.parse(body);

    const updated = await prisma.agreement.update({
      where: { id: agreementId },
      data: {
        rawContent,
        // Reset to DRAFT — the landlord must re-finalize before sending
        // back to the tenant. This prevents accidentally sending an
        // unreviewed edited draft.
        status: 'DRAFT',
        // Clear negotiation notes — the landlord has addressed the request.
        negotiationNotes: null,
        updatedAt: new Date(),
      },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json(
      { message: 'Agreement updated successfully.', agreement: updated },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('Agreement content update error:', error);
    return NextResponse.json(
      { error: 'Failed to save agreement.' },
      { status: 500 },
    );
  }
}
