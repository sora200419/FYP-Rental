import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;

  const report = await prisma.conditionReport.findUnique({
    where: { id },
    include: {
      photos: { select: { id: true, publicId: true } },
      tenancy: {
        include: {
          room: {
            include: {
              property: { select: { landlordId: true } },
            },
          },
        },
      },
    },
  });

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const landlordId = report.tenancy.room.property.landlordId;
  const isCreator = report.createdById === session.user.id;
  const isLandlord = landlordId === session.user.id;

  if (!isCreator && !isLandlord) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (report.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only DRAFT reports can be deleted.' },
      { status: 409 },
    );
  }

  // Delete Cloudinary photos before removing the DB record
  await Promise.allSettled(
    report.photos.map((p) => cloudinary.uploader.destroy(p.publicId)),
  );

  await prisma.conditionReport.delete({ where: { id } });

  return NextResponse.json({ message: 'Condition report deleted' });
}
