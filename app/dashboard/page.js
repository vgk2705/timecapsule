'use client'
import { useState, useEffect, useRef } from 'react'
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
  const [capsulePayments, setCapsulePayments] = useState({})

  // Filter states
  const [searchName, setSearchName] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Dropdown menu state
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      fetchCapsules(user.id)
      fetchSubscription(user.id)
      fetchLegacyPlan(user.id)
      fetchCancelledSub(user.id)
      fetchCapsulePayments(user.id)
    }
    getUser()

    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => { if (data.country_code === 'IN') setIsIndia(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'cancelled')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
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

  const fetchCapsulePayments = async (userId) => {
    const { data } = await supabase
      .from('capsule_payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'paid')
    if (data) {
      const map = {}
      data.forEach(p => { if (p.capsule_id) map[p.capsule_id] = p })
      setCapsulePayments(map)
    }
  }

  const handleDelete = async (capsule) => {
    const hasPayment = capsulePayments[capsule.id]
    const isMediaCapsule = capsule.media_type === 'audio' || capsule.media_type === 'video'
    const isTextCapsule = !capsule.media_type && !capsule.is_legacy

    let confirmMsg = 'Are you sure you want to delete this capsule? This cannot be undone.'

    if (hasPayment) {
      const amount = hasPayment.currency === 'INR' ? `₹${hasPayment.amount}` : `€${hasPayment.amount}`
      const type = isTextCapsule ? 'text' : capsule.media_type
      confirmMsg = `Are you sure you want to delete this ${type} capsule?\n\n⚠️ No refund policy: You paid ${amount} for this capsule. Deleting it will permanently remove it. No refund will be issued.\n\nThis cannot be undone.`
    }

    if (!confirm(confirmMsg)) return
    setDeleting(capsule.id)

    try {
      if (capsule.media_url) {
        // ✅ Extract key robustly — find "media/" in the URL instead of relying on exact env var match
        const mediaIndex = capsule.media_url.indexOf('media/')
        const key = mediaIndex !== -1 ? capsule.media_url.substring(mediaIndex) : capsule.media_url

        const deleteRes = await fetch('/api/delete-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            userId: user.id,
            fileSize: capsule.media_file_size,
            mediaType: capsule.media_type,
            isLegacy: capsule.is_legacy,
          })
        })

        const deleteResult = await deleteRes.json().catch(() => ({}))
        if (deleteResult.error) {
          console.error('R2 delete warning:', deleteResult.error)
          // Don't block capsule deletion from DB even if R2 delete had an issue — but log it for investigation
        }
      }

      if (hasPayment) {
        await supabase.from('capsule_payments').update({ status: 'capsule_deleted' }).eq('id', hasPayment.id)
      }

      await supabase.from('capsules').delete().eq('id', capsule.id)
      setCapsules(capsules.filter(c => c.id !== capsule.id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Error deleting capsule. Please try again.')
    }

    setDeleting(null)
  }

  const handleEditSave = async (id) => {
    const now = new Date().toISOString()
    await supabase.from('capsules').update({ message: editMessage, updated_at: now }).eq('id', id)
    setCapsules(capsules.map(c => c.id === id ? { ...c, message: editMessage, updated_at: now } : c))
    setEditingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const getFilteredCapsules = () => {
    let filtered = [...capsules]

    if (searchName.trim()) {
      filtered = filtered.filter(c =>
        c.recipient_name?.toLowerCase().includes(searchName.trim().toLowerCase())
      )
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus)
    }

    if (filterType !== 'all') {
      if (filterType === 'text') filtered = filtered.filter(c => !c.media_type && !c.is_legacy)
      if (filterType === 'audio') filtered = filtered.filter(c => c.media_type === 'audio')
      if (filterType === 'video') filtered = filtered.filter(c => c.media_type === 'video')
      if (filterType === 'legacy') filtered = filtered.filter(c => c.is_legacy)
    }

    if (filterDate !== 'all') {
      const now = new Date()
      const msPerDay = 1000 * 60 * 60 * 24
      filtered = filtered.filter(c => {
        const created = new Date(c.created_at)
        const diffDays = Math.floor((now - created) / msPerDay)
        if (filterDate === '7') return diffDays <= 7
        if (filterDate === '30') return diffDays <= 30
        if (filterDate === '90') return diffDays <= 90
        if (filterDate === 'thisyear') return created.getFullYear() === now.getFullYear()
        return true
      })
    }

    return filtered
  }

  const filteredCapsules = getFilteredCapsules()

  const activeFilterCount = [
    searchName.trim() !== '',
    filterStatus !== 'all',
    filterType !== 'all',
    filterDate !== 'all',
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchName('')
    setFilterStatus('all')
    setFilterType('all')
    setFilterDate('all')
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
  const mediaCapsules = capsules.filter(c => c.media_type === 'audio' || c.media_type === 'video')

  const nonLegacyCapsules = capsules.filter(c => !c.is_legacy)
  const nonLegacyCount = nonLegacyCapsules.length
  const paidCapsuleCount = Math.max(0, nonLegacyCount - 3)

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
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden sm:block text-sm text-gray-500">Hi, {firstName}</span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${planBadge.bg} ${planBadge.color}`}>
              {planBadge.label}
            </span>
            {legacyPlan && (
              <span className="text-xs px-2 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">
                Legacy 👻
              </span>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-amber-100 transition text-gray-500 text-xl leading-none"
                aria-label="Menu">
                ⋯
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{user?.email}</p>
                  </div>

                  <a href="/manage-plan"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition">
                    <span className="text-base">📋</span> Manage Plan
                  </a>
                  <a href="/account"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition">
                    <span className="text-base">👤</span> Account Settings
                  </a>
                  <a href="/pricing"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition">
                    <span className="text-base">💰</span> Pricing
                  </a>
                  <a href="/support"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 transition">
                    <span className="text-base">💬</span> Support
                  </a>

                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition w-full text-left">
                      <span className="text-base">🚪</span> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-10">

        {/* Grace period warning */}
        {cancelledSub && mediaCapsules.length > 0 && (
          <div className={`rounded-2xl p-4 md:p-5 mb-4 border-2 ${
            cancelledSub.daysLeft <= 30 ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-200'
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
              <a href="/upgrade" className={`px-3 py-2 rounded-xl text-sm font-bold transition flex-shrink-0 ${
                cancelledSub.daysLeft <= 30 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}>Resubscribe</a>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Cancelled {cancelledSub.daysSinceCancelled} days ago</span>
                <span>{cancelledSub.daysLeft} days left</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${cancelledSub.daysLeft <= 30 ? 'bg-red-500' : 'bg-orange-400'}`}
                  style={{ width: `${(cancelledSub.daysSinceCancelled / 180) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade banner */}
        {!isPaid && !legacyPlan && !cancelledSub && (
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-4 md:p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-sm">🎵 Want audio & video capsules?</p>
              <p className="text-amber-100 text-xs mt-0.5">Upgrade to Loved or Forever — from {isIndia ? '₹99/mo' : '€2.99/mo'}</p>
            </div>
            <a href="/upgrade" className="bg-white text-amber-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition flex-shrink-0">Upgrade</a>
          </div>
        )}

        {/* Active plan banner */}
        {isPaid && (
          <div className="bg-gradient-to-r from-green-400 to-green-500 rounded-2xl p-4 md:p-5 mb-4">
            <div className="flex items-center justify-between gap-4">
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
              <div className="flex gap-2 flex-shrink-0">
                <a href="/create" className="bg-white text-green-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-50 transition">
                  + Create
                </a>
                <a href="/manage-plan" className="bg-green-600 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition border border-white/30">
                  Manage
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Legacy plan banner */}
        {legacyPlan && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-4 md:p-5 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-bold text-sm">👻 Legacy Plan Active</p>
                <p className="text-purple-100 text-xs mt-0.5">When I am gone capsules · {legacyPlan.years_covered} years storage · 1GB</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a href="/create?legacy=true" className="bg-white text-purple-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-50 transition">
                  + Create
                </a>
                <a href="/manage-plan" className="bg-purple-700 text-white px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-800 transition border border-white/30">
                  Manage
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Legacy upsell */}
        {!legacyPlan && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-purple-800 font-bold text-sm">👻 Leave messages for after you're gone</p>
              <p className="text-purple-600 text-xs mt-0.5">One-time Legacy plan — from {isIndia ? '₹1,999' : '€19'} based on your age</p>
            </div>
            <a href="/legacy-setup" className="bg-purple-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-purple-700 transition flex-shrink-0">Set Up</a>
          </div>
        )}

        {/* Per capsule upsell */}
        {(!isPaid || cancelledSub) && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-blue-800 font-bold text-sm">🎵 Send audio or video — pay per capsule</p>
              <p className="text-blue-600 text-xs mt-0.5">No subscription needed · Audio from {isIndia ? '₹49' : '€2.49'} · Video from {isIndia ? '₹149' : '€5.99'}</p>
            </div>
            <a href="/upgrade#per-capsule" className="bg-blue-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition flex-shrink-0">Learn More</a>
          </div>
        )}

        {/* Your Capsules header + New capsule button */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            Your Capsules
            {capsules.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({filteredCapsules.length}{filteredCapsules.length !== capsules.length ? ` of ${capsules.length}` : ''})
              </span>
            )}
          </h1>
          <a href="/create" className="bg-amber-500 hover:bg-amber-600 text-white px-4 md:px-5 py-2 rounded-full text-sm font-medium transition">
            + New capsule
          </a>
        </div>

        {/* Smart capsule counter */}
        {!isPaid && (() => {
          if (nonLegacyCount === 0) return null
          if (nonLegacyCount >= 3) return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-amber-700 text-sm font-medium">✅ 3/3 free capsules used</p>
                {paidCapsuleCount > 0 && (
                  <p className="text-amber-600 text-xs mt-0.5">+ {paidCapsuleCount} paid capsule{paidCapsuleCount > 1 ? 's' : ''} created</p>
                )}
              </div>
              <a href="/upgrade" className="text-amber-600 text-sm font-bold hover:underline flex-shrink-0">Upgrade →</a>
            </div>
          )
          if (nonLegacyCount >= 2) return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-700 text-sm">
                ⚠️ <strong>{nonLegacyCount}/3</strong> free capsules used.
                <a href="/upgrade" className="ml-2 font-bold underline">Upgrade for unlimited</a>
              </p>
            </div>
          )
          return null
        })()}

        {/* Filters section */}
        {capsules.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 mb-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  placeholder="Search by recipient name..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {searchName && (
                  <button onClick={() => setSearchName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">
                    ×
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                }`}>
                <span>⚙️</span>
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-white text-amber-600 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'locked', label: '🔒 Locked' },
                        { value: 'delivered', label: '✅ Delivered' },
                      ].map(opt => (
                        <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            filterStatus === opt.value
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'text', label: '📝 Text' },
                        { value: 'audio', label: '🎵 Audio' },
                        { value: 'video', label: '🎥 Video' },
                        { value: 'legacy', label: '👻 Legacy' },
                      ].map(opt => (
                        <button key={opt.value} onClick={() => setFilterType(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            filterType === opt.value
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: 'all', label: 'All time' },
                        { value: '7', label: 'Last 7 days' },
                        { value: '30', label: 'Last 30 days' },
                        { value: '90', label: 'Last 3 months' },
                        { value: 'thisyear', label: 'This year' },
                      ].map(opt => (
                        <button key={opt.value} onClick={() => setFilterDate(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            filterDate === opt.value
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Showing {filteredCapsules.length} of {capsules.length} capsules
                    </p>
                    <button onClick={clearAllFilters}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                      Clear all filters ×
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Capsule list */}
        {capsules.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-gray-400 mb-6">You haven't created any capsules yet.</p>
            <a href="/create" className="bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition">
              Create your first capsule
            </a>
          </div>
        ) : filteredCapsules.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 font-medium mb-2">No capsules match your filters</p>
            <p className="text-gray-400 text-sm mb-6">Try adjusting your search or filters</p>
            <button onClick={clearAllFilters}
              className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-full text-sm font-medium transition">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCapsules.map(capsule => {
              const hasPayment = capsulePayments[capsule.id]
              const isMediaCapsule = capsule.media_type === 'audio' || capsule.media_type === 'video'
              // ✅ Detect expired/deleted media capsules (file removed after grace period)
              const isExpiredMedia = !capsule.media_type && (
                capsule.message?.startsWith('[Audio message expired') ||
                capsule.message?.startsWith('[Video message expired')
              )
              const isTextCapsule = !capsule.media_type && !capsule.is_legacy && !isExpiredMedia

              return (
                <div key={capsule.id} className={`bg-white rounded-2xl p-4 md:p-6 shadow-sm ${
                  capsule.is_legacy ? 'border-l-4 border-purple-400' : ''
                } ${
                  cancelledSub && isMediaCapsule ? 'border border-orange-200' : ''
                } ${
                  isExpiredMedia ? 'opacity-60' : ''
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-sm text-amber-600 font-medium">To: {capsule.recipient_name}</p>

                        {capsule.is_legacy && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">👻 Legacy</span>
                        )}
                        {isMediaCapsule && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            {capsule.media_type === 'audio' ? '🎵 Audio' : '🎥 Video'}
                          </span>
                        )}
                        {isTextCapsule && hasPayment && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">📝 Text</span>
                        )}
                        {hasPayment && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">💳 Paid</span>
                        )}
                        {cancelledSub && isMediaCapsule && (
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
                        <div>
                          <p className={`text-sm line-clamp-2 break-words ${isExpiredMedia ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                            {capsule.message}
                          </p>
                          {isMediaCapsule && capsule.media_file_name && (
                            <p className="text-xs text-gray-400 mt-1">
                              📁 {capsule.media_file_name}
                              {capsule.media_file_size && ` · ${(capsule.media_file_size / 1024 / 1024).toFixed(1)} MB`}
                            </p>
                          )}
                          {hasPayment && (
                            <p className="text-xs text-gray-400 mt-1">
                              💳 Paid {hasPayment.currency === 'INR' ? '₹' : '€'}{hasPayment.amount} · No refund on delete
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 flex-shrink-0">
                      <div className="sm:text-right">
                        <span className={`inline-block text-xs px-3 py-1 rounded-full mb-1 ${
                          isExpiredMedia ? 'bg-gray-200 text-gray-600' :
                          capsule.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isExpiredMedia ? '🗑️ Removed' : capsule.status === 'delivered' ? '✅ Delivered' : '🔒 Locked'}
                        </span>
                        <p className="text-xs text-gray-400 mb-1">
                          {isExpiredMedia
                            ? '🗑️ File deleted — grace period ended'
                            : capsule.is_legacy
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

                      {capsule.status === 'locked' && !isExpiredMedia && editingId !== capsule.id && (
                        <div className="flex gap-2">
                          {isTextCapsule && !hasPayment && !capsule.is_legacy && (
                            <button onClick={() => { setEditingId(capsule.id); setEditMessage(capsule.message) }}
                              className="text-xs text-amber-600 hover:text-amber-700 border border-amber-200 px-3 py-1 rounded-lg transition">
                              ✏️ Edit
                            </button>
                          )}
                          <button onClick={() => handleDelete(capsule)} disabled={deleting === capsule.id}
                            className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-3 py-1 rounded-lg transition">
                            {deleting === capsule.id ? '...' : '🗑️ Delete'}
                          </button>
                        </div>
                      )}

                      {/* ✅ Expired media — only "Remove from list" option, no Edit */}
                      {isExpiredMedia && editingId !== capsule.id && (
                        <button onClick={() => handleDelete(capsule)} disabled={deleting === capsule.id}
                          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1 rounded-lg transition">
                          {deleting === capsule.id ? '...' : 'Remove from list'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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