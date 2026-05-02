export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-amber-50">
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: 2 May 2026</p>

        <div className="bg-white rounded-2xl p-8 shadow-sm space-y-8 text-gray-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">1. Who We Are</h2>
            <p>TimeCapsule ("we", "our", "us") is operated by Gopala Krishnan Vellingiri, based in the Netherlands. We operate the website <a href="https://mytimecapsule.app" className="text-amber-600">mytimecapsule.app</a>.</p>
            <p className="mt-2">For privacy matters, contact us at: <a href="mailto:hello@mytimecapsule.app" className="text-amber-600">hello@mytimecapsule.app</a></p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">2. What Data We Collect</h2>
            <p>We collect the following personal data when you use our service:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your name and email address (when you sign up)</li>
              <li>Recipient name, email address and date of birth (when you create a capsule)</li>
              <li>Your relationship to the recipient</li>
              <li>Message content (text, and in future audio/video)</li>
              <li>Unlock date for each capsule</li>
              <li>Payment information (processed securely by Lemon Squeezy — we never store card details)</li>
              <li>Support ticket content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">3. Why We Collect Your Data</h2>
            <p>We use your data to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Deliver your time capsule messages on the chosen date</li>
              <li>Manage your account and subscription</li>
              <li>Send you important service notifications</li>
              <li>Respond to your support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-2">Our legal basis for processing is <strong>contract performance</strong> (to deliver the service you signed up for) and <strong>legitimate interest</strong> (to improve our service).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">4. How Long We Keep Your Data</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Text capsules:</strong> Stored forever, even after account cancellation</li>
              <li><strong>Audio/Video capsules:</strong> Stored while your subscription is active + 6 month grace period after cancellation</li>
              <li><strong>Account data:</strong> Deleted within 30 days of account deletion request</li>
              <li><strong>Support tickets:</strong> Retained for 2 years for quality purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">5. Who We Share Your Data With</h2>
            <p>We share your data only with trusted third-party services needed to operate TimeCapsule:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase</strong> — database and authentication (EU servers)</li>
              <li><strong>Resend</strong> — email delivery service</li>
              <li><strong>Vercel</strong> — hosting provider</li>
              <li><strong>Lemon Squeezy</strong> — payment processing</li>
            </ul>
            <p className="mt-2">We never sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">6. Your Rights (GDPR)</h2>
            <p>As an EU resident, you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Access</strong> — request a copy of your personal data</li>
              <li><strong>Rectification</strong> — correct inaccurate data</li>
              <li><strong>Erasure</strong> — request deletion of your data</li>
              <li><strong>Portability</strong> — receive your data in a portable format</li>
              <li><strong>Objection</strong> — object to processing of your data</li>
              <li><strong>Restriction</strong> — request we limit how we use your data</li>
            </ul>
            <p className="mt-2">To exercise any right, email us at <a href="mailto:hello@mytimecapsule.app" className="text-amber-600">hello@mytimecapsule.app</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">7. Cookies</h2>
            <p>We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">8. Data Security</h2>
            <p>All data is encrypted in transit (HTTPS) and at rest. Access to personal data is strictly limited to authorized personnel only. We use industry-standard security practices to protect your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes by email. Continued use of the service after changes means you accept the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">10. Contact & Complaints</h2>
            <p>For privacy concerns: <a href="mailto:hello@mytimecapsule.app" className="text-amber-600">hello@mytimecapsule.app</a></p>
            <p className="mt-2">If you are unhappy with how we handle your data, you have the right to lodge a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) at <a href="https://www.autoriteitpersoonsgegevens.nl" className="text-amber-600" target="_blank">autoriteitpersoonsgegevens.nl</a></p>
          </section>

        </div>
      </main>

      <footer className="text-center py-8 text-gray-400 text-sm mt-8">
        <div className="flex justify-center gap-6 mb-3">
          <a href="/privacy" className="hover:text-amber-600">Privacy Policy</a>
          <a href="/terms" className="hover:text-amber-600">Terms of Service</a>
          <a href="/data-protection" className="hover:text-amber-600">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}