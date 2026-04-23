// src/app/api/tenant-documents/for-tenancy/[tenancyId]/route.ts
// Landlord-only endpoint: returns tenant documents for a specific tenancy.
// Access requires an active (INVITED, PENDING, or ACTIVE) tenancy between the landlord and tenant.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenancyId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { tenancyId } = await params;

  // Verify landlord owns this tenancy and it is in an accessible status
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      room: { property: { landlordId: session.user.id } },
      status: { in: ['INVITED', 'PENDING', 'ACTIVE'] }, // PDPA: access ends after tenancy closes
    },
    select: { tenantId: true },
  });

  if (!tenancy)
    return NextResponse.json(
      {
        error: 'Access denied. Document access is only available for active tenancy relationships.',
        accessRevoked: true,
      },
      { status: 403 },
    );

  const docs = await prisma.tenantDocument.findMany({
    where: { userId: tenancy.tenantId },
    orderBy: { uploadedAt: 'desc' },
  });

  return NextResponse.json({ documents: docs });
}
