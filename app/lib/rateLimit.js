import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Returns { allowed: boolean, remaining: number }
export async function checkRateLimit(ipAddress, action, maxRequests, windowMinutes) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .eq('action', action)
    .gte('created_at', windowStart)

  const currentCount = count || 0

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  // Log this request
  await supabase.from('rate_limits').insert({ ip_address: ipAddress, action })

  return { allowed: true, remaining: maxRequests - currentCount - 1 }
}

export function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}