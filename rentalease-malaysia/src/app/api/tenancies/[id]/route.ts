import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const editSchema = z
  .object({
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: z.coerce
      .number()
      .positive('Monthly rent must be greater than 0'),
    depositAmount: z.coerce.number().min(0, 'Deposit must be 0 or more'),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: tenancyId } = await params;

  // Authorization: landlord must own this tenancy via room → property chain
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      room: { property: { landlordId: session.user.id } },
    },
  });

  if (!tenancy)
    return NextResponse.json(
      { error: 'Tenancy not found or access denied' },
      { status: 404 },
    );

  // Only INVITED or PENDING tenancies can be edited.
  // ACTIVE means the agreement is signed — terms are locked permanently.
  if (!['INVITED', 'PENDING'].includes(tenancy.status)) {
    return NextResponse.json(
      {
        error:
          tenancy.status === 'ACTIVE'
            ? 'This tenancy is already active. Terms cannot be changed after the agreement is signed.'
            : 'Only invited or pending tenancies can be edited.',
      },
      { status: 409 },
    );
  }

  // If an agreement has already been generated (even as a DRAFT),
  // block editing because the agreement text was built from the old values.
  const existingAgreement = await prisma.agreement.findUnique({
    where: { tenancyId },
    select: { id: true },
  });

  if (existingAgreement) {
    return NextResponse.json(
      {
        error:
          'An agreement has already been generated for this tenancy. Regenerate the agreement after making changes — the new values will be used.',
      },
      { status: 409 },
    );
  }

  try {
    const body = await request.json();
    const data = editSchema.parse(body);

    const updated = await prisma.tenancy.update({
      where: { id: tenancyId },
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        monthlyRent: true,
        depositAmount: true,
        status: true,
      },
    });

    return NextResponse.json(
      { message: 'Tenancy terms updated successfully.', tenancy: updated },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('Edit tenancy error:', error);
    return NextResponse.json(
      { error: 'Failed to update tenancy.' },
      { status: 500 },
    );
  }
}
