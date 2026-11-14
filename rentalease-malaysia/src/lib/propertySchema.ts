import { z } from 'zod';

// Shared by the property create/edit forms and the /api/properties routes.

export const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'W.P. Kuala Lumpur',
  'W.P. Labuan',
  'W.P. Putrajaya',
] as const;

export const PROPERTY_TYPES = [
  'Apartment',
  'Condominium',
  'Terrace House',
  'Semi-Detached House',
  'Bungalow',
  'Studio',
  'Townhouse',
  'Service Apartment',
] as const;

// Property-level fields only — rent, bathrooms etc. live on Room.
export const propertySchema = z.object({
  address: z.string().trim().min(5, 'Please enter a full street address'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().min(1, 'Please select a state'),
  postcode: z.string().regex(/^\d{5}$/, 'Postcode must be exactly 5 digits'),
  type: z.string().min(1, 'Please select a property type'),
  description: z.string().optional(),
});

export type PropertyFormInput = z.input<typeof propertySchema>;
export type PropertyFormValues = z.output<typeof propertySchema>;

export const PROPERTY_LOCATION_FIELDS = ['address', 'city', 'state', 'postcode'] as const;

/**
 * What an edit does to the property's admin verification.
 * - A rejected or revoked listing is resubmitted for review by any edit.
 * - A verified listing must be reviewed again if its location changes;
 *   type/description edits keep it verified.
 * - A listing still waiting for its first review stays waiting.
 */
export function getPropertyEditEffect(input: {
  isVerified: boolean;
  rejectedReason: string | null;
  locationChanged: boolean;
}): { needsReview: boolean } {
  if (input.rejectedReason) return { needsReview: true };
  if (input.isVerified && input.locationChanged) return { needsReview: true };
  return { needsReview: false };
}
