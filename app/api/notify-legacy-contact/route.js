import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { contactName, contactEmail, userName, isPrimary } = await request.json()

    await resend.emails.send({
      from: 'TimeCapsule <hello@mytimecapsule.app>',
      to: contactEmail,
      subject: `💜 You've been named as a legacy contact by ${userName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
          <h1 style="color:#7c3aed;">⏳ TimeCapsule</h1>
          <p style="font-size:18px;color:#374151;">Hi <strong>${contactName}</strong>,</p>
          <p style="color:#6b7280;">
            <strong>${userName}</strong> has named you as a ${isPrimary ? '<strong>primary</strong> ' : ''}trusted legacy contact on TimeCapsule.
          </p>
          <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:20px;border-radius:8px;margin:20px 0;">
            <p style="color:#7c3aed;font-weight:bold;margin:0 0 8px;">What this means:</p>
            <p style="color:#6b7280;margin:4px 0;">✅ ${userName} has stored important messages on TimeCapsule for their loved ones.</p>
            <p style="color:#6b7280;margin:4px 0;">✅ These messages will only be released after their passing is verified.</p>
            <p style="color:#6b7280;margin:4px 0;">✅ You are trusted to help with this process when the time comes.</p>
          </div>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="color:#15803d;font-weight:bold;margin:0 0 8px;">No action needed right now.</p>
            <p style="color:#6b7280;margin:0 0 16px;">
              If <strong>${userName}</strong> passes away, please visit the link below to submit proof.
              Our team will personally call you to verify before releasing any messages.
            </p>
            <a href="https://www.mytimecapsule.app/legacy/submit-proof"
              style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Submit Proof of Passing →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:14px;">
            Please save this email for future reference. You may also receive check-in notifications from us.
          </p>
          <hr style="border:none;border-top:1px solid #f3f4f6;margin:32px 0;" />
          <p style="color:#9ca3af;font-size:12px;text-align:center;">
            TimeCapsule · Made with love for families ·
            <a href="https://www.mytimecapsule.app/support" style="color:#7c3aed;">Contact Support</a>
          </p>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}