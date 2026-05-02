export default function DataProtection() {
  return (
    <div className="min-h-screen bg-amber-50">
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Protection</h1>
        <p className="text-gray-400 text-sm mb-10">How we handle and protect your personal data</p>

        <div className="space-y-6">

          {/* What data banner */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-3xl mb-3">🔐</div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">What personal data we handle</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              {[
                { icon: '👤', label: 'Your name and email address' },
                { icon: '📧', label: "Recipient's name, email and date of birth" },
                { icon: '💌', label: 'Capsule message content' },
                { icon: '❤️', label: 'Your relationship to recipient' },
                { icon: '📅', label: 'Capsule unlock dates' },
                { icon: '💳', label: 'Payment info (via Lemon Squeezy, not stored by us)' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-amber-50 rounded-xl p-3">
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How we protect */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-3xl mb-3">🛡️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">How we protect your data</h2>
            <ul className="space-y-3 text-sm text-gray-600">
              {[
                '✅ All data encrypted in transit using HTTPS/TLS',
                '✅ All data encrypted at rest in Supabase (EU servers)',
                '✅ Row Level Security (RLS) — you can only access your own capsules',
                '✅ Email verification required before account activation',
                '✅ Passwords hashed and never stored in plain text',
                '✅ No advertising or tracking cookies used',
                '✅ Payment data never stored — handled by Lemon Squeezy',
                '✅ Access to personal data strictly limited to authorized personnel',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">{item}</li>
              ))}
            </ul>
          </div>

          {/* Retention */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-3xl mb-3">📅</div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">How long we keep your data</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Text capsules', value: 'Forever — even after cancellation', color: 'text-green-600' },
                { label: 'Audio/Video capsules', value: 'While subscribed + 6 months grace period', color: 'text-amber-600' },
                { label: 'Account data', value: 'Deleted within 30 days of deletion request', color: 'text-blue-600' },
                { label: 'Support tickets', value: 'Retained for 2 years', color: 'text-purple-600' },
                { label: 'Payment records', value: 'As required by law (7 years)', color: 'text-gray-600' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-700 font-medium">{item.label}</span>
                  <span className={`${item.color} font-medium`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Your rights */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-3xl mb-3">⚖️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Your GDPR rights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
              {[
                { right: 'Access', desc: 'Get a copy of your data' },
                { right: 'Rectification', desc: 'Correct inaccurate data' },
                { right: 'Erasure', desc: 'Request deletion of your data' },
                { right: 'Portability', desc: 'Export your data' },
                { right: 'Objection', desc: 'Object to data processing' },
                { right: 'Restriction', desc: 'Limit how we use your data' },
              ].map((item, i) => (
                <div key={i} className="bg-amber-50 rounded-xl p-3">
                  <p className="font-semibold text-gray-800">{item.right}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              To exercise any right, email us at{' '}
              <a href="/support" className="text-amber-600">Contact Support</a>
              We respond within 30 days.
            </p>
          </div>

          {/* Third parties */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="text-3xl mb-3">🤝</div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Third party services we use</h2>
            <div className="space-y-3 text-sm">
              {[
                { name: 'Supabase', role: 'Database & Authentication', location: '🇪🇺 EU' },
                { name: 'Vercel', role: 'Hosting & Deployment', location: '🌍 Global CDN' },
                { name: 'Resend', role: 'Email Delivery', location: '🇺🇸 US (GDPR compliant)' },
                { name: 'Lemon Squeezy', role: 'Payment Processing', location: '🌍 Global' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800">{item.name}</p>
                    <p className="text-gray-400 text-xs">{item.role}</p>
                  </div>
                  <span className="text-gray-500">{item.location}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-4">We never sell your data to third parties.</p>
          </div>

          {/* Contact */}
          <div className="bg-amber-500 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">📬</div>
          <h2 className="text-lg font-bold text-white mb-2">Questions about your data?</h2>
          <p className="text-amber-100 text-sm mb-4">We take data protection seriously. Our support team is here to help.</p>
          <a href="/support"
          className="inline-block bg-white text-amber-600 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-amber-50 transition">
          Contact Support
          </a>
          </div>

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