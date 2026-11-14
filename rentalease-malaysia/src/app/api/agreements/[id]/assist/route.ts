import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGeminiModel } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { agreementAssistLimit, enforceLimit } from '@/lib/ratelimit';
import { z } from 'zod';

const bodySchema = z.object({
  // Same ceiling the other Gemini calls apply (MAX_AGREEMENT_CHARS_FOR_GEMINI).
  currentContent: z.string().min(1).max(50_000, 'Agreement text is too long for AI assist'),
  instruction: z
    .string()
    .min(10, 'Please describe what you want changed (at least 10 characters)')
    .max(1250, 'Instruction too long - please keep it under 1250 characters'),
});

// POST /api/agreements/[id]/assist
// Accepts the current rawContent and an instruction in English or Bahasa Malaysia.
// Returns an AI-suggested rewrite, but does NOT save it.
// The landlord reviews and chooses to apply or discard.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (session.user.role !== 'LANDLORD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: agreementId } = await params;

  const agreement = await prisma.agreement.findFirst({
    where: {
      id: agreementId,
      tenancy: {
        room: { property: { landlordId: session.user.id } },
      },
    },
    select: { id: true, status: true },
  });

  if (!agreement) {
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );
  }

  if (agreement.status === 'SIGNED' || agreement.status === 'PENDING_SIGNATURE_PROOF') {
    return NextResponse.json(
      { error: 'This agreement has already been signed and cannot be edited.' },
      { status: 409 },
    );
  }

  const { allowed, message } = await enforceLimit(
    agreementAssistLimit,
    `${session.user.id}:${agreementId}`,
    'Too many AI assist requests. Please wait before trying again.',
  );
  if (!allowed) {
    return NextResponse.json({ error: message }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { currentContent, instruction } = bodySchema.parse(body);

    const model = getGeminiModel();

    const prompt = `You are editing a Malaysian residential tenancy agreement.
The landlord may write the instruction in English or Bahasa Malaysia. Interpret
the instruction correctly and apply it to the agreement below.

Keep the agreement text in the same language as the current agreement unless
the instruction explicitly asks for translation or bilingual output.

The landlord wants to make the following specific change:

INSTRUCTION: ${instruction}

Apply ONLY this specific change to the agreement below. Keep all other clauses
exactly as they are. Return ONLY the modified agreement text with no explanation,
no preamble, and no markdown formatting - just the plain agreement text.

CURRENT AGREEMENT:
${currentContent}`;

    const result = await model.generateContent(prompt);
    const suggestedContent = result.response.text().trim();

    if (!suggestedContent || suggestedContent.length < 100) {
      return NextResponse.json(
        { error: 'AI did not return a valid response. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ suggestedContent }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }

    console.error('AI assist error:', error);
    return NextResponse.json(
      { error: 'AI assistance failed. You can still edit manually.' },
      { status: 500 },
    );
  }
}
