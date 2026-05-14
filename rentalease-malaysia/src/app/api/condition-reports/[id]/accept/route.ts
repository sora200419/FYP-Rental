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
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
              property: { select: { landlordId: true, address: true } },
            },
          },
        },
      },
      _count: { select: { photos: true } },
    },
  });

  if (!report)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const landlordId = report.tenancy.room.property.landlordId;
  const tenantId = report.tenancy.tenant.id;
  const isLandlord = landlordId === session.user.id;
  const isTenant = tenantId === session.user.id;

  if (!isLandlord && !isTenant)
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  if (report.createdById === session.user.id)
    return NextResponse.json(
      { error: 'You cannot accept your own report.' },
      { status: 400 },
    );

  if (!['SUBMITTED', 'PENDING_REVIEW', 'COUNTER_EVIDENCE_ADDED'].includes(report.status))
    return NextResponse.json(
      { error: 'This report is not in a reviewable state.' },
      { status: 409 },
    );

  if (report._count.photos === 0)
    return NextResponse.json(
      { error: 'A report with no photos cannot be accepted.' },
      { status: 422 },
    );

  const now = new Date();
  await prisma.conditionReport.update({
    where: { id },
    data: {
      status: 'ACCEPTED',
      reviewDecision: 'ACCEPTED',
      reviewedAt: now,
      reviewedById: session.user.id,
      acknowledgedAt: now,
      acknowledgedById: session.user.id,
    },
  });

  const creatorRole = report.createdBy.role === 'LANDLORD' ? 'landlord' : 'tenant';
  const reportTypeLabel =
    report.type === 'MOVE_IN'
      ? 'Move-in'
      : report.type === 'MOVE_OUT'
        ? 'Move-out'
        : 'Inspection';

  await createNotification(
    report.createdBy.id,
    'CONDITION_REPORT_ACCEPTED',
    `${reportTypeLabel} condition report accepted`,
    `${session.user.name ?? 'The other party'} accepted your ${reportTypeLabel.toLowerCase()} condition report for ${report.tenancy.room.property.address}.`,
    creatorRole === 'landlord'
      ? `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`
      : `/dashboard/tenant/conditions`,
  );

  return NextResponse.json({ ok: true });
}
