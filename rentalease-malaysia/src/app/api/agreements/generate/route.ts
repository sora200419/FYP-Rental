import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTenancyAgreement } from '@/lib/gemini';
import { z } from 'zod';

const bodySchema = z.object({
  tenancyId: z.string().min(1),
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
    const { tenancyId } = bodySchema.parse(body);

    // Fetch the full tenancy — verify it belongs to this landlord via the
    // property → landlord chain. Also pull landlord details for the agreement.
    const tenancy = await prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        property: { landlordId: session.user.id },
      },
      include: {
        property: true,
        tenant: {
          select: { name: true, email: true, phone: true },
        },
      },
    });

    if (!tenancy) {
      return NextResponse.json(
        { error: 'Tenancy not found or access denied' },
        { status: 404 },
      );
    }

    // Fetch the landlord's own details to include in the agreement
    const landlord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    });

    if (!landlord) {
      return NextResponse.json(
        { error: 'Landlord not found' },
        { status: 404 },
      );
    }

    // Call Gemini — this is the expensive operation (~3–8 seconds)
    const generated = await generateTenancyAgreement({
      ...tenancy,
      landlord,
    });

    // Upsert: create Agreement if it doesn't exist, replace if it does
    // (supports "Regenerate" without leaving orphaned records)
    const agreement = await prisma.agreement.upsert({
      where: { tenancyId },
      create: {
        tenancyId,
        rawContent: generated.rawContent,
        plainLanguageSummary: generated.plainLanguageSummary,
        redFlags: generated.redFlags,
        status: 'DRAFT',
      },
      update: {
        rawContent: generated.rawContent,
        plainLanguageSummary: generated.plainLanguageSummary,
        redFlags: generated.redFlags,
        status: 'DRAFT', // Reset to DRAFT on regeneration
        updatedAt: new Date(),
      },
      select: { id: true, status: true, createdAt: true },
    });

    return NextResponse.json(
      { message: 'Agreement generated successfully', agreement },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : 'Failed to generate agreement';
    console.error('Agreement generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
