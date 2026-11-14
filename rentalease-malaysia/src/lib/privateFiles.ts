// Links to private files (KYC images, signed agreement scans). These point at
// /api/files/* routes, which check who is asking and then redirect to a
// short-lived signed Cloudinary link. Safe to import from client components.

export type KycImagePart = 'front' | 'back' | 'selfie';

export const KYC_IMAGE_PARTS: readonly KycImagePart[] = ['front', 'back', 'selfie'];

export function kycImageHref(submissionId: string, part: KycImagePart): string {
  return `/api/files/kyc/${encodeURIComponent(submissionId)}/${part}`;
}

export function signatureProofFileHref(proofId: string): string {
  return `/api/files/signature-proofs/${encodeURIComponent(proofId)}`;
}
