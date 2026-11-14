// src/app/api/payments/[id]/proof/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { uploadProofDocument, deletePaymentProof } from '@/lib/cloudinary';
import { validateUpload } from '@/lib/uploadValidation';
import { enforceLimit, uploadRateLimit } from '@/lib/ratelimit';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: paymentId } = await params;

  // Verify the payment belongs to this tenant's tenancy
  const payment = await prisma.rentPayment.findUnique({
    where: { id: paymentId },
    include: {
      proofs: { select: { id: true, publicId: true } },
      tenancy: {
        include: {
          room: {
            include: {
              property: {
                select: { landlordId: true, address: true },
              },
            },
          },
          tenant: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!payment || payment.tenancy.tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.status === 'PAID' || payment.status === 'WAIVED') {
    return NextResponse.json(
      { error: 'This payment is already settled' },
      { status: 409 },
    );
  }

  const rate = await enforceLimit(
    uploadRateLimit,
    session.user.id,
    'Too many uploads. Please wait a while before uploading again.',
  );
  if (!rate.allowed) {
    return NextResponse.json({ error: rate.message }, { status: 429 });
  }

  const formData = await request.formData();
  const validation = await validateUpload(formData.get('file'), {
    allowed: ['jpeg', 'png', 'webp', 'pdf'],
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const file = validation.file;

  // Upload the new file first; the previous proof is discarded only once this
  // succeeds, so a failed upload never leaves the tenant with no proof.
  const uploadResult = await uploadProofDocument(
    file.buffer,
    file.mimeType,
    'rentalease/payment-proofs',
  );

  if (payment.proofs.length > 0) {
    await Promise.allSettled(
      payment.proofs.map((p) => deletePaymentProof(p.publicId).catch(() => null)),
    );
  }

  // Create the proof record and update payment status in a transaction
  await prisma.$transaction([
    prisma.paymentProof.deleteMany({ where: { paymentId } }),
    prisma.paymentProof.create({
      data: {
        paymentId,
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedById: session.user.id,
      },
    }),
    prisma.rentPayment.update({
      where: { id: paymentId },
      data: {
        status: 'UNDER_REVIEW',
        rejectionReason: null, // clear any previous rejection
      },
    }),
  ]);

  // Notify landlord to verify
  await createNotification(
    payment.tenancy.room.property.landlordId,
    'PAYMENT_PROOF_UPLOADED',
    'Payment proof uploaded',
    `${payment.tenancy.tenant.name} uploaded a payment proof for ${payment.tenancy.room.property.address}. Please verify it.`,
    `/dashboard/landlord/payments`,
  );

  return NextResponse.json({ ok: true, imageUrl: uploadResult.url });
}
