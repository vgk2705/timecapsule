import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
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
    const { key } = await request.json()
    if (!key) return Response.json({ error: 'Missing key' }, { status: 400 })

    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_PROOFS,
      Key: key,
    })

    const viewUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }) // 1 hour
    return Response.json({ viewUrl })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}