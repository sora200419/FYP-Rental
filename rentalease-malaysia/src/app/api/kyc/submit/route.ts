import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadKycImage, deleteKycImage } from '@/lib/cloudinary';
import { compareFaces } from '@/lib/rekognition';
import { createNotification } from '@/lib/notifications';

const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role === 'ADMIN')
    return NextResponse.json({ error: 'Admins do not submit KYC' }, { status: 403 });

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
  const icFront = formData.get('icFront') as File | null;
  const icBack = formData.get('icBack') as File | null;
  const selfie = formData.get('selfie') as File | null;

  if (!icFront || !icBack || !selfie)
    return NextResponse.json({ error: 'All three images are required' }, { status: 400 });

  for (const [label, file] of [['IC front', icFront], ['IC back', icBack], ['selfie', selfie]] as [string, File][]) {
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: `${label}: only JPG and PNG are accepted` }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: `${label}: file must be under 10 MB` }, { status: 400 });
  }

  if (existing?.status === 'REJECTED') {
    await Promise.allSettled([
      deleteKycImage(existing.icFrontPublicId),
      deleteKycImage(existing.icBackPublicId),
      deleteKycImage(existing.selfiePublicId),
    ]);
  }

  const [icFrontBytes, icBackBytes, selfieBytes] = await Promise.all([
    icFront.arrayBuffer().then(Buffer.from),
    icBack.arrayBuffer().then(Buffer.from),
    selfie.arrayBuffer().then(Buffer.from),
  ]);

  const [icFrontResult, icBackResult, selfieResult] = await Promise.all([
    uploadKycImage(icFrontBytes, icFront.name, icFront.type),
    uploadKycImage(icBackBytes, icBack.name, icBack.type),
    uploadKycImage(selfieBytes, selfie.name, selfie.type),
  ]);

  const faceMatchScore = await compareFaces(icFrontBytes, selfieBytes);

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
      faceMatchScore,
      status: 'PENDING',
    },
    update: {
      icFrontUrl: icFrontResult.url,
      icFrontPublicId: icFrontResult.publicId,
      icBackUrl: icBackResult.url,
      icBackPublicId: icBackResult.publicId,
      selfieUrl: selfieResult.url,
      selfiePublicId: selfieResult.publicId,
      faceMatchScore,
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

  await Promise.all(
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
