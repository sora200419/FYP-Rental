import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRentSchedule } from '@/lib/payments';
import { createHash } from 'crypto';
import { z } from 'zod';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept'),
    // The client must send acknowledged: true — this comes from the
    // checkbox the tenant ticks in the signing modal UI.
    // If the API receives accept without acknowledged=true, it rejects.
    acknowledged: z.literal(true),
  }),
  z.object({
    action: z.literal('request_changes'),
    notes: z
      .string()
      .min(
        10,
        'Please describe what you would like changed (at least 10 characters)',
      ),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'TENANT')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const agreement = await prisma.agreement.findFirst({
    where: {
      id,
      tenancy: { tenantId: session.user.id },
    },
    include: {
      tenancy: {
        select: {
          id: true,
          tenantId: true,
          startDate: true,
          endDate: true,
          monthlyRent: true,
        },
      },
    },
  });

  if (!agreement)
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );

  if (agreement.status !== 'FINALIZED')
    return NextResponse.json(
      { error: 'This agreement is not ready for your review yet.' },
      { status: 409 },
    );

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);

    if (data.action === 'accept') {
      // Compute SHA-256 hash of the agreement content at signing time.
      // This hash is the fingerprint — if anyone later claims the document
      // was altered after signing, you can verify by hashing the stored
      // rawContent and comparing it to this value.
      const contentHash = createHash('sha256')
        .update(agreement.rawContent)
        .digest('hex');

      // Extract client IP from standard proxy headers.
      // Vercel and most reverse proxies set x-forwarded-for.
      // We take the first IP in the chain (the actual client, not an intermediary).
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const clientIp = forwardedFor
        ? forwardedFor.split(',')[0].trim()
        : (realIp ?? 'unknown');

      // Atomic transaction: sign the agreement and activate the tenancy together.
      // Either both succeed or neither does — prevents a signed agreement
      // without an active tenancy or vice versa.
      await prisma.$transaction([
        prisma.agreement.update({
          where: { id },
          data: {
            status: 'SIGNED',
            negotiationNotes: null,
            // audit trail fields
            contentHash,
            signedAt: new Date(),
            signedByIp: clientIp,
            signedAcknowledged: true,
          },
        }),
        prisma.tenancy.update({
          where: { id: agreement.tenancy.id },
          data: { status: 'ACTIVE' },
        }),
      ]);

      // Generate the rent schedule outside the transaction — it's additive
      // and can be retried if it fails without rolling back the signed status.
      await generateRentSchedule(
        agreement.tenancy.id,
        agreement.tenancy.startDate,
        agreement.tenancy.endDate,
        agreement.tenancy.monthlyRent,
      );

      return NextResponse.json({
        message: 'Agreement accepted. Tenancy is now active.',
      });
    }

    if (data.action === 'request_changes') {
      await prisma.agreement.update({
        where: { id },
        data: {
          status: 'NEGOTIATING',
          negotiationNotes: data.notes,
        },
      });

      return NextResponse.json({
        message: 'Change request sent to your landlord.',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('Agreement respond error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
