// src/app/api/tenant-documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteTenantDocument } from '@/lib/cloudinary';

// DELETE /api/tenant-documents/[id] — only the uploading user can delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.tenantDocument.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    await deleteTenantDocument(doc.publicId);
  } catch {
    // Non-blocking — Cloudinary delete failure shouldn't prevent DB cleanup
    console.error('Cloudinary delete failed for tenant document:', doc.publicId);
  }

  await prisma.tenantDocument.delete({ where: { id } });
  return NextResponse.json({ message: 'Document deleted' });
}
