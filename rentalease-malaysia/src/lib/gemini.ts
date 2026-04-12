import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface TenancyForAgreement {
  id: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: unknown;
  depositAmount: unknown;
  property: {
    address: string;
    city: string;
    state: string;
    postcode: string;
    type: string;
  };
  // Phase 10: room replaces the old property.bedrooms / property.bathrooms fields
  room: {
    label: string; // e.g. "Entire Unit", "Master Room"
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
  // Passed during re-generation after a negotiation round
  negotiationContext?: string | null;
}

export interface GeneratedAgreement {
  rawContent: string;
  plainLanguageSummary: string;
  redFlags: string; // JSON-stringified array
}

export async function generateTenancyAgreement(
  tenancy: TenancyForAgreement,
): Promise<GeneratedAgreement> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
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
  const durationMonths = Math.round(
    (new Date(tenancy.endDate).getTime() -
      new Date(tenancy.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 30.44),
  );

  // Only inject tenant notes when this is a re-generation after negotiation
  const negotiationBlock = tenancy.negotiationContext
    ? `
IMPORTANT — TENANT-REQUESTED CHANGES:
The tenant has reviewed the previous draft and requested the following changes.
Incorporate these into the revised agreement where legally reasonable:
<TENANT_NOTES>
${tenancy.negotiationContext}
</TENANT_NOTES>
`
    : '';

  const prompt = `
You are a Malaysian legal document assistant specialising in residential tenancy agreements.
${negotiationBlock}
The tenancy details are:
- Property Address: ${tenancy.property.address}, ${tenancy.property.city}, ${tenancy.property.state} ${tenancy.property.postcode}
- Property Type: ${tenancy.property.type}
- Rented Unit: ${tenancy.room.label} (${tenancy.room.bathrooms} bathroom${tenancy.room.bathrooms > 1 ? 's' : ''})
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

For "rawContent": Write a complete, formal Malaysian residential tenancy agreement including all standard clauses (parties, property, period, rent, deposit, utilities, subletting, inspection, termination, governing law, signature block).

For "plainLanguageSummary": For each numbered clause, write 2-3 sentences in plain English explaining what it means in practice.

For "redFlags": Analyse the agreement and identify clauses that could disadvantage either party or create legal ambiguity under Malaysian law (Contracts Act 1950, Distress Act 1951, NLC 1965). Return as a JSON array (can be empty []).
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

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
      redFlags: JSON.stringify(parsed.redFlags),
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw new Error('Failed to generate agreement. Please try again.');
  }
}
