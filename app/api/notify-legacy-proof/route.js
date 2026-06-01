import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { contactName, contactEmail, contactMobile, userId, proofType, notes } = await request.json()

    await resend.emails.send({
      from: 'TimeCapsule <hello@mytimecapsule.app>',
      to: 'supportmytimecapsule@gmail.com',
      subject: '🚨 Legacy Proof Submitted — Action Required',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #7c3aed;">⚠️ Legacy Verification Required</h1>

          <p>A legacy contact has submitted proof of passing. Please review and call to verify.</p>

          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #7c3aed; margin-top: 0;">Legacy Contact Details</h3>
            <p><strong>Name:</strong> ${contactName}</p>
            <p><strong>Email:</strong> ${contactEmail}</p>
            <p><strong>Mobile:</strong> <strong style="color: #7c3aed;">${contactMobile}</strong></p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Proof Type:</strong> ${proofType?.replace('_', ' ')}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>

          <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <h4 style="color: #c2410c; margin-top: 0;">Action Required:</h4>
            <ol style="color: #9a3412; margin: 0; padding-left: 20px;">
              <li>Review the submitted proof document in the admin panel</li>
              <li>Call ${contactMobile} to personally verify</li>
              <li>If verified, approve in the admin dashboard</li>
              <li>Legacy capsules will be automatically released</li>
            </ol>
          </div>

          <a href="https://www.mytimecapsule.app/admin/legacy"
            style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            → Open Admin Dashboard
          </a>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}