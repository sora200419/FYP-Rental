import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const tenancySchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantEmail: z.string().email('Invalid email address'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  monthlyRent: z.coerce
    .number()
    .positive('Monthly rent must be greater than 0'),
  depositAmount: z.coerce.number().min(0, 'Deposit amount must be 0 or more'),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = tenancySchema.parse(body);

    // Step 1: Verify the property belongs to this landlord
    // Prevents a landlord from creating a tenancy on someone else's property
    const property = await prisma.property.findFirst({
      where: {
        id: data.propertyId,
        landlordId: session.user.id,
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found or does not belong to you' },
        { status: 404 },
      );
    }

    // Step 2: Check the property doesn't already have an active tenancy
    const existingActiveTenancy = await prisma.tenancy.findFirst({
      where: {
        propertyId: data.propertyId,
        status: 'ACTIVE',
      },
    });

    if (existingActiveTenancy) {
      return NextResponse.json(
        { error: 'This property already has an active tenancy' },
        { status: 409 },
      );
    }
    // Step 3: Look up the tenant by email — they must have a TENANT account
    const tenant = await prisma.user.findFirst({
      where: {
        email: data.tenantEmail,
        role: 'TENANT',
      },
      select: { id: true, name: true, email: true },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          error:
            'No tenant account found with this email. Please ask your tenant to register on RentalEase first.',
        },
        { status: 404 },
      );
    }

    // Step 4: Validate dates — end date must be after start date
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end <= start) {
      return NextResponse.json(
        { error: 'End date must be after the start date' },
        { status: 400 },
      );
    }

    // Step 5: Create the tenancy with PENDING status
    // PENDING means the agreement hasn't been generated or signed yet
    const tenancy = await prisma.tenancy.create({
      data: {
        propertyId: data.propertyId,
        tenantId: tenant.id,
        startDate: start,
        endDate: end,
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        status: 'PENDING',
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        monthlyRent: true,
        depositAmount: true,
        status: true,
        tenant: {
          select: { name: true, email: true },
        },
        property: {
          select: { address: true, city: true },
        },
      },
    });

    return NextResponse.json(
      { message: 'Tenancy created successfully', tenancy },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Create tenancy error:', error);
    return NextResponse.json(
      { error: 'Failed to create tenancy' },
      { status: 500 },
    );
  }
}
