'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const ADMIN_EMAIL = 'vgkp2705@gmail.com'

export default function AdminUsers() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/'
        return
      }
      fetchUsers()
    }
    checkAdmin()
  }, [])

  const fetchUsers = async (search = '') => {
    setLoading(true)
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (search.trim()) {
      query = query.ilike('email', `%${search.trim()}%`)
    }

    const { data } = await query
    setUsers(data || [])
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers(searchEmail)
  }

  const handleSelectUser = async (u) => {
    setSelectedUser(u)
    setDetailLoading(true)

    const [subRes, legacyRes, capsulesRes, paymentsRes, storageRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('legacy_plans').select('*').eq('user_id', u.id).eq('status', 'active').single(),
      supabase.from('capsules').select('id, status, media_type, is_legacy, created_at').eq('sender_id', u.id),
      supabase.from('capsule_payments').select('*').eq('user_id', u.id),
      supabase.from('storage_usage').select('*').eq('user_id', u.id).single(),
    ])

    const capsules = capsulesRes.data || []

    setUserDetail({
      subscription: subRes.data || null,
      legacyPlan: legacyRes.data || null,
      totalCapsules: capsules.length,
      deliveredCapsules: capsules.filter(c => c.status === 'delivered').length,
      lockedCapsules: capsules.filter(c => c.status === 'locked').length,
      textCapsules: capsules.filter(c => !c.media_type && !c.is_legacy).length,
      audioCapsules: capsules.filter(c => c.media_type === 'audio').length,
      videoCapsules: capsules.filter(c => c.media_type === 'video').length,
      legacyCapsules: capsules.filter(c => c.is_legacy).length,
      payments: paymentsRes.data || [],
      storage: storageRes.data || { total_bytes: 0 },
    })

    setDetailLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <span className="text-lg font-semibold text-gray-900">Admin — Users</span>
          </div>
          <div className="flex gap-3">
            <a href="/admin/analytics" className="text-sm text-gray-500 hover:text-gray-700">Analytics</a>
            <a href="/admin/legacy" className="text-sm text-gray-500 hover:text-gray-700">Legacy</a>
            <a href="/admin/tickets" className="text-sm text-gray-500 hover:text-gray-700">Tickets</a>
            <a href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchEmail}
            onChange={e => setSearchEmail(e.target.value)}
            placeholder="Search by email..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
            Search
          </button>
          {searchEmail && (
            <button type="button" onClick={() => { setSearchEmail(''); fetchUsers('') }}
              className="border border-gray-200 text-gray-500 px-4 py-2.5 rounded-xl text-sm transition hover:border-gray-300">
              Clear
            </button>
          )}
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* User list */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase">{users.length} users</p>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {loading ? (
                  <p className="text-gray-400 text-sm p-4">Loading...</p>
                ) : users.length === 0 ? (
                  <p className="text-gray-400 text-sm p-4">No users found.</p>
                ) : (
                  users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-amber-50 transition ${
                        selectedUser?.id === u.id ? 'bg-amber-50' : ''
                      }`}>
                      <p className="text-sm font-medium text-gray-800 truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          u.plan === 'forever' ? 'bg-gray-100 text-gray-700' :
                          u.plan === 'loved' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {u.plan || 'free'}
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* User detail */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-gray-400">Select a user to see details</p>
              </div>
            ) : detailLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-gray-400">Loading user details...</p>
              </div>
            ) : userDetail && (
              <div className="space-y-4">

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-500 mb-1">User</p>
                  <p className="text-lg font-bold text-gray-800">{selectedUser.email}</p>
                  <p className="text-xs text-gray-400 mt-1">ID: {selectedUser.id}</p>
                  <p className="text-xs text-gray-400">Joined: {new Date(selectedUser.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-500 mb-3">Subscription</p>
                  {userDetail.subscription ? (
                    <div className="text-sm">
                      <p>Plan: <strong className="capitalize">{userDetail.subscription.plan}</strong></p>
                      <p>Status: <strong className="capitalize">{userDetail.subscription.status}</strong></p>
                      <p>Billing: <strong className="capitalize">{userDetail.subscription.billing_period}</strong></p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No subscription — free plan</p>
                  )}
                </div>

                {userDetail.legacyPlan && (
                  <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5">
                    <p className="text-sm font-semibold text-purple-700 mb-3">👻 Legacy Plan</p>
                    <p className="text-sm text-purple-800">Age group: {userDetail.legacyPlan.user_age_group}</p>
                    <p className="text-sm text-purple-800">Years covered: {userDetail.legacyPlan.years_covered}</p>
                    <p className="text-sm text-purple-800">Storage used: {((userDetail.legacyPlan.storage_used_bytes || 0) / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-500 mb-3">Capsules</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{userDetail.totalCapsules}</p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{userDetail.deliveredCapsules}</p>
                      <p className="text-xs text-gray-400">Delivered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{userDetail.lockedCapsules}</p>
                      <p className="text-xs text-gray-400">Locked</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">📝 {userDetail.textCapsules} text</span>
                    <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">🎵 {userDetail.audioCapsules} audio</span>
                    <span className="text-xs bg-blue-100 px-2 py-1 rounded-full">🎥 {userDetail.videoCapsules} video</span>
                    <span className="text-xs bg-purple-100 px-2 py-1 rounded-full">👻 {userDetail.legacyCapsules} legacy</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-500 mb-2">Storage Used</p>
                  <p className="text-lg font-bold text-gray-800">
                    {((userDetail.storage.total_bytes || 0) / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <p className="text-sm font-semibold text-gray-500 mb-3">Payment History ({userDetail.payments.length})</p>
                  {userDetail.payments.length === 0 ? (
                    <p className="text-sm text-gray-400">No per-capsule payments.</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetail.payments.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                          <span className="capitalize">{p.media_type} · {p.delivery_years}yr</span>
                          <span className={`font-medium ${p.status === 'paid' ? 'text-green-600' : 'text-gray-400'}`}>
                            {p.currency === 'INR' ? '₹' : '€'}{p.amount} · {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}