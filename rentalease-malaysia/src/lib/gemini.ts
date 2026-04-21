// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isMockGeminiEnabled, getMockAgreement } from './mockGemini';

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
  room: {
    label: string;
    bathrooms: number;
    // Phase 13: Agreement Injection — all room detail fields now passed through
    roomType: string; // MASTER | MEDIUM | SMALL | STUDIO | ENTIRE_UNIT
    bathroomType: string; // ATTACHED | SHARED
    furnishing: string; // FULLY_FURNISHED | PARTIALLY_FURNISHED | UNFURNISHED
    maxOccupants: number;
    wifiIncluded: boolean;
    waterIncluded: boolean;
    electricIncluded: boolean;
    genderPreference: string; // ANY | MALE_ONLY | FEMALE_ONLY
    sizeSqFt: number | null;
    notes: string | null;
  };
  tenant: {
    name: string;
    email: string;
    phone?: string | null;
    icNumber?: string | null; // Malaysian IC — included if tenant has entered it
  };
  landlord: {
    name: string;
    email: string;
    phone?: string | null;
  };
  negotiationContext?: string | null;
}

export interface GeneratedAgreement {
  rawContent: string;
  plainLanguageSummary: string;
  redFlags: string; // JSON-stringified array
}

// ── Enum → human-readable label helpers ────────────────────────────────────
// These convert database enum values into plain English for the Gemini prompt.
// Gemini generates significantly better output when it receives readable text
// rather than raw enum strings like "FULLY_FURNISHED".

function formatRoomType(rt: string): string {
  const map: Record<string, string> = {
    MASTER: 'master room',
    MEDIUM: 'medium-sized room',
    SMALL: 'small/single room',
    STUDIO: 'studio unit',
    ENTIRE_UNIT: 'entire residential unit',
  };
  return map[rt] ?? rt.toLowerCase().replace(/_/g, ' ');
}

function formatBathroomType(bt: string): string {
  return bt === 'ATTACHED' ? 'private attached bathroom' : 'shared bathroom';
}

function formatFurnishing(f: string): string {
  const map: Record<string, string> = {
    FULLY_FURNISHED:
      'fully furnished (includes bed, wardrobe, air conditioning, desk, and standard appliances)',
    PARTIALLY_FURNISHED:
      'partially furnished (wardrobe and/or fan/air conditioning provided; other items by tenant)',
    UNFURNISHED: 'unfurnished (empty room — tenant provides all furniture)',
  };
  return map[f] ?? f.toLowerCase().replace(/_/g, ' ');
}

function formatGenderPreference(g: string): string {
  const map: Record<string, string> = {
    ANY: 'open to any gender',
    MALE_ONLY: 'male occupants only',
    FEMALE_ONLY: 'female occupants only',
  };
  return map[g] ?? g.toLowerCase();
}

function buildUtilitiesClause(
  wifi: boolean,
  water: boolean,
  electric: boolean,
): string {
  const included: string[] = [];
  const excluded: string[] = [];
  if (wifi) included.push('internet/WiFi');
  else excluded.push('internet/WiFi');
  if (water) included.push('water');
  else excluded.push('water');
  if (electric) included.push('electricity');
  else excluded.push('electricity');

  const parts: string[] = [];
  if (included.length > 0)
    parts.push(
      `The following utilities are included in the monthly rent: ${included.join(', ')}.`,
    );
  if (excluded.length > 0)
    parts.push(
      `The following utilities are NOT included and shall be paid separately by the Tenant: ${excluded.join(', ')}.`,
    );
  return parts.join(' ');
}

// ── Main generation function ────────────────────────────────────────────────

