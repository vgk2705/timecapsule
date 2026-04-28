'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [capsules, setCapsules] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      const { data } = await supabase
        .from('capsules')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
      setCapsules(data || [])
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-gray-400">Loading your capsules...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Hi, {user?.user_metadata?.name || user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">Log out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Your Capsules</h1>
          <a href="/create" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-medium transition">
            + New capsule
          </a>
        </div>

        {capsules.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-gray-400 mb-6">You haven't created any capsules yet.</p>
            <a href="/create" className="bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition">
              Create your first capsule
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {capsules.map(capsule => (
              <div key={capsule.id} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-amber-600 font-medium mb-1">To: {capsule.recipient_name}</p>
                    <p className="text-gray-700 text-sm line-clamp-2">{capsule.message}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <span className="inline-block bg-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full">
                      🔒 Locked
                    </span>
                    <p className="text-xs text-gray-400 mt-2">Unlocks {capsule.unlock_date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}