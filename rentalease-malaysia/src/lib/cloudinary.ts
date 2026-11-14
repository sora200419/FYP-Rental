import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

// Initialise once. The SDK reads these credentials from environment variables.
// This file is server-only — never import it from any 'use client' component.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type UploadResult = { url: string; publicId: string };

function toDataUri(fileBuffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
}

// Random public IDs: the uploader's original file name (which can contain a
// person's name or IC number) never ends up in a URL.
function newPublicId(): string {
  return `${Date.now()}-${randomUUID()}`;
}

// ─── Public assets ──────────────────────────────────────────────────────────
// Property photos are meant to be seen. Payment, deposit and refund proofs and
// condition photos are only linked from pages that check ownership.

// Rent payment or deposit proof: a photo of a receipt or a PDF statement.
export async function uploadProofDocument(
  fileBuffer: Buffer,
  mimeType: string,
  folder: 'rentalease/payment-proofs' | 'rentalease/deposit-proofs',
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(toDataUri(fileBuffer, mimeType), {
    folder,
    public_id: newPublicId(),
    resource_type: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

// Deletes a previously uploaded payment/deposit proof from Cloudinary.
// Called when the tenant replaces a proof (e.g. after a rejection).
export async function deletePaymentProof(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

// Condition report photo. Higher resolution limit — detail matters when
// documenting scratches, stains or damage for dispute evidence.
export async function uploadConditionPhoto(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(toDataUri(fileBuffer, mimeType), {
    folder: 'rentalease/conditions',
    public_id: newPublicId(),
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }, { width: 2048, crop: 'limit' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteConditionPhoto(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export async function uploadPropertyPhoto(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(toDataUri(fileBuffer, mimeType), {
    folder: 'rentalease/properties',
    public_id: newPublicId(),
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }, { width: 2048, crop: 'limit' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deletePropertyPhoto(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

// Deposit refund transfer slip (image or PDF), uploaded by the landlord.
export async function uploadRefundProof(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(toDataUri(fileBuffer, mimeType), {
    folder: 'rentalease/refund-proofs',
    public_id: newPublicId(),
    resource_type: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

// ─── Private assets ─────────────────────────────────────────────────────────
// Identity documents (KYC IC front/back and selfie) and signed agreement scans
// (which carry IC numbers and signatures) are uploaded as `authenticated`
// assets. Their stored URL cannot be opened directly; the app hands out a
// short-lived signed link from /api/files/* after checking who is asking.
//
// Assets uploaded before this change are still public (`upload` type). They
// keep working through the same endpoints until
// scripts/make-private-assets.ts converts them.

const PRIVATE_TYPE = 'authenticated' as const;
const SIGNED_LINK_TTL_SECONDS = 5 * 60;

export async function uploadKycImage(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(toDataUri(fileBuffer, mimeType), {
    folder: 'rentalease/kyc',
    public_id: newPublicId(),
    type: PRIVATE_TYPE,
    resource_type: 'image',
    transformation: [{ quality: 'auto' }, { width: 1920, crop: 'limit' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

// Signed hard copy of the agreement: a PDF scan or a phone photo. Cloudinary
// stores PDFs and photos alike as `image` resources.
export async function uploadAgreementSignatureProof(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(toDataUri(fileBuffer, mimeType), {
    folder: 'rentalease/agreement-signature-proofs',
    public_id: newPublicId(),
    type: PRIVATE_TYPE,
    resource_type: 'image',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/** True when a stored Cloudinary URL points at an authenticated (private) asset. */
export function isPrivateAssetUrl(url: string): boolean {
  return url.includes(`/${PRIVATE_TYPE}/`);
}

// File extension from a stored delivery URL, e.g. ".../v123/folder/id.jpg" → "jpg".
export function formatFromAssetUrl(url: string): string | null {
  const match = /\.([a-z0-9]+)(?:\?|$)/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}

/**
 * A link the browser can open for a stored private asset. For assets still
 * stored publicly (uploaded before the switch) the stored URL is returned.
 * Callers must check that the requester may see the file first.
 */
export function getAssetAccessUrl(asset: {
  url: string;
  publicId: string;
  format?: string | null;
}): string {
  if (!isPrivateAssetUrl(asset.url)) return asset.url;

  const format = asset.format ?? formatFromAssetUrl(asset.url) ?? 'jpg';
  return cloudinary.utils.private_download_url(asset.publicId, format, {
    type: PRIVATE_TYPE,
    resource_type: 'image',
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_LINK_TTL_SECONDS,
  });
}

// Deletes a KYC image or signed agreement scan, whichever way it was stored.
export async function deletePrivateAsset(asset: { url: string; publicId: string }): Promise<void> {
  await cloudinary.uploader.destroy(asset.publicId, {
    resource_type: 'image',
    type: isPrivateAssetUrl(asset.url) ? PRIVATE_TYPE : 'upload',
  });
}

/** Converts a public (legacy) asset to authenticated. Used by the one-off migration script. */
export async function makeAssetPrivate(publicId: string): Promise<UploadResult> {
  const result = await cloudinary.uploader.rename(publicId, publicId, {
    resource_type: 'image',
    type: 'upload',
    to_type: PRIVATE_TYPE,
    overwrite: true,
    invalidate: true,
  });
  return { url: result.secure_url, publicId: result.public_id };
}
