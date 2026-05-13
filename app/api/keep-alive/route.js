import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Simple ping to keep database active
  const { data, error } = await supabase
    .from('capsules')
    .select('count')
    .limit(1)

  if (error) return new Response('Error', { status: 500 })
  return new Response('Database active ✅', { status: 200 })
}