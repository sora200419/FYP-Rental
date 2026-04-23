// POST /api/tenancies/[id]/terminate
// Serve a formal notice to terminate. Landlord or tenant can call this.
// Immediately marks tenancy as TERMINATED with a reason and timestamp.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const terminateSchema = z.object({
  reason: z.string().min(10, 'Please provide a reason (at least 10 characters)'),
  terminationDate: z.string().datetime().optional(), // defaults to now
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;

  // Both landlords and tenants can serve notice — auth chain differs per role
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id,
      status: 'ACTIVE',
      ...(session.user.role === 'LANDLORD'
        ? { room: { property: { landlordId: session.user.id } } }
        : { tenantId: session.user.id }),
    },
    select: { id: true },
  });

  if (!tenancy) return NextResponse.json({ error: 'Active tenancy not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = terminateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const at = parsed.data.terminationDate ? new Date(parsed.data.terminationDate) : new Date();

  await prisma.tenancy.update({
    where: { id },
    data: {
      status: 'TERMINATED',
      terminatedAt: at,
      terminatedReason: parsed.data.reason,
    },
  });

  return NextResponse.json({ message: 'Tenancy terminated' });
}
