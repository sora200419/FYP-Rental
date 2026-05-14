import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

const MOCK_SCORE = 85.0;

export async function compareFaces(
  sourceImageBytes: Buffer,
  targetImageBytes: Buffer,
): Promise<number> {
  if (process.env.KYC_REKOGNITION_MODE !== 'aws') {
    return MOCK_SCORE;
  }

  const client = new RekognitionClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceImageBytes },
    TargetImage: { Bytes: targetImageBytes },
    SimilarityThreshold: 0,
  });

  const response = await client.send(command);
  const matches = response.FaceMatches ?? [];
  if (matches.length === 0) return 0;
  return matches[0].Similarity ?? 0;
}
