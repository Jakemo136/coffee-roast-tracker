import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "coffee-roast-files";

export async function getDownloadUrl(
  fileKey: string,
  fileName: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${fileName}"`,
  });
  return getSignedUrl(r2, command, { expiresIn: 3600 });
}

export async function uploadFile(
  fileKey: string,
  content: string,
  contentType: string
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fileKey,
      Body: content,
      ContentType: contentType,
    })
  );
}

export async function getFileContent(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });
  const response = await r2.send(command);
  return await response.Body!.transformToString("utf-8");
}

export { r2, BUCKET };
