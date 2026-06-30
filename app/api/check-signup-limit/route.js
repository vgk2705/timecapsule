import { checkRateLimit, getClientIp } from '../../lib/rateLimit'

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    // Max 5 signups per IP per hour
    const { allowed } = await checkRateLimit(ip, 'signup', 5, 60)

    if (!allowed) {
      return Response.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 })
    }

    return Response.json({ allowed: true })
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Fail open — don't block real users if rate limit check itself breaks
    return Response.json({ allowed: true })
  }
}