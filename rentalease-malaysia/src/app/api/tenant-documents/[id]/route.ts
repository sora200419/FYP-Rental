// src/app/api/tenant-documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteTenantDocument } from '@/lib/cloudinary';
import { logAudit, getIp } from '@/lib/audit';

// DELETE /api/tenant-documents/[id] — only the uploading user can delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.tenantDocument.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await logAudit({
    actorId: session.user.id,
    action: 'TENANT_DOCUMENT_DELETED',
    entityName: 'TenantDocument',
    entityId: id,
    previousData: doc as object,
    ipAddress: getIp(request),
  });

  try {
    await deleteTenantDocument(doc.publicId);
  } catch {
    console.error('Cloudinary delete failed for tenant document:', doc.publicId);
  }

  await prisma.tenantDocument.delete({ where: { id } });
  return NextResponse.json({ message: 'Document deleted' });
}
