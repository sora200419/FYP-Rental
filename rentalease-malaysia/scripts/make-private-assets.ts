/**
 * One-off: converts KYC images and signed agreement scans uploaded before the
 * switch to private storage from public Cloudinary assets to `authenticated`
 * ones, and updates the stored URLs. Safe to run more than once — assets that
 * are already private are skipped.
 *
 *   npx tsx scripts/make-private-assets.ts
 *
 * Needs DATABASE_URL and the CLOUDINARY_* variables of the target environment.
 */
import { PrismaClient } from '@prisma/client';
import { isPrivateAssetUrl, makeAssetPrivate } from '../src/lib/cloudinary';

const prisma = new PrismaClient();

async function convert(url: string, publicId: string): Promise<string | null> {
  if (isPrivateAssetUrl(url)) return null;
  try {
    const result = await makeAssetPrivate(publicId);
    return result.url;
  } catch (error) {
    console.error(`  ! ${publicId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function main() {
  let converted = 0;

  const submissions = await prisma.kycSubmission.findMany();
  console.log(`KYC submissions: ${submissions.length}`);
  for (const s of submissions) {
    const front = await convert(s.icFrontUrl, s.icFrontPublicId);
    const back = await convert(s.icBackUrl, s.icBackPublicId);
    const selfie = await convert(s.selfieUrl, s.selfiePublicId);
    if (front || back || selfie) {
      await prisma.kycSubmission.update({
        where: { id: s.id },
        data: {
          ...(front ? { icFrontUrl: front } : {}),
          ...(back ? { icBackUrl: back } : {}),
          ...(selfie ? { selfieUrl: selfie } : {}),
        },
      });
      converted += [front, back, selfie].filter(Boolean).length;
    }
  }

  const proofs = await prisma.agreementSignatureProof.findMany();
  console.log(`Signature proofs: ${proofs.length}`);
  for (const p of proofs) {
    const url = await convert(p.fileUrl, p.publicId);
    if (url) {
      await prisma.agreementSignatureProof.update({ where: { id: p.id }, data: { fileUrl: url } });
      converted += 1;
    }
  }

  console.log(`Done. Converted ${converted} file(s) to private.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
