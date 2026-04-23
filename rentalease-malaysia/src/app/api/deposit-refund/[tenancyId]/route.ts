// GET /api/deposit-refund/[tenancyId] — fetch existing refund record (landlord or tenant)
// POST /api/deposit-refund/[tenancyId] — landlord creates the initial refund proposal
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

async function verifyAccess(tenancyId: string, userId: string, role: string) {
  return prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      ...(role === 'LANDLORD'
        ? { room: { property: { landlordId: userId } } }
        : { tenantId: userId }),
    },
    select: { id: true, depositAmount: true, status: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenancyId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { tenancyId } = await params;
  const tenancy = await verifyAccess(tenancyId, session.user.id, session.user.role);
  if (!tenancy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const refund = await prisma.depositRefund.findUnique({
    where: { tenancyId },
    include: { deductions: { orderBy: { createdAt: 'asc' } } },
  });

  if (!refund) return NextResponse.json({ error: 'No deposit refund record yet' }, { status: 404 });
  return NextResponse.json({ refund });
}

const createSchema = z.object({
  deductions: z.array(z.object({
    reason: z.string().min(5),
    amount: z.number().positive(),
    photoIds: z.array(z.string()).default([]),
  })).default([]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenancyId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Only landlords can initiate deposit settlement' }, { status: 403 });

  const { tenancyId } = await params;
  const tenancy = await verifyAccess(tenancyId, session.user.id, session.user.role);
  if (!tenancy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!['EXPIRED', 'TERMINATED'].includes(tenancy.status))
    return NextResponse.json({ error: 'Deposit settlement only available after tenancy ends' }, { status: 409 });

  const existing = await prisma.depositRefund.findUnique({ where: { tenancyId } });
  if (existing) return NextResponse.json({ error: 'Deposit refund already created' }, { status: 409 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const totalDeductions = parsed.data.deductions.reduce((sum, d) => sum + d.amount, 0);
  const originalAmount = Number(tenancy.depositAmount);
  const refundAmount = Math.max(0, originalAmount - totalDeductions);

  const refund = await prisma.depositRefund.create({
    data: {
      tenancyId,
      originalAmount,
      refundAmount,
      status: parsed.data.deductions.length === 0 ? 'AGREED' : 'PROPOSED',
      deductions: {
        create: parsed.data.deductions.map((d) => ({
          reason: d.reason,
          amount: d.amount,
          photoIds: JSON.stringify(d.photoIds),
          status: 'PROPOSED',
        })),
      },
    },
    include: { deductions: true },
  });

  return NextResponse.json({ refund }, { status: 201 });
}
