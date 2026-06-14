'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const SUBSCRIPTION_PLANS = [
  {
    key: 'loved_monthly',
    name: 'Loved',
    emoji: '💛',
    priceINR: '₹99',
    priceEUR: '€2.99',
    period: 'month',
    features: [
      'Unlimited text capsules',
      'Unlimited words',
      '🎵 Audio messages',
      '🎥 Video messages',
      '2GB media storage',
      'Priority support',
    ]
  },
  {
    key: 'loved_yearly',
    name: 'Loved Yearly',
    emoji: '💛',
    priceINR: '₹990',
    priceEUR: '€29.90',
    period: 'year',
    saving: '2 months free',
    features: [
      'Everything in Loved Monthly',
      'Save ₹198 per year',
    ]
  },
  {
    key: 'forever_monthly',
    name: 'Forever',
    emoji: '👑',
    priceINR: '₹249',
    priceEUR: '€4.99',
    period: 'month',
    features: [
      'Everything in Loved',
      '5GB media storage',
      '10 year storage',
      'Multiple recipients',
      'Legacy contact',
    ]
  },
  {
    key: 'forever_yearly',
    name: 'Forever Yearly',
    emoji: '👑',
    priceINR: '₹2,490',
    priceEUR: '€49.90',
    period: 'year',
    saving: '2 months free',
    features: [
      'Everything in Forever Monthly',
      'Save ₹498 per year',
    ]
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [isIndia, setIsIndia] = useState(true)
  const [currentSub, setCurrentSub] = useState(null)
  const [hasLegacy, setHasLegacy] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
        .single()
      setCurrentSub(sub)

      const { data: legacy } = await supabase
        .from('legacy_plans')
        .select('id')
        .eq('user_id', data.user.id)
        .single()
      setHasLegacy(!!legacy)
    })

    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => { setIsIndia(data.country_code === 'IN') })
      .catch(() => {})

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const handleUpgrade = async (planKey) => {
    if (!user) return
    setLoading(true)
    setSelectedPlan(planKey)

    try {
      const res = await fetch('/api/razorpay-create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.name || '',
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const plan = SUBSCRIPTION_PLANS.find(p => p.key === planKey)

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscriptionId,
        name: 'TimeCapsule',
        description: `${plan.name} Plan`,
        image: 'https://www.mytimecapsule.app/favicon.ico',
        prefill: {
          email: user.email,
          name: user.user_metadata?.name || '',
        },
        theme: { color: '#f59e0b' },
        handler: async function(response) {
          alert('🎉 Payment successful! Your plan is now active.')
          router.push('/dashboard')
        },
        modal: {
          ondismiss: function() {
            setLoading(false)
            setSelectedPlan(null)
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (error) {
      alert('Something went wrong. Please try again.')
      console.error(error)
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  const getPrice = (plan) => isIndia ? plan.priceINR : plan.priceEUR

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="px-4 md:px-6 py-4 border-b border-amber-100 bg-amber-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl">⏳</span>
            <span className="text-lg font-semibold text-amber-900">TimeCapsule</span>
          </div>
          <a href="/dashboard" className="text-sm text-amber-600 hover:underline">← Back to dashboard</a>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Upgrade Your Plan</h1>
          <p className="text-gray-500">Unlock more features for you and your loved ones</p>
          {isIndia && (
            <p className="text-xs text-green-600 mt-2">🇮🇳 Indian pricing · UPI, GPay, Cards accepted</p>
          )}
        </div>

        {currentSub && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-8 text-center">
            <p className="text-green-700 text-sm font-medium">
              ✅ You're currently on the <strong className="capitalize">{currentSub.plan}</strong> plan.
              Upgrading will switch your plan.
            </p>
          </div>
        )}

        {/* Subscription Plans */}
        <h2 className="text-lg font-bold text-gray-800 mb-4">Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {SUBSCRIPTION_PLANS.map(plan => (
            <div key={plan.key}
              className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
                plan.key.includes('forever') ? 'border-gray-200' : 'border-amber-400'
              }`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-2xl mr-2">{plan.emoji}</span>
                  <span className="text-lg font-bold text-gray-800">{plan.name}</span>
                </div>
                {plan.saving && (
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                    {plan.saving}
                  </span>
                )}
              </div>

              <div className="mb-4">
                <span className="text-2xl font-bold text-gray-900">{getPrice(plan)}</span>
                <span className="text-gray-400 text-sm ml-1">/ {plan.period}</span>
              </div>

              <ul className="space-y-1.5 text-sm text-gray-600 mb-5">
                {plan.features.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={loading && selectedPlan === plan.key}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-40 ${
                  plan.key.includes('forever')
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}>
                {loading && selectedPlan === plan.key ? 'Processing...' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* ✅ Per-capsule section — updated with full pricing table */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 md:p-8 mt-8" id="per-capsule">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-3xl">💳</span>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Pay Per Capsule</h2>
              <p className="text-gray-500 text-sm">
                No subscription needed. Pay once per audio or video capsule.
                Price based on file size and how long we store it.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Audio pricing */}
            <div className="bg-white rounded-xl p-4 border border-amber-200">
              <p className="font-bold text-gray-800 mb-3">🎵 Audio (max 50MB)</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Deliver within 1 year', inr: '₹49', eur: '€1.49' },
                  { label: 'Deliver in 1-5 years', inr: '₹99', eur: '€2.99' },
                  { label: 'Deliver in 5-10 years', inr: '₹199', eur: '€5.99' },
                  { label: 'Deliver in 10+ years', inr: '₹399', eur: '€11.99' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold text-gray-800">{isIndia ? row.inr : row.eur}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Video pricing */}
            <div className="bg-white rounded-xl p-4 border border-amber-200">
              <p className="font-bold text-gray-800 mb-3">🎥 Video (by file size)</p>
              <div className="space-y-2 text-xs">
                <p className="font-medium text-gray-600">Up to 100MB:</p>
                {[
                  { label: '1 yr', inr: '₹149', eur: '€4.99' },
                  { label: '5 yr', inr: '₹299', eur: '€8.99' },
                  { label: '10 yr', inr: '₹499', eur: '€16.99' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold">{isIndia ? row.inr : row.eur}</span>
                  </div>
                ))}
                <p className="font-medium text-gray-600 mt-2">101MB - 500MB:</p>
                {[
                  { label: '1 yr', inr: '₹299', eur: '€9.99' },
                  { label: '5 yr', inr: '₹599', eur: '€19.99' },
                  { label: '10 yr', inr: '₹999', eur: '€33.99' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold">{isIndia ? row.inr : row.eur}</span>
                  </div>
                ))}
                <p className="font-medium text-gray-600 mt-2">501MB - 2GB:</p>
                {[
                  { label: '1 yr', inr: '₹599', eur: '€19.99' },
                  { label: '5 yr', inr: '₹1,199', eur: '€39.99' },
                  { label: '10 yr', inr: '₹1,999', eur: '€66.99' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-semibold">{isIndia ? row.inr : row.eur}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <p>⚠️ No refund policy: Payments are non-refundable if the capsule is deleted.</p>
            <p className="mt-1">💡 Subscribe to Loved ({isIndia ? '₹99/mo' : '€2.99/mo'}) for unlimited audio & video capsules.</p>
          </div>
        </div>

        {/* Legacy Plan Section */}
        {!hasLegacy ? (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-6 md:p-8 mt-8">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-4xl">👻</span>
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">Legacy Plan — When I Am Gone</h2>
                <p className="text-gray-500 text-sm">
                  Leave messages to be delivered after you pass away.
                  One-time payment based on your age. No monthly charges ever.
                  Our team personally verifies before releasing your messages.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { age: '20s', inr: '₹4,999', eur: '€149', years: 75 },
                { age: '30s', inr: '₹4,499', eur: '€134', years: 65 },
                { age: '40s', inr: '₹3,999', eur: '€119', years: 55 },
                { age: '50s', inr: '₹3,499', eur: '€104', years: 45 },
                { age: '60s', inr: '₹2,999', eur: '€89', years: 35 },
                { age: '70s', inr: '₹2,499', eur: '€74', years: 25 },
                { age: '80+', inr: '₹1,999', eur: '€59', years: 15 },
              ].map((row, i) => (
                <div key={i} className="bg-white rounded-xl p-3 text-center border border-purple-100">
                  <p className="text-sm font-bold text-purple-700">{row.age}</p>
                  <p className="text-lg font-bold text-gray-900">{isIndia ? row.inr : row.eur}</p>
                  <p className="text-xs text-gray-400">{row.years} yrs</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
              <div className="space-y-1">
                <p>✅ 3 legacy capsules max</p>
                <p>✅ 1GB total storage</p>
                <p>✅ Text + Audio + Video</p>
              </div>
              <div className="space-y-1">
                <p>✅ No monthly charges ever</p>
                <p>✅ 6-month check-in reminders</p>
                <p>✅ Personal team verification call</p>
              </div>
            </div>

            <a href="/legacy-setup"
              className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition">
              Set Up Legacy Plan →
            </a>
          </div>
        ) : (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center mt-8">
            <span className="text-4xl">👻</span>
            <h2 className="text-lg font-bold text-gray-800 mt-3 mb-2">Legacy Plan Active ✅</h2>
            <p className="text-gray-500 text-sm mb-4">Your legacy messages are safely stored.</p>
            <a href="/manage-plan" className="inline-block bg-purple-600 text-white px-6 py-2 rounded-xl font-semibold text-sm hover:bg-purple-700 transition">
              Manage Legacy Plan
            </a>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-8">
          Secure payments via Razorpay ·
          <a href="/terms" className="hover:text-amber-600 ml-1">Terms apply</a> ·
          <a href="/support" className="hover:text-amber-600 ml-1">Need help?</a>
        </p>
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <a href="/privacy" className="hover:text-amber-600 transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-amber-600 transition">Terms of Service</a>
          <a href="/data-protection" className="hover:text-amber-600 transition">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}