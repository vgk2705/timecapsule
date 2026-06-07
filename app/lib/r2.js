import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

// Upload file to R2
export async function uploadToR2(bucket, key, file, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
  })
  await r2Client.send(command)
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
}

// Delete file from R2
export async function deleteFromR2(bucket, key) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  await r2Client.send(command)
}

// Get signed URL for private files (proof documents)
export async function getSignedUrlForR2(bucket, key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  return await getSignedUrl(r2Client, command, { expiresIn })
}