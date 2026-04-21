// src/app/api/condition-reports/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenancyId = searchParams.get('tenancyId');

  if (!tenancyId) {
    return NextResponse.json(
      { error: 'tenancyId is required' },
      { status: 400 },
    );
  }

  // Verify the user is involved in this tenancy
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      room: { include: { property: { select: { landlordId: true } } } },
    },
  });

  if (!tenancy) {
    return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });
  }

  const isLandlord = tenancy.room.property.landlordId === session.user.id;
  const isTenant = tenancy.tenantId === session.user.id;

  if (!isLandlord && !isTenant) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const reports = await prisma.conditionReport.findMany({
    where: { tenancyId },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      photos: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { tenancyId, type, notes } = body;

  if (!tenancyId || !type) {
    return NextResponse.json(
      { error: 'tenancyId and type are required' },
      { status: 400 },
    );
  }

  if (!['MOVE_IN', 'MOVE_OUT', 'INSPECTION'].includes(type)) {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }

  // Verify the user is part of this tenancy
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      tenant: { select: { id: true, name: true } },
      room: {
        include: {
          property: {
            include: {
              landlord: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!tenancy) {
    return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });
  }

  const landlordId = tenancy.room.property.landlordId;
  const isLandlord = landlordId === session.user.id;
  const isTenant = tenancy.tenantId === session.user.id;

  if (!isLandlord && !isTenant) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const report = await prisma.conditionReport.create({
    data: {
      tenancyId,
      type,
      notes: notes ?? null,
      createdById: session.user.id,
    },
  });

  // Notify the OTHER party about the new report
  const reportTypeLabel =
    type === 'MOVE_IN'
      ? 'Move-in'
      : type === 'MOVE_OUT'
        ? 'Move-out'
        : 'Inspection';

  if (isLandlord) {
    // Landlord created it — notify the tenant
    await createNotification(
      tenancy.tenant.id,
      'CONDITION_REPORT_CREATED',
      `${reportTypeLabel} condition report ready to review`,
      `Your landlord created a ${reportTypeLabel.toLowerCase()} condition report for ${tenancy.room.property.address}. Please review and acknowledge.`,
      `/dashboard/tenant/condition-reports/${report.id}`,
    );
  } else {
    // Tenant created it — notify the landlord
    await createNotification(
      landlordId,
      'CONDITION_REPORT_CREATED',
      `${reportTypeLabel} condition report ready to review`,
      `${tenancy.tenant.name} created a ${reportTypeLabel.toLowerCase()} condition report for ${tenancy.room.property.address}. Please review and acknowledge.`,
      `/dashboard/landlord/condition-reports/${report.id}`,
    );
  }

  return NextResponse.json(report, { status: 201 });
}
