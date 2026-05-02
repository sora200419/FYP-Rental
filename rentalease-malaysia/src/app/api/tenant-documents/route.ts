// src/app/api/tenant-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadTenantDocument, deleteTenantDocument } from '@/lib/cloudinary';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// GET /api/tenant-documents — returns the current tenant's own documents
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const docs = await prisma.tenantDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json({ documents: docs });
}

// POST /api/tenant-documents — upload a new document (or replace existing of same type)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role === 'ADMIN')
    return NextResponse.json({ error: 'Admins do not upload identity documents' }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!type || !['IC_COPY', 'INCOME_PROOF'].includes(type))
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPG, PNG, WebP, PDF' },
        { status: 400 },
      );

    // If replacing, delete old Cloudinary image first
    const existing = await prisma.tenantDocument.findUnique({
      where: { userId_type: { userId: session.user.id, type: type as 'IC_COPY' | 'INCOME_PROOF' } },
    });
    if (existing) {
      try { await deleteTenantDocument(existing.publicId); } catch { /* non-blocking */ }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { url, publicId } = await uploadTenantDocument(buffer, file.name, file.type);

    const doc = await prisma.tenantDocument.upsert({
      where: { userId_type: { userId: session.user.id, type: type as 'IC_COPY' | 'INCOME_PROOF' } },
      create: {
        userId: session.user.id,
        type: type as 'IC_COPY' | 'INCOME_PROOF',
        imageUrl: url,
        publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
      update: {
        imageUrl: url,
        publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error('Tenant document upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
