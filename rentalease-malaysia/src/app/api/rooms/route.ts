import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const roomSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  label: z.string().min(1, 'Room label is required').max(100),
  bathrooms: z.coerce.number().int().min(1).max(10),
  rentAmount: z.coerce.number().positive('Rent must be greater than 0'),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const propertyId = request.nextUrl.searchParams.get('propertyId');
  if (!propertyId)
    return NextResponse.json(
      { error: 'propertyId query param is required' },
      { status: 400 },
    );

  const property = await prisma.property.findFirst({
    where: { id: propertyId, landlordId: session.user.id },
  });
  if (!property)
    return NextResponse.json(
      { error: 'Property not found or access denied' },
      { status: 404 },
    );

  const rooms = await prisma.room.findMany({
    where: { propertyId },
    include: {
      tenancies: {
        where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
        include: {
          tenant: { select: { name: true, email: true } },
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ rooms });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const data = roomSchema.parse(body);

    const property = await prisma.property.findFirst({
      where: { id: data.propertyId, landlordId: session.user.id },
    });
    if (!property)
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 },
      );

    const room = await prisma.room.create({
      data: {
        propertyId: data.propertyId,
        label: data.label,
        bathrooms: data.bathrooms,
        rentAmount: data.rentAmount,
        isAvailable: true,
      },
      select: {
        id: true,
        label: true,
        bathrooms: true,
        rentAmount: true,
        isAvailable: true,
      },
    });

    return NextResponse.json(
      { message: 'Room created successfully', room },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 },
    );
  }
}
