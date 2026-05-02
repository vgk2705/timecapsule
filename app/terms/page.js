export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-amber-50">
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: 2 May 2026</p>

        <div className="bg-white rounded-2xl p-8 shadow-sm space-y-8 text-gray-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">1. Acceptance of Terms</h2>
            <p>By using TimeCapsule ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users including free and paid subscribers.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">2. Description of Service</h2>
            <p>TimeCapsule is a time capsule messaging service that allows users to create messages (text, audio, video) to be delivered to recipients on a future date or life milestone. Messages are stored securely and delivered automatically via email.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be at least 18 years old to use the Service</li>
              <li>One account per person — multiple accounts are not permitted</li>
              <li>You must verify your email address before using the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">4. Free Plan Limits</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maximum 3 text capsules on the free plan</li>
              <li>Maximum 5,000 words total across all free capsules</li>
              <li>Text capsules are stored forever at no cost</li>
              <li>Audio and video messaging requires a paid subscription</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">5. Paid Subscriptions</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Loved plan (€2.99/month):</strong> Unlimited text, audio and video capsules, 2GB media storage</li>
              <li><strong>Forever plan (€4.99/month):</strong> Everything in Loved, 5GB storage, When I am gone feature</li>
              <li>Yearly, 5-year and 10-year plans are available at discounted rates</li>
              <li>Multi-year plans are charged as a one-time lump sum</li>
              <li>Subscriptions auto-renew unless cancelled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">6. Refund Policy</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You may request a refund at any time</li>
              <li>Refunds are calculated from the date of your request</li>
              <li>You will be charged only for the months you have used</li>
              <li>After a refund, text capsules are kept forever</li>
              <li>Audio and video media is stored for 6 months after refund, then permanently deleted</li>
              <li>To request a refund, email <a href="mailto:hello@mytimecapsule.app" className="text-amber-600">hello@mytimecapsule.app</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">7. Media Storage</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Audio and video capsules are stored only while your subscription is active</li>
              <li>If your subscription lapses, media is retained for 6 months then deleted</li>
              <li>Text capsules are never deleted regardless of subscription status</li>
              <li>Storage limits: 2GB (Loved), 5GB (Forever)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">8. Prohibited Content</h2>
            <p>You may not use TimeCapsule to send content that is:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Illegal, harmful, threatening or abusive</li>
              <li>Harassing or hateful toward any individual or group</li>
              <li>Sexually explicit or involving minors</li>
              <li>Spam or unsolicited commercial messages</li>
              <li>Infringing on intellectual property rights</li>
            </ul>
            <p className="mt-2">We reserve the right to remove content and terminate accounts that violate these rules.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">9. Service Availability</h2>
            <p>We aim to deliver capsules on the scheduled date. However, we cannot guarantee delivery in cases of:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Invalid or changed recipient email addresses</li>
              <li>Emails blocked by recipient spam filters</li>
              <li>Force majeure events beyond our control</li>
            </ul>
            <p className="mt-2">We are not liable for missed deliveries due to these circumstances.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">10. Account Termination</h2>
            <p>You may delete your account at any time by contacting us. We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, text capsules remain accessible to recipients on their unlock date.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">11. Limitation of Liability</h2>
            <p>TimeCapsule is provided "as is". We are not liable for indirect, incidental or consequential damages arising from use of the service. Our total liability is limited to the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">12. Governing Law</h2>
            <p>These terms are governed by the laws of the Netherlands. Any disputes shall be resolved in Dutch courts.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">13. Contact</h2>
            <p>For questions about these terms: <a href="mailto:hello@mytimecapsule.app" className="text-amber-600">hello@mytimecapsule.app</a></p>
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