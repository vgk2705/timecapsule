// Already have webhook handler
// In razorpay-webhook/route.js when status = cancelled:
// Add this after updating subscription status:

await resend.emails.send({
  from: 'TimeCapsule <hello@mytimecapsule.app>',
  to: userEmail,
  subject: 'Your TimeCapsule subscription has been cancelled',
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #b45309;">⏳ TimeCapsule</h1>
      <p>Hi ${userName},</p>
      <p>Your subscription has been cancelled. Here's what happens next:</p>
      <ul>
        <li>✅ Your <strong>text capsules are kept forever</strong> — no action needed</li>
        <li>⚠️ Your <strong>audio/video files</strong> will be stored for <strong>6 more months</strong></li>
        <li>📅 Media deletion date: <strong>${deletionDate}</strong></li>
      </ul>
      <p>You can resubscribe anytime to keep your media files.</p>
      <a href="https://www.mytimecapsule.app/upgrade" 
        style="background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
        Resubscribe →
      </a>
    </div>
  `
})