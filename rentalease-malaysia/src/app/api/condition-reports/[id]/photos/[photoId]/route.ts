import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deletePaymentProof } from '@/lib/cloudinary';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id: reportId, photoId } = await params;

  // Find the photo — the where clause already enforces:
  // (1) correct report, (2) this user uploaded it.
  // No need for a separate tenancy OR check because if those two match,
  // the user is already proven to be a legitimate party.
  const photo = await prisma.conditionPhoto.findFirst({
    where: {
      id: photoId,
      reportId,
      uploadedById: session.user.id,
    },
    include: {
      report: {
        select: { acknowledgedAt: true },
      },
    },
  });

  if (!photo)
    return NextResponse.json(
      { error: 'Photo not found, not yours, or access denied' },
      { status: 404 },
    );

  // Once acknowledged, the report is immutable — no deletions allowed.
  if (photo.report.acknowledgedAt)
    return NextResponse.json(
      {
        error:
          'This report has been acknowledged and can no longer be modified.',
      },
      { status: 409 },
    );

  // Delete from Cloudinary first, then the DB record.
  try {
    await deletePaymentProof(photo.publicId);
  } catch (err) {
    console.error('Cloudinary delete failed:', err);
    // Non-blocking — still delete the DB record so user isn't stuck.
  }

  await prisma.conditionPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ message: 'Photo deleted.' });
}
