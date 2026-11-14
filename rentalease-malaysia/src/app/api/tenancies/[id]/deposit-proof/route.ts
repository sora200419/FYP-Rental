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

  const { id: tenancyId } = await params;

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      depositProofs: { select: { id: true, publicId: true } },
      room: {
        include: {
          property: { select: { landlordId: true, address: true } },
        },
      },
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!tenancy || tenancy.tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Tenancy not found' }, { status: 404 });
  }

  if (tenancy.depositStatus === 'PAID') {
    return NextResponse.json(
      { error: 'Deposit is already confirmed as paid' },
      { status: 409 },
    );
  }

  // A deposit can only be paid on a tenancy the tenant has accepted. Without
  // this check a tenant could upload proof while still INVITED, and landlord
  // approval would move the tenancy to PENDING — skipping the invitation
  // response and its identity-verification gate.
  if (tenancy.status !== 'PENDING' && tenancy.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Deposit proof can only be uploaded for an accepted, ongoing tenancy.' },
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

  const uploadResult = await uploadProofDocument(
    file.buffer,
    file.mimeType,
    'rentalease/deposit-proofs',
  );

  if (tenancy.depositProofs.length > 0) {
    await Promise.allSettled(
      tenancy.depositProofs.map((p) => deletePaymentProof(p.publicId).catch(() => null)),
    );
  }

  await prisma.$transaction([
    prisma.depositProof.deleteMany({ where: { tenancyId } }),
    prisma.depositProof.create({
      data: {
        tenancyId,
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId,
        uploadedById: session.user.id,
      },
    }),
    prisma.tenancy.update({
      where: { id: tenancyId },
      data: {
        depositStatus: 'UNDER_REVIEW',
        depositRejectionReason: null,
      },
    }),
  ]);

  await createNotification(
    tenancy.room.property.landlordId,
    'DEPOSIT_PROOF_UPLOADED',
    'Deposit proof uploaded',
    `${tenancy.tenant.name} uploaded a deposit payment proof for ${tenancy.room.property.address}. Please verify it.`,
    `/dashboard/landlord/tenancies/${tenancyId}`,
  );

  return NextResponse.json({ ok: true, imageUrl: uploadResult.url });
}
