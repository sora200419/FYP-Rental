// src/app/api/condition-reports/[id]/acknowledge/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const report = await prisma.conditionReport.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: {
                select: { landlordId: true, address: true },
              },
            },
          },
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const landlordId = report.tenancy.room.property.landlordId;
  const tenantId = report.tenancy.tenant.id;
  const isLandlord = landlordId === session.user.id;
  const isTenant = tenantId === session.user.id;

  if (!isLandlord && !isTenant) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Only the non-creator should acknowledge
  if (report.createdById === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot acknowledge your own report' },
      { status: 400 },
    );
  }

  if (report.acknowledgedAt) {
    return NextResponse.json(
      { error: 'This report has already been acknowledged' },
      { status: 409 },
    );
  }

  await prisma.conditionReport.update({
    where: { id },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedById: session.user.id,
    },
  });

  // Notify the creator that their report was acknowledged
  const acknowledgerName = session.user.name ?? 'The other party';
  const propertyAddress = report.tenancy.room.property.address;
  const creatorDashboardRole =
    report.createdBy.role === 'LANDLORD' ? 'landlord' : 'tenant';

  await createNotification(
    report.createdBy.id,
    'CONDITION_REPORT_ACKNOWLEDGED',
    'Condition report acknowledged',
    `${acknowledgerName} acknowledged your condition report for ${propertyAddress}.`,
    `/dashboard/${creatorDashboardRole}/condition-reports/${report.id}`,
  );

  return NextResponse.json({ ok: true });
}
