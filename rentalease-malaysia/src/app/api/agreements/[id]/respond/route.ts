// src/app/api/agreements/[id]/respond/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRentSchedule } from '@/lib/payments';
import { anchorHashToBlockchain } from '@/lib/blockchain';
import { createHash } from 'crypto';
import { z } from 'zod';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept'),
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
      // ── Step 1: Compute the SHA-256 fingerprint ─────────────────────────
      // This hash is computed from the rawContent at the exact moment of signing.
      // If the document is ever altered after this point, the hash will no longer
      // match — providing a tamper-evident seal on the agreement text.
      const contentHash = createHash('sha256')
        .update(agreement.rawContent)
        .digest('hex');

      // ── Step 2: Extract client IP for the audit trail ───────────────────
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const clientIp = forwardedFor
        ? forwardedFor.split(',')[0].trim()
        : (realIp ?? 'unknown');

      // ── Step 3: Atomic database transaction (the critical path) ─────────
      // Both the agreement signing and the tenancy activation must succeed
      // together or not at all. This is the legally significant operation —
      // everything after this point is enhancement, not requirement.
      await prisma.$transaction([
        prisma.agreement.update({
          where: { id },
          data: {
            status: 'SIGNED',
            negotiationNotes: null,
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

      // ── Step 4: Generate the rent payment schedule ───────────────────────
      // This is additive and can be retried — safe outside the transaction.
      await generateRentSchedule(
        agreement.tenancy.id,
        agreement.tenancy.startDate,
        agreement.tenancy.endDate,
        agreement.tenancy.monthlyRent,
      );

      // ── Step 5: Blockchain anchoring (best-effort, non-blocking) ────────
      // We attempt to anchor the SHA-256 hash to the Sepolia testnet as an
      // immutable public record. This is explicitly named in the FYP IR as
      // the Ethers.js blockchain audit trail component.
      //
      // IMPORTANT: This runs AFTER the database transaction is committed.
      // If this fails for any reason (network error, insufficient gas, RPC
      // timeout), the agreement is already validly signed in the database
      // and the tenancy is already ACTIVE. We log the failure but never
      // propagate it to the client — signing success is not conditional on
      // blockchain availability.
      try {
        const txHash = await anchorHashToBlockchain(contentHash);

        // Store the txHash back on the agreement.
        // A separate update (not inside the original transaction) because
        // this can fail independently without affecting signing validity.
        await prisma.agreement.update({
          where: { id },
          data: { txHash },
        });

        console.log(
          `[Blockchain] Anchored agreement ${id} → Sepolia txHash: ${txHash}`,
        );
      } catch (blockchainError) {
        // This is intentionally a soft failure. The signing is legally valid
        // with the SHA-256 hash alone (stored in step 3). The on-chain record
        // is an enhancement. Log the error for debugging but do not throw.
        console.error(
          `[Blockchain] Anchoring failed for agreement ${id} (signing still valid):`,
          blockchainError,
        );
      }

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
