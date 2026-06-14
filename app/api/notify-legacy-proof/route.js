import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { contactName, contactEmail, contactMobile, userId, proofType, notes } = await request.json()

    // Notify admin team
    await resend.emails.send({
      from: 'TimeCapsule <hello@mytimecapsule.app>',
      to: 'supportmytimecapsule@gmail.com',
      subject: '🚨 Legacy Proof Submitted — Action Required',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h1 style="color:#7c3aed;">⚠️ Legacy Verification Required</h1>
          <p>A legacy contact has submitted proof. Please review and call to verify.</p>
          <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px;margin:20px 0;">
            <h3 style="color:#7c3aed;margin-top:0;">Legacy Contact Details</h3>
            <p><strong>Name:</strong> ${contactName}</p>
            <p><strong>Email:</strong> ${contactEmail}</p>
            <p><strong>Mobile:</strong> <strong style="color:#7c3aed;">${contactMobile}</strong></p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Proof Type:</strong> ${proofType?.replace('_', ' ')}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
          <a href="https://www.mytimecapsule.app/admin/legacy"
            style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            → Open Admin Dashboard
          </a>
        </div>
      `
    })

    // Get ALL legacy contacts for this user and notify them too
    const { data: allContacts } = await supabase
      .from('legacy_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .neq('contact_email', contactEmail) // Don't re-notify the submitter

    if (allContacts && allContacts.length > 0) {
      for (const contact of allContacts) {
        await resend.emails.send({
          from: 'TimeCapsule <hello@mytimecapsule.app>',
          to: contact.contact_email,
          subject: '📋 TimeCapsule — Legacy verification in progress',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
              <h1 style="color:#7c3aed;">⏳ TimeCapsule</h1>
              <p>Hi <strong>${contact.contact_name}</strong>,</p>
              <p>This is to inform you that another legacy contact has submitted proof of passing for a TimeCapsule user you are also listed as a contact for.</p>
              <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:20px;border-radius:8px;margin:20px 0;">
                <p style="color:#7c3aed;font-weight:bold;margin:0 0 8px;">Our team is currently verifying the submission.</p>
                <p style="color:#6b7280;margin:0;">You may be contacted by our team for additional verification.</p>
              </div>
              <p style="color:#6b7280;font-size:14px;">If you also want to submit proof, you can do so here:</p>
              <a href="https://www.mytimecapsule.app/legacy/submit-proof"
                style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Submit Proof →
              </a>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
              <p style="color:#9ca3af;font-size:12px;text-align:center;">TimeCapsule · Made with love for families</p>
            </div>
          `
        })
      }
    }

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}