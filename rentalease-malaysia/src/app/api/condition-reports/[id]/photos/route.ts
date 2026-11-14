import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enforceLimit, uploadRateLimit } from '@/lib/ratelimit';
import { validateUpload } from '@/lib/uploadValidation';
import { uploadConditionPhoto } from '@/lib/cloudinary';
import { isConditionReportLocked } from '@/lib/conditionReportWorkflow';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id: reportId } = await params;

  const report = await prisma.conditionReport.findFirst({
    where: {
      id: reportId,
      tenancy: {
        OR: [
          { tenantId: session.user.id },
          { room: { property: { landlordId: session.user.id } } },
        ],
      },
    },
  });

  if (!report)
    return NextResponse.json(
      { error: 'Report not found or access denied' },
      { status: 404 },
    );

  if (isConditionReportLocked(report.status))
    return NextResponse.json(
      { error: 'This report is locked. No further changes are allowed.' },
      { status: 409 },
    );

  const rate = await enforceLimit(
    uploadRateLimit,
    session.user.id,
    'Too many uploads. Please wait a while before uploading again.',
  );
  if (!rate.allowed) {
    return NextResponse.json({ error: rate.message }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const room = formData.get('room');
    const caption = formData.get('caption');

    if (typeof room !== 'string' || room.trim().length === 0)
      return NextResponse.json(
        { error: 'Room/area label is required' },
        { status: 400 },
      );

    const validation = await validateUpload(formData.get('file'), {
      allowed: ['jpeg', 'png', 'webp', 'heic'],
    });
    if (!validation.ok)
      return NextResponse.json({ error: validation.error }, { status: 400 });

    const { url, publicId } = await uploadConditionPhoto(
      validation.file.buffer,
      validation.file.mimeType,
    );

    const photo = await prisma.conditionPhoto.create({
      data: {
        imageUrl: url,
        publicId,
        room: room.trim(),
        caption: typeof caption === 'string' && caption.trim() ? caption.trim() : null,
        reportId,
        uploadedById: session.user.id,
      },
      select: { id: true, imageUrl: true, room: true, caption: true },
    });

    return NextResponse.json(
      { message: 'Photo uploaded.', photo },
      { status: 201 },
    );
  } catch (error) {
    console.error('Condition photo upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}
