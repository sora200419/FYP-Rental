import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { uploadTenantDocument, deleteTenantDocument } from '@/lib/cloudinary';
import { sendWelcomeEmail } from '@/lib/email';
import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Malaysian IC: YYMMDD-SS-#### or YYMMDSS#### (12 digits, optional dashes)
const IC_REGEX = /^\d{6}-?\d{2}-?\d{4}$/;

const fieldsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['LANDLORD', 'TENANT']),
  phone: z.string().optional(),
  icNumber: z
    .string()
    .min(1, 'IC number is required')
    .regex(IC_REGEX, 'Invalid IC format — e.g. 900101-14-5678 or 900101145678'),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const raw = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as string,
      phone: (formData.get('phone') as string) || undefined,
      icNumber: formData.get('icNumber') as string,
    };

    const validated = fieldsSchema.parse(raw);

    // Normalise IC: strip dashes for storage
    const icNumber = validated.icNumber.replace(/-/g, '');

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    // Check IC uniqueness
    const existingIc = await prisma.user.findUnique({
      where: { icNumber },
      select: { id: true },
    });
    if (existingIc) {
      return NextResponse.json(
        { error: 'An account with this IC number already exists' },
        { status: 409 },
      );
    }

    // Pre-validate IC photo before touching the database.
    // We read bytes here so we fail fast on bad input, but upload AFTER user
    // creation to avoid orphaned Cloudinary files if the DB write fails.
    // BUG-12: IC photo is required at the API level
    const file = formData.get('icPhoto') as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'IC photo is required for identity verification' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'IC photo too large (max 10 MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPG, PNG, WebP, PDF' },
        { status: 400 },
      );
    }

    const fileBytes = Buffer.from(await file.arrayBuffer());

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: validated.role as 'LANDLORD' | 'TENANT',
        phone: validated.phone,
        icNumber,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Upload IC photo AFTER user creation so a DB failure doesn't orphan Cloudinary files.
    try {
      const uploaded = await uploadTenantDocument(fileBytes, file.name, file.type);
      await prisma.tenantDocument.create({
        data: {
          userId: user.id,
          type: 'IC_COPY',
          imageUrl: uploaded.url,
          publicId: uploaded.publicId,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      });
    } catch (uploadErr) {
      console.error('IC photo upload failed (non-fatal):', uploadErr);
    }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(validated.email, validated.name, validated.role as 'LANDLORD' | 'TENANT');

    return NextResponse.json(
      { message: 'Account created successfully', user },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the account' },
      { status: 500 },
    );
  }
}
