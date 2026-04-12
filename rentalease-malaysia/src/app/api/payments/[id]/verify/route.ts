import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureNextPaymentPending } from '@/lib/payments';
import { z } from 'zod';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({
    action: z.literal('reject'),
    reason: z
      .string()
      .min(10, 'Please provide a reason (at least 10 characters)'),
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: paymentId } = await params;

  // Authorization chain: RentPayment → Tenancy → Room → Property → landlordId
  const payment = await prisma.rentPayment.findFirst({
    where: {
      id: paymentId,
      tenancy: { room: { property: { landlordId: session.user.id } } },
    },
    include: { tenancy: { select: { id: true } } },
  });

  if (!payment)
    return NextResponse.json(
      { error: 'Payment not found or access denied' },
      { status: 404 },
    );

  if (payment.status !== 'UNDER_REVIEW')
    return NextResponse.json(
      { error: 'This payment is not currently under review.' },
      { status: 409 },
    );

  try {
    const body = await request.json();
    const data = bodySchema.parse(body);

    if (data.action === 'approve') {
      await prisma.$transaction([
        prisma.rentPayment.update({
          where: { id: paymentId },
          data: { status: 'PAID', paidDate: new Date(), rejectionReason: null },
        }),
        prisma.paymentProof.updateMany({
          where: { paymentId },
          data: { isReadByTenant: false },
        }),
      ]);

      await ensureNextPaymentPending(payment.tenancy.id, payment.dueDate);
      return NextResponse.json({ message: 'Payment approved.' });
    }

    if (data.action === 'reject') {
      await prisma.$transaction([
        prisma.rentPayment.update({
          where: { id: paymentId },
          data: { status: 'PENDING', rejectionReason: data.reason },
        }),
        prisma.paymentProof.updateMany({
          where: { paymentId },
          data: { isReadByTenant: false },
        }),
      ]);

      return NextResponse.json({ message: 'Payment proof rejected.' });
    }
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 },
    );
  }
}
