import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

export async function POST(request) {
  try {
    const { userId, fileName, fileSize, contentType } = await request.json()

    if (!userId || !fileName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (fileSize > maxSize) {
      return Response.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const key = `proofs/${userId}/${timestamp}_${safeFileName}`

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_PROOFS,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    })

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }) // 15 mins

    return Response.json({
      presignedUrl,
      key,
      // Proof bucket is private — no public URL, admin views via signed URL on demand
    })
  } catch (error) {
    console.error('Proof upload URL error:', error)
    return Response.json({ error: error.message || 'Failed to generate upload URL' }, { status: 500 })
  }
}