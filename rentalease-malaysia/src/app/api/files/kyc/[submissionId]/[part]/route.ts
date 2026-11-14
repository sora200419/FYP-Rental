// GET /api/files/kyc/[submissionId]/[part]   part = front | back | selfie
// Redirects to a short-lived signed link for one KYC image. Only the user who
// submitted it and admins may open it.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAssetAccessUrl } from '@/lib/cloudinary';
import { KYC_IMAGE_PARTS, type KycImagePart } from '@/lib/privateFiles';
import { privateRedirect } from '@/lib/privateFileResponse';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ submissionId: string; part: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { submissionId, part } = await params;
  if (!KYC_IMAGE_PARTS.includes(part as KycImagePart)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const submission = await prisma.kycSubmission.findUnique({
    where: { id: submissionId },
    select: {
      userId: true,
      icFrontUrl: true,
      icFrontPublicId: true,
      icBackUrl: true,
      icBackPublicId: true,
      selfieUrl: true,
      selfiePublicId: true,
    },
  });

  const allowed =
    submission && (session.user.role === 'ADMIN' || submission.userId === session.user.id);
  if (!allowed) {
    // Same response whether it doesn't exist or isn't yours.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const asset =
    part === 'front'
      ? { url: submission.icFrontUrl, publicId: submission.icFrontPublicId }
      : part === 'back'
        ? { url: submission.icBackUrl, publicId: submission.icBackPublicId }
        : { url: submission.selfieUrl, publicId: submission.selfiePublicId };

  return privateRedirect(getAssetAccessUrl(asset));
}
