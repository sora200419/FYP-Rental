// GET /api/files/signature-proofs/[proofId]
// Redirects to a short-lived signed link for a signed agreement scan. Allowed
// for the tenant (or corporate signatory) who uploaded it, the landlord of the
// tenancy, and admins.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAssetAccessUrl } from '@/lib/cloudinary';
import { privateRedirect } from '@/lib/privateFileResponse';

const FORMAT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heic',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ proofId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { proofId } = await params;
  const proof = await prisma.agreementSignatureProof.findUnique({
    where: { id: proofId },
    select: {
      fileUrl: true,
      publicId: true,
      mimeType: true,
      uploadedById: true,
      agreement: {
        select: {
          tenancy: {
            select: {
              tenantId: true,
              room: { select: { property: { select: { landlordId: true } } } },
            },
          },
        },
      },
    },
  });

  const userId = session.user.id;
  const tenancy = proof?.agreement.tenancy;
  const allowed =
    proof &&
    tenancy &&
    (session.user.role === 'ADMIN' ||
      proof.uploadedById === userId ||
      tenancy.tenantId === userId ||
      tenancy.room.property.landlordId === userId);
  if (!allowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return privateRedirect(
    getAssetAccessUrl({
      url: proof.fileUrl,
      publicId: proof.publicId,
      format: FORMAT_BY_MIME[proof.mimeType] ?? null,
    }),
  );
}
