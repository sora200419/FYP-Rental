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

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
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

  // Upload first, then replace any previous proof — a failed upload never
  // leaves the tenant without their earlier submission.
  const uploadResult = await uploadProofDocument(
    Buffer.from(await file.arrayBuffer()),
    file.type,
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
