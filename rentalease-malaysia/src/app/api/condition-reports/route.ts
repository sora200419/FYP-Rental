import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function verifyTenancyAccess(tenancyId: string, userId: string) {
  return prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      OR: [
        { tenantId: userId },
        { room: { property: { landlordId: userId } } },
      ],
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const tenancyId = request.nextUrl.searchParams.get('tenancyId');
  if (!tenancyId)
    return NextResponse.json(
      { error: 'tenancyId is required' },
      { status: 400 },
    );

  const tenancy = await verifyTenancyAccess(tenancyId, session.user.id);
  if (!tenancy)
    return NextResponse.json(
      { error: 'Tenancy not found or access denied' },
      { status: 404 },
    );

  const reports = await prisma.conditionReport.findMany({
    where: { tenancyId },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      photos: {
        select: {
          id: true,
          room: true,
          imageUrl: true,
          caption: true,
          uploadedById: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ reports });
}

const createSchema = z.object({
  tenancyId: z.string().min(1),
  type: z.enum(['MOVE_IN', 'MOVE_OUT', 'INSPECTION']),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const tenancy = await verifyTenancyAccess(data.tenancyId, session.user.id);
    if (!tenancy)
      return NextResponse.json(
        { error: 'Tenancy not found or access denied' },
        { status: 404 },
      );

    if (!['ACTIVE', 'PENDING'].includes(tenancy.status))
      return NextResponse.json(
        {
          error:
            'Condition reports can only be created for active or pending tenancies.',
        },
        { status: 409 },
      );

    const report = await prisma.conditionReport.create({
      data: {
        tenancyId: data.tenancyId,
        type: data.type,
        notes: data.notes ?? null,
        createdById: session.user.id,
      },
      select: { id: true, type: true, notes: true, createdAt: true },
    });

    return NextResponse.json(
      { message: 'Condition report created.', report },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('Create condition report error:', error);
    return NextResponse.json(
      { error: 'Failed to create condition report.' },
      { status: 500 },
    );
  }
}
