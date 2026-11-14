import { v2 as cloudinary } from 'cloudinary';

// Initialise once. The SDK reads these credentials from environment variables.
// This file is server-only — never import it from any 'use client' component.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Uploads a tenant-supplied proof document (rent payment or deposit) to the
// given folder. Uses the auto resource type because proofs may be either a
// photo of a receipt or a PDF bank statement.
export async function uploadProofDocument(
  fileBuffer: Buffer,
  mimeType: string,
  folder: 'rentalease/payment-proofs' | 'rentalease/deposit-proofs',
): Promise<{ url: string; publicId: string }> {
  const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

// Uploads a condition report photo to Cloudinary.
// Stored in a separate folder from payment proofs so the
// Cloudinary dashboard stays organised for the landlord.
export async function uploadConditionPhoto(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ url: string; publicId: string }> {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'rentalease/conditions',
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      // Higher resolution limit for condition photos — detail matters
      // when documenting scratches, stains, or damage for dispute evidence
      { width: 2048, crop: 'limit' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

// Deletes a previously uploaded payment/deposit proof from Cloudinary.
// Called when the tenant replaces a proof (e.g. after a rejection).
export async function deletePaymentProof(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export async function deleteConditionPhoto(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

// Uploads a signed agreement proof. Uses auto resource_type because the tenant
// may provide either a PDF scan or phone-captured image of the signed hard copy.
export async function uploadAgreementSignatureProof(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; publicId: string }> {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'rentalease/agreement-signature-proofs',
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

// Uploads a property listing photo to Cloudinary.
export async function uploadPropertyPhoto(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ url: string; publicId: string }> {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'rentalease/properties',
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 2048, crop: 'limit' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deletePropertyPhoto(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export async function uploadKycImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; publicId: string }> {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'rentalease/kyc',
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }, { width: 1920, crop: 'limit' }],
  });

  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteKycImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

// Uploads deposit refund proof (same pattern as payment proof)
export async function uploadRefundProof(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ url: string; publicId: string }> {
  const base64 = fileBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'rentalease/refund-proofs',
    public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1920, crop: 'limit' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
