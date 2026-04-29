import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  const { email, subject, description, category } = await request.json()

  await resend.emails.send({
    from: 'TimeCapsule Support <hello@mytimecapsule.app>',
    to: 'supportmytimecapsule@gmail.com',
    subject: `🎫 New Support Ticket: ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #b45309;">⏳ New Support Ticket</h1>
        <p><strong>From:</strong> ${email}</p>
        <p><strong>Category:</strong> ${category.replace('_', ' ')}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #1f2937;">${description}</p>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">Login to mytimecapsule.app/admin/tickets to update status.</p>
      </div>
    `
  })

  return new Response('OK', { status: 200 })
}