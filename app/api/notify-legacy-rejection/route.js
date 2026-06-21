import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { verificationId, category, reason } = await request.json()

    const { data: verification } = await supabase
      .from('legacy_verifications')
      .select('*, legacy_contacts(*)')
      .eq('id', verificationId)
      .single()

    if (!verification || !verification.legacy_contacts) {
      return Response.json({ error: 'Verification or contact not found' }, { status: 404 })
    }

    const contact = verification.legacy_contacts

    const subject = category === 'false_alarm_alive'
      ? '✅ Verification update — good news'
      : '📋 Additional proof needed'

    const body = category === 'false_alarm_alive'
      ? `<div style="font-family:sans-serif;max-width:500px;">
           <p>Hi ${contact.contact_name},</p>
           <p>Following our verification call, we've confirmed everything is fine.</p>
           ${reason ? `<p style="color:#666;font-size:14px;">${reason}</p>` : ''}
           <p>No further action is needed at this time. Thank you for being a trusted legacy contact.</p>
         </div>`
      : `<div style="font-family:sans-serif;max-width:500px;">
           <p>Hi ${contact.contact_name},</p>
           <p>We reviewed the documents submitted, but need additional or clearer proof before we can proceed.</p>
           ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
           <p>Please use the link below to resubmit:</p>
           <a href="https://www.mytimecapsule.app/legacy/submit-proof" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">Resubmit Proof →</a>
         </div>`

    await resend.emails.send({
      from: 'hello@mytimecapsule.app',
      to: contact.contact_email,
      subject,
      html: body,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Notify rejection error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}