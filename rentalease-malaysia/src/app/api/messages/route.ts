import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/messages?tenancyId=xxx
// Returns all messages for a tenancy, oldest first.
// Also marks all messages addressed to the current user as read.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const tenancyId = request.nextUrl.searchParams.get('tenancyId');
  if (!tenancyId) {
    return NextResponse.json(
      { error: 'tenancyId is required' },
      { status: 400 },
    );
  }

  // Security check: verify the requesting user is a party to this tenancy
  // A landlord must own the property; a tenant must be the tenant on the tenancy
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      OR: [
        { tenantId: session.user.id },
        { property: { landlordId: session.user.id } },
      ],
    },
  });

  if (!tenancy) {
    return NextResponse.json(
      { error: 'Tenancy not found or access denied' },
      { status: 404 },
    );
  }

  // Fetch all messages and simultaneously mark unread ones as read
  // We use Promise.all so both DB operations happen in parallel
  const [messages] = await Promise.all([
    prisma.message.findMany({
      where: { tenancyId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' }, // oldest first — natural chat order
    }),
    // Mark all messages TO this user as read now that they've opened the thread
    prisma.message.updateMany({
      where: {
        tenancyId,
        receiverId: session.user.id,
        read: false,
      },
      data: { read: true },
    }),
  ]);

  return NextResponse.json({ messages });
}

// POST /api/messages
// Sends a new human-typed message within a tenancy thread
const sendSchema = z.object({
  tenancyId: z.string().min(1),
  content: z.string().min(1, 'Message cannot be empty').max(2000),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  try {
    const body = await request.json();
    const { tenancyId, content } = sendSchema.parse(body);

    // Find the tenancy and determine who the receiver is
    // If the sender is the landlord, the receiver is the tenant, and vice versa
    const tenancy = await prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        OR: [
          { tenantId: session.user.id },
          { property: { landlordId: session.user.id } },
        ],
      },
      include: {
        property: { select: { landlordId: true } },
      },
    });

    if (!tenancy) {
      return NextResponse.json(
        { error: 'Tenancy not found or access denied' },
        { status: 404 },
      );
    }

    // Determine receiver based on who the sender is
    const receiverId =
      session.user.id === tenancy.tenantId
        ? tenancy.property.landlordId // tenant is sending → landlord receives
        : tenancy.tenantId; // landlord is sending → tenant receives

    const message = await prisma.message.create({
      data: {
        tenancyId,
        senderId: session.user.id,
        receiverId,
        content,
        read: false,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 },
    );
  }
}
