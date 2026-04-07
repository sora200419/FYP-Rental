import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRentSchedule } from '@/lib/payments';
import { z } from 'zod';

// discriminatedUnion: if action is 'accept', no notes needed.
// If action is 'request_changes', notes are required and must be meaningful.
const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
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

  const { id } = await params; // agreement ID

  // Verify this agreement belongs to a tenancy where this user is the tenant
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
          property: { select: { landlordId: true } },
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

  // Tenants can only respond to FINALIZED agreements.
  // DRAFT = landlord hasn't reviewed yet.
  // NEGOTIATING = already in negotiation, wait for landlord to re-finalize.
  // SIGNED = already accepted, no further action needed.
  if (agreement.status !== 'FINALIZED') {
    return NextResponse.json(
      { error: 'This agreement is not ready for your review yet.' },
      { status: 409 },
    );
  }

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);

    if (data.action === 'accept') {
      // Use a transaction so agreement + tenancy status change together atomically.
      // If either fails, neither is committed — data stays consistent.
      await prisma.$transaction([
        prisma.agreement.update({
          where: { id },
          data: { status: 'SIGNED', negotiationNotes: null },
        }),
        prisma.tenancy.update({
          where: { id: agreement.tenancy.id },
          data: { status: 'ACTIVE' },
        }),
      ]);

      // Generate the monthly rent schedule now that the tenancy is live.
      // This runs outside the transaction because it's additive — if it fails,
      // the SIGNED status is already committed and can be retried.
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error('Agreement respond error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}
