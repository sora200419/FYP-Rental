import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const propertySchema = z.object({
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(1),
  postcode: z.string().regex(/^\d{5}$/),
  type: z.string().min(1),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(1).max(20),
  rentAmount: z.coerce.number().positive(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Step 1: Verify the user is authenticated and is a LANDLORD
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (session.user.role !== 'LANDLORD') {
    // A tenant should never be able to create a property
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = propertySchema.parse(body);

    // Step 2: Create the property, linking it to the authenticated landlord
    // We use session.user.id — never trust landlordId from the request body
    const property = await prisma.property.create({
      data: {
        ...data,
        landlordId: session.user.id,
      },
      select: {
        id: true,
        address: true,
        city: true,
        rentAmount: true,
      },
    });

    return NextResponse.json(
      { message: 'Property created successfully', property },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Create property error:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 },
    );
  }
}
