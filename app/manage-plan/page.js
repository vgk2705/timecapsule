'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function ManagePlan() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [legacyPlan, setLegacyPlan] = useState(null)
  const [legacyContact, setLegacyContact] = useState(null)
  const [storageUsage, setStorageUsage] = useState(null)
  const [loading, setLoading] = useState(true)

  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [subRes, legacyRes, contactRes, storageRes] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').single(),
        supabase.from('legacy_plans').select('*').eq('user_id', user.id).eq('status', 'active').single(),
        supabase.from('legacy_contacts').select('*').eq('user_id', user.id).single(),
        supabase.from('storage_usage').select('*').eq('user_id', user.id).single(),
      ])

      setSubscription(subRes.data || null)
      setLegacyPlan(legacyRes.data || null)
      setLegacyContact(contactRes.data || null)
      setStorageUsage(storageRes.data || { total_bytes: 0, audio_bytes: 0, video_bytes: 0 })
      setLoading(false)
    }
    getData()
  }, [])

  const handleCancelSubscription = async () => {
    setCancelling(true)
    setCancelError('')
    try {
      const res = await fetch('/api/razorpay-cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.razorpay_subscription_id,
          userId: user.id,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setShowCancelConfirm(false)
      window.location.reload()
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel subscription. Please contact support.')
    }
    setCancelling(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-gray-400">Loading your plan...</p>
    </div>
  )

  const currentPlan = subscription?.plan || 'free'

  // Storage limit calculation
  const limitBytes = currentPlan === 'forever'
    ? 5 * 1024 * 1024 * 1024
    : currentPlan === 'loved'
    ? 2 * 1024 * 1024 * 1024
    : legacyPlan
    ? 1 * 1024 * 1024 * 1024
    : 0

  const usedBytes = storageUsage?.total_bytes || 0
  const usedMB = (usedBytes / 1024 / 1024).toFixed(1)
  const limitGB = limitBytes > 0 ? (limitBytes / 1024 / 1024 / 1024).toFixed(0) : 0
  const percentUsed = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="px-4 md:px-6 py-4 border-b border-amber-100 bg-amber-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl">⏳</span>
            <span className="text-lg font-semibold text-amber-900">TimeCapsule</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/account" className="text-sm text-gray-500 hover:text-gray-700">Account</a>
            <a href="/dashboard" className="text-sm text-amber-600 hover:underline">← Dashboard</a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Plans</h1>

        <div className="space-y-6">

          {/* Subscription plan */}
          {subscription ? (
            <div className={`bg-white rounded-2xl p-6 shadow-sm border-2 ${
              subscription.plan === 'forever' ? 'border-gray-300' : 'border-amber-400'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{subscription.plan === 'forever' ? '👑' : '💛'}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 capitalize">{subscription.plan} Plan</h2>
                    <p className="text-sm text-gray-500 capitalize">{subscription.billing_period} billing</p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">✅ Active</span>
              </div>

              {subscription.current_period_end && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    Next renewal: <strong>{new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  </p>
                </div>
              )}

              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>✅ Unlimited text capsules + unlimited words</li>
                <li>✅ Audio + video messages</li>
                <li>✅ {subscription.plan === 'forever' ? '5GB' : '2GB'} media storage</li>
                {subscription.plan === 'forever' && <li>✅ Multiple recipients per capsule</li>}
              </ul>

              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500 mb-4">
                Via <strong>{subscription.payment_provider === 'razorpay' ? 'Razorpay' : 'Stripe'}</strong>
                {subscription.razorpay_subscription_id && (
                  <span className="text-xs text-gray-400 ml-2">· {subscription.razorpay_subscription_id}</span>
                )}
              </div>

              {/* Cancel subscription flow */}
              {!showCancelConfirm ? (
                <button onClick={() => setShowCancelConfirm(true)}
                  className="inline-block border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition">
                  Cancel subscription
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700 font-bold mb-1">⚠️ Are you sure?</p>
                  <p className="text-xs text-red-600 mb-3">
                    Your audio/video capsules will enter a 180-day grace period. Text capsules are kept forever.
                    You'll lose access to unlimited capsules{subscription.plan === 'forever' ? ' and multiple recipients' : ''} immediately.
                  </p>
                  {cancelError && <p className="text-xs text-red-700 font-medium mb-2">{cancelError}</p>}
                  <div className="flex gap-2">
                    <button onClick={handleCancelSubscription} disabled={cancelling}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-xl text-sm font-semibold transition">
                      {cancelling ? 'Cancelling...' : 'Yes, cancel subscription'}
                    </button>
                    <button onClick={() => { setShowCancelConfirm(false); setCancelError('') }}
                      className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm transition hover:bg-gray-50">
                      Keep my plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm text-center border border-gray-100">
              <div className="text-4xl mb-3">🆓</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Free Plan</h2>
              <p className="text-gray-500 text-sm mb-4">3 text capsules · 5,000 words</p>
              <a href="/upgrade" className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-semibold text-sm transition">
                Upgrade Now
              </a>
            </div>
          )}

          {/* Storage Usage */}
          {(subscription || legacyPlan) && limitBytes > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">💾 Storage Usage</h2>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {usedMB < 1000 ? `${usedMB} MB` : `${(usedMB / 1024).toFixed(2)} GB`} used
                </span>
                <span className="text-gray-400">of {limitGB} GB</span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${
                    percentUsed >= 90 ? 'bg-red-500' : percentUsed >= 70 ? 'bg-orange-400' : 'bg-amber-500'
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 mb-1">🎵 Audio</p>
                  <p className="font-semibold text-gray-700">{((storageUsage?.audio_bytes || 0) / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 mb-1">🎥 Video</p>
                  <p className="font-semibold text-gray-700">{((storageUsage?.video_bytes || 0) / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              </div>

              {usedBytes > limitBytes && (
                <p className="text-xs text-red-600 font-medium mt-3 bg-red-50 border border-red-200 rounded-lg p-2">
                  ⚠️ You're using {(usedBytes / 1024 / 1024 / 1024).toFixed(2)}GB, which is over your current {currentPlan} plan's {limitGB}GB limit.
                  Your existing capsules are safe and won't be deleted, but you can't add new audio/video until you free up space or upgrade.
                </p>
              )}
              {usedBytes <= limitBytes && percentUsed >= 90 && (
                <p className="text-xs text-red-500 mt-3">
                  ⚠️ Almost full! Delete old capsules or upgrade your plan.
                </p>
              )}
            </div>
          )}

          {/* Legacy plan */}
          {legacyPlan ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-purple-400">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👻</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Legacy Plan</h2>
                    <p className="text-sm text-gray-500">One-time · {legacyPlan.years_covered} years storage</p>
                  </div>
                </div>
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">✅ Active</span>
              </div>

              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>✅ 3 legacy capsules</li>
                <li>✅ 1GB total storage</li>
                <li>✅ Audio + video included</li>
                <li>✅ No monthly charges</li>
                <li>✅ Team personal verification</li>
                <li>✅ 6-month check-in reminders</li>
              </ul>

              <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700 mb-4">
                <p>Age group at purchase: <strong>{legacyPlan.user_age_group}</strong></p>
                <p>Storage until: <strong>~{new Date().getFullYear() + legacyPlan.years_covered}</strong></p>
                <p>Paid: <strong>{legacyPlan.currency === 'INR' ? '₹' : '€'}{legacyPlan.amount_paid?.toLocaleString('en-IN')}</strong></p>
              </div>

              {legacyContact && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-4">
                  <p className="font-semibold mb-1">Legacy Contact:</p>
                  <p>{legacyContact.contact_name} · {legacyContact.contact_email}</p>
                  <p>{legacyContact.contact_mobile}</p>
                  <a href="/legacy-setup" className="text-purple-600 text-xs hover:underline">Update contact →</a>
                </div>
              )}

              <a href="/create?legacy=true"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                Create Legacy Capsule →
              </a>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">👻</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">No Legacy Plan Yet</h2>
              <p className="text-gray-500 text-sm mb-4">Leave messages to be delivered after you're gone. One-time payment based on your age.</p>
              <a href="/legacy-setup" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-semibold text-sm transition">
                Set Up Legacy Plan
              </a>
            </div>
          )}

          {/* Upgrade subscription if needed */}
          {subscription?.plan === 'loved' && (
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-2xl p-6 text-white">
              <h3 className="font-bold mb-1">👑 Upgrade to Forever</h3>
              <p className="text-gray-300 text-sm mb-4">Get 5GB storage, multiple recipients and more.</p>
              <a href="/upgrade" className="inline-block bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition">
                Upgrade to Forever
              </a>
            </div>
          )}

        </div>
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