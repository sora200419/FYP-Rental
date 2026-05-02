import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isMockGeminiEnabled } from '@/lib/mockGemini';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const bodySchema = z.object({
  currentContent: z.string().min(1),
  instruction: z
    .string()
    .min(10, 'Please describe what you want changed (at least 10 characters)')
    .max(500, 'Instruction too long — please keep it under 500 characters'),
});

// POST /api/agreements/[id]/assist
// Accepts the current rawContent and a plain-English instruction.
// Returns an AI-suggested rewrite — but does NOT save it.
// The landlord reviews and chooses to apply or discard.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: agreementId } = await params;

  // Verify landlord owns this agreement
  const agreement = await prisma.agreement.findFirst({
    where: {
      id: agreementId,
      tenancy: {
        room: { property: { landlordId: session.user.id } },
      },
    },
    select: { id: true, status: true },
  });

  if (!agreement)
    return NextResponse.json(
      { error: 'Agreement not found or access denied' },
      { status: 404 },
    );

  if (agreement.status === 'SIGNED')
    return NextResponse.json(
      { error: 'This agreement has already been signed and cannot be edited.' },
      { status: 409 },
    );

  try {
    const body = await request.json();
    const { currentContent, instruction } = bodySchema.parse(body);

    // Mock mode — simulate the edit without calling the real API
    if (isMockGeminiEnabled()) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const mockSuggestion =
        currentContent +
        `\n\n[MOCK AI SUGGESTION] Applied instruction: "${instruction}"\n(This is a simulated suggestion. Set USE_MOCK_GEMINI=false to use real Gemini.)`;
      return NextResponse.json({ suggestedContent: mockSuggestion }, { status: 200 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // The prompt is intentionally focused — we're asking Gemini to apply
    // ONE specific change to an existing document, not to rewrite everything.
    // This is much cheaper in tokens and produces more predictable results.
    const prompt = `You are editing a Malaysian residential tenancy agreement. 
The landlord wants to make the following specific change:

INSTRUCTION: ${instruction}

Apply ONLY this specific change to the agreement below. Keep all other clauses 
exactly as they are. Return ONLY the modified agreement text with no explanation, 
no preamble, and no markdown formatting — just the plain agreement text.

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
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    console.error('AI assist error:', error);
    return NextResponse.json(
      { error: 'AI assistance failed. You can still edit manually.' },
      { status: 500 },
    );
  }
}
