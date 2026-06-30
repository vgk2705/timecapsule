import { checkRateLimit, getClientIp } from '../../lib/rateLimit'

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    // Max 10 capsule creations per IP per hour
    const { allowed } = await checkRateLimit(ip, 'create_capsule', 10, 60)

    if (!allowed) {
      return Response.json({ error: 'Too many capsules created recently. Please try again in an hour.' }, { status: 429 })
    }

    return Response.json({ allowed: true })
  } catch (error) {
    console.error('Rate limit check error:', error)
    return Response.json({ allowed: true })
  }
}