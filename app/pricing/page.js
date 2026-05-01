'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const PLANS = {
  loved: {
    name: 'Loved',
    emoji: '💛',
    description: 'For families who want to preserve every memory',
    pricing: {
      monthly: { price: 2.99, label: 'month', saving: null },
      yearly: { price: 29.90, label: 'year', saving: '2 months free' },
      fiveYear: { price: 143.52, label: '5 years', saving: '1 year free' },
      tenYear: { price: 287.04, label: '10 years', saving: '2 years free' },
    }
  },
  forever: {
    name: 'Forever',
    emoji: '👑',
    description: 'For those leaving a legacy across generations',
    pricing: {
      monthly: { price: 4.99, label: 'month', saving: null },
      yearly: { price: 49.90, label: 'year', saving: '2 months free' },
      fiveYear: { price: 239.52, label: '5 years', saving: '1 year free' },
      tenYear: { price: 479.04, label: '10 years', saving: '2 years free' },
    }
  }
}

const PERIOD_LABELS = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  fiveYear: '5 Years',
  tenYear: '10 Years',
}

export default function PricingPage() {
  const router = useRouter()
  const [period, setPeriod] = useState('monthly')
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })
  }, [])

  return (
    <div className="min-h-screen bg-amber-50">

      {/* Navbar */}
      <header className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </div>
        <div className="flex gap-3 items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-500">Hi, {user.user_metadata?.name || user.email}</span>
              <a href="/dashboard" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-medium transition">
                Dashboard
              </a>
            </>
          ) : (
            <>
              <a href="/login" className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Log in</a>
              <a href="/signup" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-medium transition">
                Get Started Free
              </a>
            </>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">

        {/* Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, honest pricing</h1>
          <p className="text-gray-500 text-lg">Start free. Upgrade when you're ready to do more.</p>
        </div>

        {/* Billing period toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-sm">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  period === key ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {key !== 'monthly' && (
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    period === key ? 'bg-amber-400 text-white' : 'bg-green-100 text-green-700'
                  }`}>
                    {key === 'yearly' ? '2mo free' : key === 'fiveYear' ? '1yr free' : '2yrs free'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

          {/* Free Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">🆓</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Free</h2>
            <p className="text-gray-400 text-sm mb-6">Try it out, no card needed</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">€0</span>
              <span className="text-gray-400 text-sm ml-1">forever</span>
            </div>
            <a href={user ? '/dashboard' : '/signup'}
              className="block w-full text-center border-2 border-amber-500 text-amber-600 hover:bg-amber-50 py-3 rounded-xl font-medium transition mb-8">
              {user ? 'Go to Dashboard' : 'Get started free'}
            </a>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>✅ 3 text capsules</li>
              <li>✅ 5,000 words total</li>
              <li>✅ Text stored forever</li>
              <li>✅ Email delivery</li>
              <li>✅ All milestones</li>
              <li className="text-gray-300">❌ Audio messages</li>
              <li className="text-gray-300">❌ Video messages</li>
              <li className="text-gray-300">❌ Media storage</li>
              <li className="text-gray-300">❌ When I am gone</li>
            </ul>
          </div>

          {/* Loved Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border-2 border-amber-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full">
              MOST POPULAR
            </div>
            <div className="text-3xl mb-3">💛</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Loved</h2>
            <p className="text-gray-400 text-sm mb-6">For families preserving every memory</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                €{PLANS.loved.pricing[period].price.toFixed(2)}
              </span>
              <span className="text-gray-400 text-sm ml-1">/ {PLANS.loved.pricing[period].label}</span>
              {PLANS.loved.pricing[period].saving && (
                <div className="mt-2 inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full ml-2">
                  {PLANS.loved.pricing[period].saving}
                </div>
              )}
            </div>
            <a href={user ? '/dashboard' : '/signup'}
              className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-medium transition mb-8">
              {user ? 'Upgrade to Loved' : 'Start Loved plan'}
            </a>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>✅ Unlimited text capsules</li>
              <li>✅ Unlimited words</li>
              <li>✅ 🎵 Audio messages</li>
              <li>✅ 🎥 Video messages</li>
              <li>✅ 2GB media storage</li>
              <li>✅ All milestones + custom dates</li>
              <li>✅ Priority support</li>
              <li>✅ 6 month grace period</li>
              <li className="text-gray-300">❌ When I am gone</li>
              <li className="text-gray-300">❌ Multiple recipients</li>
              <li className="text-gray-300">❌ Legacy contact</li>
            </ul>
          </div>

          {/* Forever Plan */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">👑</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Forever</h2>
            <p className="text-gray-400 text-sm mb-6">For legacies across generations</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">
                €{PLANS.forever.pricing[period].price.toFixed(2)}
              </span>
              <span className="text-gray-400 text-sm ml-1">/ {PLANS.forever.pricing[period].label}</span>
              {PLANS.forever.pricing[period].saving && (
                <div className="mt-2 inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full ml-2">
                  {PLANS.forever.pricing[period].saving}
                </div>
              )}
            </div>
            <a href={user ? '/dashboard' : '/signup'}
              className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-medium transition mb-8">
              {user ? 'Upgrade to Forever' : 'Start Forever plan'}
            </a>
            <ul className="space-y-3 text-sm text-gray-600">
              <li>✅ Everything in Loved</li>
              <li>✅ 5GB media storage</li>
              <li>✅ 10 year storage guaranteed</li>
              <li>✅ 👻 When I am gone feature</li>
              <li>✅ Multiple recipients</li>
              <li>✅ Legacy contact person</li>
              <li>✅ Dedicated support</li>
            </ul>
          </div>

        </div>

        {/* Refund policy */}
        <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="text-3xl mb-3">🛡️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Fair Refund Policy</h3>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            Not happy? Request a refund anytime. You'll only be charged for the months you used.
            After a refund, your text capsules are kept forever. Media capsules are stored for
            6 more months then removed. No questions asked.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { q: 'What happens if I cancel?', a: 'Your text capsules are safe forever. Audio and video are kept for 6 months after cancellation, then removed.' },
            { q: 'Can I upgrade or downgrade anytime?', a: 'Yes! You can switch plans anytime. Billing adjusts from your next payment date.' },
            { q: 'What payment methods are accepted?', a: 'We accept all major cards, UPI, iDEAL, Google Pay, Apple Pay and more — depending on your country.' },
            { q: 'Is my data secure?', a: 'Yes. All capsules are encrypted and stored securely. Only the recipient receives the message on the unlock date.' },
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-2">{faq.q}</h4>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>

      </main>

      <footer className="text-center py-8 text-gray-400 text-sm mt-8">
        © 2025 TimeCapsule · Made with love for families
      </footer>

    </div>
  )
}