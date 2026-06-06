'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [capsules, setCapsules] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editMessage, setEditMessage] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [legacyPlan, setLegacyPlan] = useState(null)
  const [isIndia, setIsIndia] = useState(false)
  const [cancelledSub, setCancelledSub] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      fetchCapsules(user.id)
      fetchSubscription(user.id)
      fetchLegacyPlan(user.id)
      fetchCancelledSub(user.id)
    }
    getUser()

    // Detect India
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => { if (data.country_code === 'IN') setIsIndia(true) })
      .catch(() => {})
  }, [])

  const fetchCapsules = async (userId) => {
    const { data } = await supabase
      .from('capsules')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
    setCapsules(data || [])
    setLoading(false)
  }

  const fetchSubscription = async (userId) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    setSubscription(data || null)
  }

  const fetchCancelledSub = async (userId) => {
    // Check if user has a recently cancelled subscription still in grace period
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'cancelled')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      // Check if within 180 days grace period
      const cancelledDate = new Date(data.updated_at)
      const daysSinceCancelled = Math.floor((new Date() - cancelledDate) / (1000 * 60 * 60 * 24))
      if (daysSinceCancelled < 180) {
        setCancelledSub({ ...data, daysSinceCancelled, daysLeft: 180 - daysSinceCancelled })
      }
    }
  }

  const fetchLegacyPlan = async (userId) => {
    const { data } = await supabase
      .from('legacy_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()
    setLegacyPlan(data || null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this capsule? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('capsules').delete().eq('id', id)
    setCapsules(capsules.filter(c => c.id !== id))
    setDeleting(null)
  }

  const handleEditSave = async (id) => {
    const now = new Date().toISOString()
    await supabase.from('capsules').update({
      message: editMessage, updated_at: now
    }).eq('id', id)
    setCapsules(capsules.map(c => c.id === id ? { ...c, message: editMessage, updated_at: now } : c))
    setEditingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const planConfig = {
    loved: { label: 'Loved 💛', bg: 'bg-amber-100', color: 'text-amber-700' },
    forever: { label: 'Forever 👑', bg: 'bg-gray-100', color: 'text-gray-700' },
    free: { label: 'Free', bg: 'bg-gray-100', color: 'text-gray-600' },
  }

  const currentPlan = subscription?.plan || 'free'
  const planBadge = planConfig[currentPlan] || planConfig.free
  const isPaid = currentPlan !== 'free'

  // Media capsules (audio/video) — for grace period warning
  const mediaCapsules = capsules.filter(c => c.media_type === 'audio' || c.media_type === 'video')

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-gray-400">Loading your capsules...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      {/* Header */}
      <header className="px-4 md:px-6 py-4 md:py-5 border-b border-amber-100 bg-amber-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <span className="text-lg md:text-xl font-semibold text-amber-900">TimeCapsule</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden sm:block text-sm text-gray-500">Hi, {firstName}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${planBadge.bg} ${planBadge.color}`}>
              {planBadge.label}
            </span>
            {legacyPlan && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">
                Legacy 👻
              </span>
            )}
            <a href="/pricing" className="text-sm text-gray-500 hover:text-gray-700 font-medium">Pricing</a>
            <a href="/support" className="text-sm text-amber-600 hover:text-amber-700 font-medium">Support</a>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">Log out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-10">

        {/* Grace period warning — cancelled subscription */}
        {cancelledSub && mediaCapsules.length > 0 && (
          <div className={`rounded-2xl p-4 md:p-5 mb-4 border-2 ${
            cancelledSub.daysLeft <= 30
              ? 'bg-red-50 border-red-300'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`font-bold text-sm ${cancelledSub.daysLeft <= 30 ? 'text-red-700' : 'text-orange-700'}`}>
                  {cancelledSub.daysLeft <= 30 ? '🚨' : '⚠️'} Subscription cancelled — Grace period active
                </p>
                <p className={`text-xs mt-1 ${cancelledSub.daysLeft <= 30 ? 'text-red-600' : 'text-orange-600'}`}>
                  Your <strong>{mediaCapsules.length} audio/video capsule{mediaCapsules.length > 1 ? 's' : ''}</strong> will be deleted in <strong>{cancelledSub.daysLeft} days</strong>.
                  Text capsules are kept forever. ✅
                </p>
              </div>
              <a href="/upgrade"
                className={`px-3 py-2 rounded-xl text-sm font-bold transition flex-shrink-0 ${
                  cancelledSub.daysLeft <= 30
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}>
                Resubscribe
              </a>
            </div>
            {/* Grace period progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Cancelled {cancelledSub.daysSinceCancelled} days ago</span>
                <span>{cancelledSub.daysLeft} days left</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${cancelledSub.daysLeft <= 30 ? 'bg-red-500' : 'bg-orange-400'}`}
                  style={{ width: `${(cancelledSub.daysSinceCancelled / 180) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade banner for free users */}
        {!isPaid && !legacyPlan && !cancelledSub && (
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-4 md:p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-sm">🎵 Want audio & video capsules?</p>
              <p className="text-amber-100 text-xs mt-0.5">
                Upgrade to Loved or Forever — from {isIndia ? '₹99/mo' : '€2.99/mo'}
              </p>
            </div>
            <a href="/upgrade" className="bg-white text-amber-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition flex-shrink-0">
              Upgrade
            </a>
          </div>
        )}

        {/* Active plan banner for paid users */}
        {isPaid && (
          <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 md:p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-sm">
                {currentPlan === 'forever' ? '👑 Forever Plan Active' : '💛 Loved Plan Active'}
              </p>
              <p className="text-green-100 text-xs mt-0.5">
                Audio & video unlocked ·{' '}
                {subscription?.current_period_end
                  ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : 'Active'
                }
              </p>
            </div>
            <a href="/manage-plan" className="bg-white text-green-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-50 transition flex-shrink-0">
              Manage Plan
            </a>
          </div>
        )}

        {/* Legacy plan banner */}
        {legacyPlan && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-4 md:p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-sm">👻 Legacy Plan Active</p>
              <p className="text-purple-100 text-xs mt-0.5">
                When I am gone capsules · {legacyPlan.years_covered} years storage · 1GB
              </p>
            </div>
            <a href="/manage-plan" className="bg-white text-purple-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-50 transition flex-shrink-0">
              Manage
            </a>
          </div>
        )}

        {/* Legacy upsell for all users without legacy plan */}
        {!legacyPlan && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-purple-800 font-bold text-sm">👻 Leave messages for after you're gone</p>
              <p className="text-purple-600 text-xs mt-0.5">
                One-time Legacy plan — from {isIndia ? '₹1,999' : '€59'} based on your age
              </p>
            </div>
            <a href="/legacy-setup" className="bg-purple-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition flex-shrink-0">
              Set Up
            </a>
          </div>
        )}

        {/* Per capsule upsell — for free users or cancelled users with media capsules */}
        {(!isPaid || cancelledSub) && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-blue-800 font-bold text-sm">🎵 Send audio or video — pay per capsule</p>
              <p className="text-blue-600 text-xs mt-0.5">
                No subscription needed · Audio from {isIndia ? '₹99' : '€2.99'} · Video from {isIndia ? '₹299' : '€8.99'}
              </p>
            </div>
            <a href="/upgrade#per-capsule" className="bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition flex-shrink-0">
              Learn More
            </a>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Your Capsules</h1>
          <a href="/create" className="bg-amber-500 hover:bg-amber-600 text-white px-4 md:px-5 py-2 rounded-full text-sm font-medium transition">
            + New capsule
          </a>
        </div>

        {/* Free plan limit warning */}
        {!isPaid && capsules.filter(c => !c.is_legacy).length >= 2 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <p className="text-amber-700 text-sm">
              ⚠️ <strong>{capsules.filter(c => !c.is_legacy).length}/3</strong> free capsules used.
              {capsules.filter(c => !c.is_legacy).length >= 3 ? ' Upgrade to create more.' : ''}
            </p>
            {capsules.filter(c => !c.is_legacy).length >= 3 && (
              <a href="/upgrade" className="text-amber-600 text-sm font-bold hover:underline flex-shrink-0">Upgrade →</a>
            )}
          </div>
        )}

        {capsules.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-gray-400 mb-6">You haven't created any capsules yet.</p>
            <a href="/create" className="bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition">
              Create your first capsule
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {capsules.map(capsule => (
              <div key={capsule.id} className={`bg-white rounded-2xl p-4 md:p-6 shadow-sm ${
                capsule.is_legacy ? 'border-l-4 border-purple-400' : ''
              } ${
                cancelledSub && (capsule.media_type === 'audio' || capsule.media_type === 'video')
                  ? 'border border-orange-200'
                  : ''
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-sm text-amber-600 font-medium">To: {capsule.recipient_name}</p>
                      {capsule.is_legacy && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">👻 Legacy</span>
                      )}
                      {(capsule.media_type === 'audio' || capsule.media_type === 'video') && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          {capsule.media_type === 'audio' ? '🎵 Audio' : '🎥 Video'}
                        </span>
                      )}
                      {cancelledSub && (capsule.media_type === 'audio' || capsule.media_type === 'video') && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                          ⚠️ Deletes in {cancelledSub.daysLeft}d
                        </span>
                      )}
                    </div>
                    {editingId === capsule.id ? (
                      <div className="space-y-3">
                        <textarea value={editMessage} onChange={e => setEditMessage(e.target.value)} rows={4}
                          className="w-full border border-amber-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSave(capsule.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">Save</button>
                          <button onClick={() => setEditingId(null)}
                            className="border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm transition hover:border-gray-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-sm line-clamp-2 break-words">{capsule.message}</p>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 flex-shrink-0">
                    <div className="sm:text-right">
                      <span className={`inline-block text-xs px-3 py-1 rounded-full mb-1 ${
                        capsule.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {capsule.status === 'delivered' ? '✅ Delivered' : '🔒 Locked'}
                      </span>
                      <p className="text-xs text-gray-400 mb-1">
                        {capsule.is_legacy
                          ? '👻 Delivered after passing'
                          : `${capsule.status === 'delivered' ? 'Delivered on' : 'Unlocks'} ${capsule.unlock_date}`
                        }
                      </p>
                      <p className="text-xs text-gray-300 mb-2 sm:mb-3">
                        {capsule.updated_at
                          ? `✏️ Edited ${new Date(capsule.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : `📅 Created ${new Date(capsule.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        }
                      </p>
                    </div>
                    {capsule.status === 'locked' && editingId !== capsule.id && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(capsule.id); setEditMessage(capsule.message) }}
                          className="text-xs text-amber-600 hover:text-amber-700 border border-amber-200 px-3 py-1 rounded-lg transition">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(capsule.id)} disabled={deleting === capsule.id}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-3 py-1 rounded-lg transition">
                          {deleting === capsule.id ? '...' : '🗑️ Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 md:py-8 text-gray-400 text-sm px-4">
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-3">
          <a href="/privacy" className="hover:text-amber-600 transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-amber-600 transition">Terms of Service</a>
          <a href="/data-protection" className="hover:text-amber-600 transition">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}