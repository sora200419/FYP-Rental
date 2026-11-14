// POST /api/deposit-refund/[id]/mark-paid
// Landlord uploads proof of deposit refund payment. Marks refund as PAID.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadRefundProof } from '@/lib/cloudinary';
import { validateUpload } from '@/lib/uploadValidation';
import { createNotification } from '@/lib/notifications';
import { sendDepositRefundPaidEmail } from '@/lib/email';


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const refund = await prisma.depositRefund.findFirst({
    where: {
      id,
      status: 'AGREED',
      tenancy: { room: { property: { landlordId: session.user.id } } },
    },
    select: {
      id: true,
      refundAmount: true,
      tenancy: { select: { tenantId: true } },
    },
  });

  if (!refund) return NextResponse.json({ error: 'Refund not found or not in AGREED status' }, { status: 404 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const validation = await validateUpload(formData.get('file'), {
    allowed: ['jpeg', 'png', 'webp', 'pdf'],
  });
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  const file = validation.file;

  let url: string, publicId: string;
  try {
    ({ url, publicId } = await uploadRefundProof(file.buffer, file.mimeType));
  } catch {
    return NextResponse.json({ error: 'File upload failed. Please try again.' }, { status: 500 });
  }

  await prisma.depositRefund.update({
    where: { id },
    data: {
      status: 'PAID',
      paidProofUrl: url,
      paidProofPublicId: publicId,
      paidAt: new Date(),
    },
  });

  const amountStr = Number(refund.refundAmount).toFixed(2);

  // Notify tenant that the deposit has been refunded (non-blocking)
  createNotification(
    refund.tenancy.tenantId,
    'DEPOSIT_REFUND_PAID',
    'Deposit refund paid',
    `Your landlord has transferred your deposit refund of RM ${amountStr}. Proof of payment has been uploaded.`,
    `/dashboard/tenant/tenancy`,
  );

  // Send email to tenant (non-blocking)
  const tenantUser = await prisma.user.findUnique({
    where: { id: refund.tenancy.tenantId },
    select: { email: true, name: true },
  });
  if (tenantUser) {
    sendDepositRefundPaidEmail(tenantUser.email, tenantUser.name ?? 'Tenant', amountStr).catch(console.error);
  }

  return NextResponse.json({ message: 'Deposit refund marked as paid' });
}
