'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const PLANS = [
  {
    key: 'loved_monthly',
    name: 'Loved',
    emoji: '💛',
    price: '₹99',
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
    price: '₹990',
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
    price: '₹249',
    period: 'month',
    features: [
      'Everything in Loved',
      '5GB media storage',
      '10 year storage guaranteed',
      'When I am gone feature',
      'Multiple recipients',
      'Legacy contact',
    ]
  },
  {
    key: 'forever_yearly',
    name: 'Forever Yearly',
    emoji: '👑',
    price: '₹2,490',
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
    })

    // Load Razorpay script
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
      // Create subscription on backend
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

      // Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscriptionId,
        name: 'TimeCapsule',
        description: `${planKey.replace('_', ' ')} Plan`,
        image: 'https://www.mytimecapsule.app/favicon.ico',
        prefill: {
          email: user.email,
          name: user.user_metadata?.name || '',
        },
        theme: { color: '#f59e0b' },
        handler: async function(response) {
          // Payment successful
          alert('🎉 Payment successful! Your plan is being activated...')
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
    }

    setLoading(false)
    setSelectedPlan(null)
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="px-4 md:px-6 py-4 border-b border-amber-100">
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
          <p className="text-gray-500">Unlock audio, video and more for your loved ones</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLANS.map(plan => (
            <div key={plan.key}
              className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
                plan.key.includes('forever') ? 'border-gray-200' : 'border-amber-500'
              }`}>
              <div className="text-3xl mb-2">{plan.emoji}</div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{plan.name}</h2>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-gray-400 text-sm ml-1">/ {plan.period}</span>
                {plan.saving && (
                  <span className="ml-2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                    {plan.saving}
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={loading && selectedPlan === plan.key}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                  plan.key.includes('forever')
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                } disabled:opacity-40`}
              >
                {loading && selectedPlan === plan.key ? 'Processing...' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">
          Secure payments via Razorpay · Cancel anytime · <a href="/terms" className="hover:text-amber-600">Terms apply</a>
        </p>
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <a href="/privacy" className="hover:text-amber-600">Privacy Policy</a>
          <a href="/terms" className="hover:text-amber-600">Terms of Service</a>
          <a href="/data-protection" className="hover:text-amber-600">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}