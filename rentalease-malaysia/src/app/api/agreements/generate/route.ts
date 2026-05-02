// src/app/api/agreements/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTenancyAgreement, translateAgreementOutputs } from '@/lib/gemini';
import { z } from 'zod';

const bodySchema = z.object({
  tenancyId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { tenancyId } = bodySchema.parse(body);

    // Authorization chain: Tenancy → Room → Property → landlordId
    const tenancy = await prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        room: { property: { landlordId: session.user.id } },
      },
      include: {
        room: {
          include: {
            property: true,
          },
        },
        tenant: {
          select: {
            name: true,
            email: true,
            phone: true,
            icNumber: true,
          },
        },
        coTenants: {
          select: { name: true, icNumber: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tenancy)
      return NextResponse.json(
        { error: 'Tenancy not found or access denied' },
        { status: 404 },
      );

    if (tenancy.status === 'INVITED')
      return NextResponse.json(
        {
          error:
            'The tenant has not yet accepted the invitation. Please wait for them to accept before generating an agreement.',
        },
        { status: 409 },
      );

    const landlord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    });

    if (!landlord)
      return NextResponse.json(
        { error: 'Landlord not found' },
        { status: 404 },
      );

    const existingAgreement = await prisma.agreement.findUnique({
      where: { tenancyId },
      select: { negotiationNotes: true, negotiationRound: true },
    });

    // Load wizard preferences — required for generation
    const preferences = await prisma.agreementPreferences.findUnique({
      where: { tenancyId },
    });

    if (!preferences || !preferences.isComplete) {
      return NextResponse.json(
        {
          error:
            'Please complete the Agreement Wizard before generating. The wizard captures the policy decisions needed to produce an accurate agreement.',
          requiresWizard: true,
        },
        { status: 400 },
      );
    }

    const generated = await generateTenancyAgreement({
      id: tenancy.id,
      startDate: tenancy.startDate,
      endDate: tenancy.endDate,
      monthlyRent: tenancy.monthlyRent,
      depositAmount: tenancy.depositAmount,
      property: {
        address: tenancy.room.property.address,
        city: tenancy.room.property.city,
        state: tenancy.room.property.state,
        postcode: tenancy.room.property.postcode,
        type: tenancy.room.property.type,
      },
      // Phase 13: pass all rich room fields so Gemini generates accurate clauses
      room: {
        label: tenancy.room.label,
        bathrooms: tenancy.room.bathrooms,
        roomType: tenancy.room.roomType,
        bathroomType: tenancy.room.bathroomType,
        furnishing: tenancy.room.furnishing,
        maxOccupants: tenancy.room.maxOccupants,
        wifiIncluded: tenancy.room.wifiIncluded,
        waterIncluded: tenancy.room.waterIncluded,
        electricIncluded: tenancy.room.electricIncluded,
        genderPreference: tenancy.room.genderPreference,
        sizeSqFt: tenancy.room.sizeSqFt,
        notes: tenancy.room.notes,
      },
      tenant: tenancy.tenant,
      landlord,
      negotiationContext: existingAgreement?.negotiationNotes ?? null,
      coTenants: tenancy.coTenants,
    }, preferences);

    // Second call: translate summary and red flags into Malay.
    // Failures here are non-blocking — the English generation already succeeded.
    let plainLanguageSummaryMs: string | null = null;
    let redFlagsMs: string | null = null;
    try {
      const translated = await translateAgreementOutputs(
        generated.plainLanguageSummary,
        generated.redFlags,
      );
      plainLanguageSummaryMs = translated.plainLanguageSummaryMs;
      redFlagsMs = translated.redFlagsMs;
    } catch (translationError) {
      console.error('Bilingual translation failed (non-blocking):', translationError);
    }

    const nextRound = (existingAgreement?.negotiationRound ?? 0) + 1;

    const agreement = await prisma.agreement.upsert({
      where: { tenancyId },
      create: {
        tenancyId,
        rawContent: generated.rawContent,
        plainLanguageSummary: generated.plainLanguageSummary,
        plainLanguageSummaryMs,
        redFlags: generated.redFlags,
        redFlagsMs,
        status: 'DRAFT',
        negotiationRound: 1,
      },
      update: {
        rawContent: generated.rawContent,
        plainLanguageSummary: generated.plainLanguageSummary,
        plainLanguageSummaryMs,
        redFlags: generated.redFlags,
        redFlagsMs,
        status: 'DRAFT',
        negotiationNotes: null,
        negotiationRound: nextRound,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        negotiationRound: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'Agreement generated successfully', agreement },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );

    const message =
      error instanceof Error ? error.message : 'Failed to generate agreement';
    console.error('Agreement generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
