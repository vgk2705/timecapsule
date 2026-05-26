'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function ManagePlan() {
  const router = useRouter()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      setSubscription(data)
      setLoading(false)
    }
    getSubscription()
  }, [])

  const planConfig = {
    loved: {
      name: 'Loved',
      emoji: '💛',
      color: 'amber',
      features: [
        'Unlimited text capsules',
        'Unlimited words',
        '🎵 Audio messages',
        '🎥 Video messages',
        '2GB media storage',
        'Priority support',
        '6 month grace period',
      ]
    },
    forever: {
      name: 'Forever',
      emoji: '👑',
      color: 'purple',
      features: [
        'Everything in Loved',
        '5GB media storage',
        '10 year storage guaranteed',
        'When I am gone feature',
        'Multiple recipients',
        'Legacy contact',
        'Dedicated support',
      ]
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-gray-400">Loading your plan...</p>
    </div>
  )

  const plan = subscription ? planConfig[subscription.plan] : null

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

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Plan</h1>

        {!subscription || !plan ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-5xl mb-4">🆓</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">You're on the Free plan</h2>
            <p className="text-gray-500 mb-6">Upgrade to unlock audio, video and unlimited capsules.</p>
            <a href="/upgrade" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition">
              Upgrade Now
            </a>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Current plan card */}
            <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
              subscription.plan === 'forever' ? 'border-purple-400' : 'border-amber-400'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{plan.emoji}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{plan.name} Plan</h2>
                    <p className="text-sm text-gray-500 capitalize">{subscription.billing_period} billing</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                  ✅ Active
                </span>
              </div>

              {subscription.current_period_end && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    Next renewal: <strong>{new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </p>
                </div>
              )}

              <ul className="space-y-2 text-sm text-gray-600">
                {plan.features.map((f, i) => (
                  <li key={i}>✅ {f}</li>
                ))}
              </ul>
            </div>

            {/* Payment provider info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">Payment Info</h3>
              <p className="text-sm text-gray-500">
                Managed via <strong>{subscription.payment_provider === 'razorpay' ? 'Razorpay' : 'Stripe'}</strong>
              </p>
              {subscription.razorpay_subscription_id && (
                <p className="text-xs text-gray-400 mt-1">
                  Subscription ID: {subscription.razorpay_subscription_id}
                </p>
              )}
            </div>

            {/* Cancel info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-2">Cancel Subscription</h3>
              <p className="text-sm text-gray-500 mb-4">
                To cancel your subscription or request a refund, please contact our support team. Your text capsules will always be kept safe.
              </p>
              <a href="/support" className="inline-block border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition">
                Contact Support to Cancel
              </a>
            </div>

            {/* Upgrade option */}
            {subscription.plan === 'loved' && (
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                <h3 className="font-bold mb-1">👑 Upgrade to Forever</h3>
                <p className="text-purple-100 text-sm mb-4">Get 5GB storage, When I am gone feature and more.</p>
                <a href="/upgrade" className="inline-block bg-white text-purple-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-50 transition">
                  Upgrade to Forever
                </a>
              </div>
            )}

          </div>
        )}
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