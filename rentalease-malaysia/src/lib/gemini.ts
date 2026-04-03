import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TenancyForAgreement {
  id: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: unknown; // Prisma Decimal comes as unknown
  depositAmount: unknown;
  property: {
    address: string;
    city: string;
    state: string;
    postcode: string;
    type: string;
    bedrooms: number;
    bathrooms: number;
  };
  tenant: {
    name: string;
    email: string;
    phone?: string | null;
  };
  landlord: {
    name: string;
    email: string;
    phone?: string | null;
  };
}

export interface GeneratedAgreement {
  rawContent: string; // Full formal agreement text
  plainLanguageSummary: string; // Clause-by-clause plain English explanation
  redFlags: string; // JSON-stringified array of warning objects
}

export async function generateTenancyAgreement(
  tenancy: TenancyForAgreement,
): Promise<GeneratedAgreement> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // Force JSON output so we can reliably parse the three sections
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const startDate = new Date(tenancy.startDate).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const endDate = new Date(tenancy.endDate).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const monthlyRent = Number(tenancy.monthlyRent).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
  });
  const deposit = Number(tenancy.depositAmount).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
  });

  // Calculate tenancy duration in months for the agreement text
  const durationMonths = Math.round(
    (new Date(tenancy.endDate).getTime() -
      new Date(tenancy.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30.44),
  );

  const prompt = `
You are a Malaysian legal document assistant specializing in residential tenancy agreements.
Your task is to generate a comprehensive tenancy agreement for Malaysian residential rental,
along with a plain-language summary and red-flag analysis.

The tenancy details are:
- Property Address: ${tenancy.property.address}, ${tenancy.property.city}, ${tenancy.property.state} ${tenancy.property.postcode}
- Property Type: ${tenancy.property.type} (${tenancy.property.bedrooms} bedrooms, ${tenancy.property.bathrooms} bathrooms)
- Landlord Name: ${tenancy.landlord.name}
- Landlord Email: ${tenancy.landlord.email}
- Landlord Phone: ${tenancy.landlord.phone ?? 'Not provided'}
- Tenant Name: ${tenancy.tenant.name}
- Tenant Email: ${tenancy.tenant.email}
- Tenant Phone: ${tenancy.tenant.phone ?? 'Not provided'}
- Tenancy Start Date: ${startDate}
- Tenancy End Date: ${endDate}
- Duration: ${durationMonths} months
- Monthly Rent: RM ${monthlyRent}
- Security Deposit: RM ${deposit}

Respond ONLY with a valid JSON object containing exactly these three keys:

{
  "rawContent": "<full formal tenancy agreement text>",
  "plainLanguageSummary": "<plain language explanation of each clause>",
  "redFlags": [
    {
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "clause": "<clause name or number>",
      "issue": "<what the potential problem is>",
      "recommendation": "<what to do about it>"
    }
  ]
}

For "rawContent": Write a complete, formal Malaysian residential tenancy agreement. Include:
1. Parties (Landlord and Tenant details)
2. Property description
3. Tenancy period and renewal terms
4. Rent amount, due date (1st of each month), and late payment penalty (typically 8% per annum in Malaysia)
5. Security deposit terms and conditions for deduction
6. Utilities and maintenance responsibilities
7. Subletting prohibition
8. Access rights for landlord inspection (24-hour notice required)
9. Alterations and modifications clause
10. Termination conditions (typically 2 months notice)
11. Handover and condition report clause
12. Governing law (Laws of Malaysia)
13. Signature block with date lines

For "plainLanguageSummary": For each numbered clause, write 2-3 sentences in plain, simple English 
explaining what it means in practice for both landlord and tenant. Use "This means..." as a starter.
Format as: "Clause [N] - [Title]: [Plain explanation]"

For "redFlags": Analyse the agreement terms and identify any clauses or conditions that could 
disadvantage either party, violate common Malaysian rental practice, or create legal ambiguity.
Consider the Malaysian context: no Residential Tenancy Act exists yet (governed by Contracts Act 1950),
Distress Act 1951, and National Land Code 1965. Flag anything that might be unfair or risky.
Return as a JSON array (can be empty array [] if no red flags found).
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse the JSON response from Gemini
    const parsed = JSON.parse(text);

    // Validate the shape before trusting it
    if (
      !parsed.rawContent ||
      !parsed.plainLanguageSummary ||
      !Array.isArray(parsed.redFlags)
    ) {
      throw new Error('Gemini response missing required fields');
    }

    return {
      rawContent: parsed.rawContent,
      plainLanguageSummary: parsed.plainLanguageSummary,
      // Store redFlags as a JSON string to match the Prisma schema (String? field)
      redFlags: JSON.stringify(parsed.redFlags),
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw new Error('Failed to generate agreement. Please try again.');
  }
}
