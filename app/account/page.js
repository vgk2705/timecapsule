'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Account() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      setName(user.user_metadata?.name || '')
      setLoading(false)
    }
    getUser()
  }, [])

  const handleSaveName = async () => {
    setNameSaving(true)
    await supabase.auth.updateUser({ data: { name } })
    await supabase.from('users').update({ name }).eq('id', user.id)
    setNameSaving(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 3000)
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setPasswordSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordSuccess(false), 4000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-gray-400">Loading account...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <header className="px-4 md:px-6 py-4 md:py-5 border-b border-amber-100 bg-amber-50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <span className="text-lg md:text-xl font-semibold text-amber-900">TimeCapsule</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700 font-medium">← Dashboard</a>
            <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600">Log out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-6 py-8 md:py-10">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">Account Settings</h1>

        {/* Profile section */}
        <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 mb-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">👤 Profile</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user.email} disabled
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 bg-gray-50" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="Your name" />
          </div>

          <button onClick={handleSaveName} disabled={nameSaving}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
            {nameSaving ? 'Saving...' : nameSaved ? '✅ Saved!' : 'Save changes'}
          </button>
        </div>

        {/* Password section */}
        <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 mb-5">
          <h2 className="text-base font-bold text-gray-800 mb-4">🔒 Change Password</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Re-enter new password" />
            </div>

            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">✅ Password updated successfully!</p>
            )}

            <button onClick={handleChangePassword} disabled={passwordSaving || !newPassword || !confirmPassword}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              {passwordSaving ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-5 md:p-6">
          <h2 className="text-base font-bold text-red-600 mb-2">⚠️ Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Deleting your account will permanently remove all your capsules, subscriptions, and data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 px-4 py-2 rounded-xl transition">
              Delete my account
            </button>
          ) : (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium mb-3">
                Please contact support to delete your account — we want to make sure no scheduled capsules are lost by mistake.
              </p>
              <a href="/support" className="text-sm text-red-600 underline font-medium">Contact support →</a>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm px-4">
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}