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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      fetchCapsules(user.id)
    }
    getUser()
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
      message: editMessage,
      updated_at: now
    }).eq('id', id)
    setCapsules(capsules.map(c => c.id === id ? { ...c, message: editMessage, updated_at: now } : c))
    setEditingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''

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
            <a href="/pricing" className="text-sm text-gray-500 hover:text-gray-700 font-medium">Pricing</a>
            <a href="/support" className="text-sm text-amber-600 hover:text-amber-700 font-medium">Support</a>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">Log out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-10">

        {/* Upgrade banner */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl p-4 md:p-5 mb-6 md:mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-sm">🎵 Want to send audio & video capsules?</p>
            <p className="text-amber-100 text-xs mt-0.5">Upgrade to Loved or Forever — from €2.99/mo</p>
          </div>
          <a href="/pricing" className="bg-white text-amber-600 px-3 md:px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-50 transition flex-shrink-0">
            See Plans
          </a>
        </div>

        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Your Capsules</h1>
          <a href="/create" className="bg-amber-500 hover:bg-amber-600 text-white px-4 md:px-5 py-2 rounded-full text-sm font-medium transition">
            + New capsule
          </a>
        </div>

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
              <div key={capsule.id} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-600 font-medium mb-2">To: {capsule.recipient_name}</p>
                    {editingId === capsule.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={editMessage}
                          onChange={e => setEditMessage(e.target.value)}
                          rows={4}
                          className="w-full border border-amber-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSave(capsule.id)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="border border-gray-200 text-gray-500 px-4 py-2 rounded-xl text-sm transition hover:border-gray-300">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-sm line-clamp-2 break-words">{capsule.message}</p>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 flex-shrink-0">
                    <div className="sm:text-right">
                      <span className={`inline-block text-xs px-3 py-1 rounded-full mb-1 ${
                        capsule.status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {capsule.status === 'delivered' ? '✅ Delivered' : '🔒 Locked'}
                      </span>
                      <p className="text-xs text-gray-400 mb-1">
                        {capsule.status === 'delivered' ? 'Delivered on' : 'Unlocks'} {capsule.unlock_date}
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
                        <button
                          onClick={() => { setEditingId(capsule.id); setEditMessage(capsule.message) }}
                          className="text-xs text-amber-600 hover:text-amber-700 border border-amber-200 px-3 py-1 rounded-lg transition">
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(capsule.id)}
                          disabled={deleting === capsule.id}
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