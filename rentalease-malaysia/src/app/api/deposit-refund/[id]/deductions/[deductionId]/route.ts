// PATCH /api/deposit-refund/[id]/deductions/[deductionId]
// Tenant: accept or dispute. Landlord: withdraw their own deduction.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const tenantSchema = z.object({
  action: z.enum(['ACCEPT', 'DISPUTE']),
  disputeNote: z.string().optional(),
});

const landlordSchema = z.object({
  action: z.literal('WITHDRAW'),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deductionId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id, deductionId } = await params;

  // Verify the deduction exists and belongs to a tenancy this user is party to
  const deduction = await prisma.depositDeduction.findFirst({
    where: {
      id: deductionId,
      refundId: id,
      refund: {
        tenancy: session.user.role === 'LANDLORD'
          ? { room: { property: { landlordId: session.user.id } } }
          : { tenantId: session.user.id },
      },
    },
    select: { id: true, amount: true, status: true, refund: { select: { id: true, originalAmount: true, deductions: { select: { amount: true, status: true } } } } },
  });

  if (!deduction) return NextResponse.json({ error: 'Deduction not found' }, { status: 404 });
  if (deduction.status !== 'PROPOSED')
    return NextResponse.json({ error: 'Deduction already responded to' }, { status: 409 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (session.user.role === 'TENANT') {
    const parsed = tenantSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const newStatus = parsed.data.action === 'ACCEPT' ? 'ACCEPTED' : 'DISPUTED';

    const updated = await prisma.depositDeduction.update({
      where: { id: deductionId },
      data: {
        status: newStatus,
        tenantDisputeNote: parsed.data.disputeNote ?? null,
      },
    });

    // Move refund to IN_REVIEW once tenant starts responding
    await prisma.depositRefund.update({
      where: { id },
      data: { status: 'IN_REVIEW' },
    });

    // Check if all non-withdrawn deductions are resolved
    const allDeductions = deduction.refund.deductions.map((d, i) =>
      i === deduction.refund.deductions.findIndex((x) => x === d) ? { ...d, status: newStatus } : d
    );
    const allResolved = deduction.refund.deductions
      .filter((d) => d.status !== 'WITHDRAWN')
      .every((d) => ['ACCEPTED', 'DISPUTED'].includes(d.status));

    if (allResolved) {
      const hasDispute = deduction.refund.deductions.some((d) => d.status === 'DISPUTED');
      await prisma.depositRefund.update({
        where: { id },
        data: { status: hasDispute ? 'DISPUTED' : 'AGREED' },
      });
    }

    return NextResponse.json({ deduction: updated });
  }

  // Landlord withdrawing
  const parsed = landlordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.depositDeduction.update({
    where: { id: deductionId },
    data: { status: 'WITHDRAWN' },
  });

  // Recalculate refund amount without this deduction
  const remaining = deduction.refund.deductions
    .filter((d) => d.status !== 'WITHDRAWN' && d.amount !== deduction.amount)
    .reduce((s, d) => s + Number(d.amount), 0);

  await prisma.depositRefund.update({
    where: { id },
    data: { refundAmount: Math.max(0, Number(deduction.refund.originalAmount) - remaining) },
  });

  return NextResponse.json({ deduction: updated });
}
