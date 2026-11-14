import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadKycImage, deletePrivateAsset } from '@/lib/cloudinary';
import { validateUpload, type ValidatedUpload } from '@/lib/uploadValidation';
import { createNotification } from '@/lib/notifications';
import { kycSubmitRateLimit, enforceLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'ADMIN')
    return NextResponse.json({ error: 'Admins do not submit KYC' }, { status: 403 });

  // Rate limit per user — caps both the upload-bandwidth abuse surface and
  // the cost of running Cloudinary uploads + deletes if a user keeps
  // re-submitting. 3 per hour is generous for a real user.
  const { allowed, message } = await enforceLimit(
    kycSubmitRateLimit,
    session.user.id,
    'You can only submit KYC documents 3 times per hour. Please wait before trying again.',
  );
  if (!allowed) {
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const existing = await prisma.kycSubmission.findUnique({
    where: { userId: session.user.id },
  });

  if (existing?.status === 'PENDING')
    return NextResponse.json(
      { error: 'Your identity verification is already under review.' },
      { status: 409 },
    );
  if (existing?.status === 'APPROVED')
    return NextResponse.json({ error: 'Your identity is already verified.' }, { status: 409 });

  const formData = await request.formData();

  // Validate all three by content (JPG or PNG, up to 10 MB) before uploading any.
  const validated: ValidatedUpload[] = [];
  for (const [label, field] of [
    ['IC front', 'icFront'],
    ['IC back', 'icBack'],
    ['Selfie', 'selfie'],
  ] as const) {
    const result = await validateUpload(formData.get(field), { allowed: ['jpeg', 'png'] });
    if (!result.ok) {
      return NextResponse.json({ error: `${label}: ${result.error}` }, { status: 400 });
    }
    validated.push(result.file);
  }

  // Upload the new images first; old ones are removed only once this succeeds.
  const uploadResults = await Promise.allSettled(
    validated.map((file) => uploadKycImage(file.buffer, file.mimeType)),
  );

  const uploadFailed = uploadResults.some((r) => r.status === 'rejected');
  if (uploadFailed) {
    await Promise.allSettled(
      uploadResults
        .filter((r): r is PromiseFulfilledResult<{ url: string; publicId: string }> => r.status === 'fulfilled')
        .map((r) => deletePrivateAsset(r.value)),
    );
    return NextResponse.json({ error: 'Failed to upload images. Please try again.' }, { status: 500 });
  }

  if (existing?.status === 'REJECTED') {
    const deletions = await Promise.allSettled([
      deletePrivateAsset({ url: existing.icFrontUrl, publicId: existing.icFrontPublicId }),
      deletePrivateAsset({ url: existing.icBackUrl, publicId: existing.icBackPublicId }),
      deletePrivateAsset({ url: existing.selfieUrl, publicId: existing.selfiePublicId }),
    ]);
    deletions.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[kyc] old image cleanup failed [${i}]:`, r.reason);
    });
  }

  const [icFrontResult, icBackResult, selfieResult] = uploadResults.map(
    (r) => (r as PromiseFulfilledResult<{ url: string; publicId: string }>).value,
  );

  await prisma.kycSubmission.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      icFrontUrl: icFrontResult.url,
      icFrontPublicId: icFrontResult.publicId,
      icBackUrl: icBackResult.url,
      icBackPublicId: icBackResult.publicId,
      selfieUrl: selfieResult.url,
      selfiePublicId: selfieResult.publicId,
      status: 'PENDING',
    },
    update: {
      icFrontUrl: icFrontResult.url,
      icFrontPublicId: icFrontResult.publicId,
      icBackUrl: icBackResult.url,
      icBackPublicId: icBackResult.publicId,
      selfieUrl: selfieResult.url,
      selfiePublicId: selfieResult.publicId,
      status: 'PENDING',
      rejectedReason: null,
      reviewedById: null,
      reviewedAt: null,
      submittedAt: new Date(),
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  await Promise.allSettled(
    admins.map((admin) =>
      createNotification(
        admin.id,
        'KYC_SUBMITTED',
        'New KYC submission',
        `${session.user.name} has submitted identity verification documents for review.`,
        '/dashboard/admin/kyc',
      ),
    ),
  );

  return NextResponse.json({ status: 'PENDING' });
}
