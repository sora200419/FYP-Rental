// src/app/api/payments/[id]/proof/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { uploadProofDocument, deletePaymentProof } from '@/lib/cloudinary';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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

  // Parse the multipart form data to get the image file
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Accepted: JPG, PNG, WebP, PDF' },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File must be between 1 byte and 10 MB.' },
      { status: 400 },
    );
  }

  // Upload the new file first. Only once it has been validated and stored do
  // we discard the previous proof, so a failed upload never leaves the tenant
  // with no proof at all. There is at most one proof per payment.
  const uploadResult = await uploadProofDocument(
    Buffer.from(await file.arrayBuffer()),
    file.type,
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
