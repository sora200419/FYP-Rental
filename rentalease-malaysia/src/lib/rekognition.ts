// Server-only — never import from a 'use client' component. Holds AWS credentials.
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error(
    '[rekognition] Missing required env vars: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY. ' +
    'Face comparison will fail and faceMatchScore will be stored as 0.',
  );
}

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function compareFaces(
  sourceImageBytes: Buffer,
  targetImageBytes: Buffer,
): Promise<number> {
  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceImageBytes },
    TargetImage: { Bytes: targetImageBytes },
    // SimilarityThreshold: 0 — return all matches regardless of confidence so the
    // admin reviewer sees the raw score rather than a binary pass/fail cutoff.
    SimilarityThreshold: 0,
  });

  try {
    const response = await rekognitionClient.send(command);
    const matches = response.FaceMatches ?? [];
    // IC photos contain a single face — the first match is the only relevant one.
    if (matches.length === 0) return 0;
    return matches[0].Similarity ?? 0;
  } catch (err) {
    console.error('[rekognition] compareFaces failed:', err);
    return 0;
  }
}
