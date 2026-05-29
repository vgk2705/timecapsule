import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new Response('Invalid token', { status: 400 })
  }

  // Find checkin by token
  const { data: checkin } = await supabase
    .from('checkins')
    .select('*')
    .eq('checkin_token', token)
    .single()

  if (!checkin) {
    return new Response('Token not found', { status: 404 })
  }

  // Reset check-in
  const nextCheckin = new Date()
  nextCheckin.setMonth(nextCheckin.getMonth() + 6)

  await supabase
    .from('checkins')
    .update({
      last_checkin_at: new Date().toISOString(),
      next_checkin_due: nextCheckin.toISOString(),
      missed: false,
      legacy_alert_sent: false,
      checkin_token: crypto.randomUUID() // Rotate token
    })
    .eq('id', checkin.id)

  // Redirect to a nice confirmation page
  return Response.redirect('https://www.mytimecapsule.app/checkin-confirmed')
}