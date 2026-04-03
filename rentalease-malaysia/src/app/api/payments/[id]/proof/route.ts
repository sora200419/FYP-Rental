import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadPaymentProof } from '@/lib/cloudinary';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'TENANT')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: paymentId } = await params;

  // Verify this payment belongs to a tenancy where this user is the tenant
  const payment = await prisma.rentPayment.findFirst({
    where: {
      id: paymentId,
      tenancy: { tenantId: session.user.id },
    },
  });

  if (!payment) {
    return NextResponse.json(
      { error: 'Payment not found or access denied' },
      { status: 404 },
    );
  }

  // Only allow uploads when the payment is PENDING or LATE.
  // UNDER_REVIEW means they already uploaded — they can add more photos to the same payment.
  // PAID means the landlord already approved — no more uploads needed.
  if (payment.status === 'PAID' || payment.status === 'WAIVED') {
    return NextResponse.json(
      { error: 'This payment has already been verified.' },
      { status: 409 },
    );
  }

  try {
    // Parse the multipart form data — Next.js App Router handles this natively
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type — only allow images
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are accepted (JPG, PNG, HEIC, etc.)' },
        { status: 400 },
      );
    }

    // Validate file size — cap at 10MB to prevent abuse
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 },
      );
    }

    // Convert the Web API File object to a Node.js Buffer for Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary — this is the network call that takes 1–3 seconds
    const { url, publicId } = await uploadPaymentProof(buffer, file.name);

    // Save the proof record and transition the payment status in a transaction
    await prisma.$transaction([
      prisma.paymentProof.create({
        data: {
          imageUrl: url,
          publicId,
          paymentId,
          uploadedById: session.user.id,
        },
      }),
      prisma.rentPayment.update({
        where: { id: paymentId },
        data: {
          status: 'UNDER_REVIEW',
          // Clear any previous rejection reason when tenant re-uploads
          rejectionReason: null,
        },
      }),
    ]);

    return NextResponse.json(
      { message: 'Payment proof uploaded successfully.', url },
      { status: 201 },
    );
  } catch (error) {
    console.error('Proof upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}
