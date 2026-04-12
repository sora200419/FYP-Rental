import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id: reportId } = await params;

  // Authorization: user must be a party to the tenancy — landlord chain goes through room
  const report = await prisma.conditionReport.findFirst({
    where: {
      id: reportId,
      tenancy: {
        OR: [
          { tenantId: session.user.id },
          { room: { property: { landlordId: session.user.id } } },
        ],
      },
    },
  });

  if (!report)
    return NextResponse.json(
      { error: 'Report not found or access denied' },
      { status: 404 },
    );

  if (report.createdById === session.user.id)
    return NextResponse.json(
      {
        error:
          'You cannot acknowledge your own report. The other party must acknowledge it.',
      },
      { status: 403 },
    );

  if (report.acknowledgedAt)
    return NextResponse.json(
      { error: 'This report has already been acknowledged.' },
      { status: 409 },
    );

  const updated = await prisma.conditionReport.update({
    where: { id: reportId },
    data: {
      acknowledgedAt: new Date(),
      acknowledgedById: session.user.id,
    },
    select: { id: true, acknowledgedAt: true },
  });

  return NextResponse.json({
    message: 'Report acknowledged successfully.',
    report: updated,
  });
}
