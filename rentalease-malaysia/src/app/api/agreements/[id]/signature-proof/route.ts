import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { buildAgreementEvent } from '@/lib/agreements/history';
import { uploadAgreementSignatureProof } from '@/lib/cloudinary';
import { validateUpload } from '@/lib/uploadValidation';
import { signatureProofFileHref } from '@/lib/privateFiles';


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TENANT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      signatureProofs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
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
    },
  });

  if (!agreement || agreement.tenancy.tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
  }

  if (agreement.status !== 'PENDING_SIGNATURE_PROOF') {
    return NextResponse.json(
      { error: 'Hard-copy proof can only be uploaded after digital signing.' },
      { status: 409 },
    );
  }

  const latestProof = agreement.signatureProofs[0] ?? null;
  if (latestProof?.status === 'UNDER_REVIEW') {
    return NextResponse.json(
      { error: 'Your signed copy is already under landlord review.' },
      { status: 409 },
    );
  }

  if (latestProof?.status === 'APPROVED') {
    return NextResponse.json(
      { error: 'Your signed copy has already been approved.' },
      { status: 409 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const validation = await validateUpload(formData.get('file'), {
    allowed: ['pdf', 'jpeg', 'png', 'heic'],
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const file = validation.file;

  // Stored as a private (authenticated) asset; see lib/cloudinary.ts.
  const { url, publicId } = await uploadAgreementSignatureProof(file.buffer, file.mimeType);

  const createdProof = await prisma.$transaction(async (tx) => {
    const proof = await tx.agreementSignatureProof.create({
      data: {
        agreementId: id,
        uploadedById: session.user.id,
        fileUrl: url,
        publicId,
        originalName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size,
        status: 'UNDER_REVIEW',
      },
    });

    await tx.agreementEvent.create({
      data: buildAgreementEvent({
        agreementId: id,
        type: 'SIGNATURE_PROOF_UPLOADED',
        actorRole: 'TENANT',
        actorUserId: session.user.id,
        summary: 'Tenant uploaded the signed hard-copy proof for landlord review.',
      }),
    });

    return proof;
  });

  await createNotification(
    agreement.tenancy.room.property.landlordId,
    'AGREEMENT_SIGNATURE_PROOF_UPLOADED',
    'Signed agreement copy uploaded',
    `${agreement.tenancy.tenant.name} uploaded a signed hard-copy agreement for ${agreement.tenancy.room.property.address}. Review it before the tenancy starts.`,
    `/dashboard/landlord/tenancies/${agreement.tenancyId}`,
  );

  return NextResponse.json({
    ok: true,
    proof: {
      id: createdProof.id,
      fileUrl: signatureProofFileHref(createdProof.id),
      originalName: createdProof.originalName,
      mimeType: createdProof.mimeType,
      fileSize: createdProof.fileSize,
      status: createdProof.status,
    },
  });
}