export async function generateTenancyAgreement(
  tenancy: TenancyForAgreement,
): Promise<GeneratedAgreement> {
  // ── Mock mode short-circuit ───────────────────────────────────────────────
  // When USE_MOCK_GEMINI=true is set in the environment, return a canned
  // fixture response instead of calling the real Gemini API. This is the
  // development mode that lets us iterate on wizard UI, viewer components,
  // and PDF rendering without burning through free-tier quota or waiting
  // 15 seconds per generation. See src/lib/mockGemini.ts for details on
  // when to use this and when to turn it off.
  //
  // The check happens BEFORE any Gemini SDK initialization or prompt
  // building so mock mode is fully free of real API dependencies. You can
  // run the app with USE_MOCK_GEMINI=true and a blank GEMINI_API_KEY, and
  // agreement generation will still work end-to-end.
  if (isMockGeminiEnabled()) {
    console.log(
      '[Gemini] Mock mode active — returning canned fixture response. ' +
        'Unset USE_MOCK_GEMINI to use the real API.',
    );
    return getMockAgreement();
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
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

  // Build the utilities clause string once — used in the prompt
  const utilitiesClause = buildUtilitiesClause(
    tenancy.room.wifiIncluded,
    tenancy.room.waterIncluded,
    tenancy.room.electricIncluded,
  );

  // Tenant IC — only included in the prompt if the tenant has entered it
  const tenantIcLine = tenancy.tenant.icNumber
    ? `- Tenant IC Number: ${tenancy.tenant.icNumber}`
    : '- Tenant IC Number: Not provided (parties should verify identity separately)';

  // Optional room details section — only rendered if values are meaningful
  const optionalRoomDetails: string[] = [];
  if (tenancy.room.sizeSqFt)
    optionalRoomDetails.push(
      `- Room Size: approximately ${tenancy.room.sizeSqFt} sq ft`,
    );
  if (tenancy.room.notes)
    optionalRoomDetails.push(`- Additional Room Notes: ${tenancy.room.notes}`);

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
Generate a complete residential tenancy agreement using the following details.
All clauses must reflect Malaysian law (Contracts Act 1950, Distress Act 1951, NLC 1965, PDPA 2010).

── PROPERTY DETAILS ──────────────────────────────────────────────────────────
- Property Address: ${tenancy.property.address}, ${tenancy.property.city}, ${tenancy.property.state} ${tenancy.property.postcode}
- Property Type: ${tenancy.property.type}

── RENTED UNIT DETAILS ───────────────────────────────────────────────────────
- Unit Description: ${tenancy.room.label} (${formatRoomType(tenancy.room.roomType)})
- Bathroom: ${formatBathroomType(tenancy.room.bathroomType)} (${tenancy.room.bathrooms} bathroom${tenancy.room.bathrooms > 1 ? 's' : ''})
- Furnishing Level: ${formatFurnishing(tenancy.room.furnishing)}
- Maximum Occupants Permitted: ${tenancy.room.maxOccupants} person${tenancy.room.maxOccupants > 1 ? 's' : ''}
- Gender Restriction: ${formatGenderPreference(tenancy.room.genderPreference)}
${optionalRoomDetails.join('\n')}

── UTILITIES & SERVICES ──────────────────────────────────────────────────────
${utilitiesClause}
The agreement MUST include a dedicated Utilities clause that clearly states which utilities are included in rent and which the Tenant is responsible for. Do not leave this ambiguous.

── PARTIES ───────────────────────────────────────────────────────────────────
- Landlord Name: ${tenancy.landlord.name}
- Landlord Email: ${tenancy.landlord.email}
- Landlord Phone: ${tenancy.landlord.phone ?? 'Not provided'}
- Tenant Name: ${tenancy.tenant.name}
- Tenant Email: ${tenancy.tenant.email}
- Tenant Phone: ${tenancy.tenant.phone ?? 'Not provided'}
${tenantIcLine}

── FINANCIAL TERMS ───────────────────────────────────────────────────────────
- Tenancy Start Date: ${startDate}
- Tenancy End Date: ${endDate}
- Duration: ${durationMonths} months
- Monthly Rent: RM ${monthlyRent}
- Security Deposit: RM ${deposit}

── REQUIRED CLAUSES ──────────────────────────────────────────────────────────
The agreement must include all of the following sections. Write each as a numbered clause:
1. Parties and Property Description
2. Tenancy Period
3. Monthly Rent and Payment Terms
4. Security Deposit and Conditions for Refund
5. Utilities and Services (reflecting the utilities clause above explicitly)
6. Furnishing Inventory Acknowledgement (reflecting the furnishing level above)
7. Permitted Use and Occupancy Limits (reflecting maximum occupants above)
8. Subletting and Transfer Prohibition
9. Maintenance and Repairs
10. Landlord's Right of Entry and Inspection
11. Termination and Notice Period
12. Reinstatement Obligations
13. Governing Law and Dispute Resolution
14. Entire Agreement and Amendments
15. Signature Block (with space for date, signature, and IC/NRIC number for both parties)

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

For "rawContent": Write a complete, professional Malaysian residential tenancy agreement incorporating ALL details above. The furnishing level, utilities, occupancy limit, and bathroom type must appear explicitly in the relevant clauses — do not omit them.

For "plainLanguageSummary": For each numbered clause, write 2-3 sentences in plain English explaining what it means for a layperson tenant or landlord in Malaysia.

For "redFlags": Analyse the agreement and identify clauses that could disadvantage either party or create legal ambiguity under Malaysian law. Pay particular attention to: deposit refund conditions, utility responsibility ambiguity, occupancy limit enforcement, and subletting prohibition scope. Return as a JSON array (can be empty []).
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
