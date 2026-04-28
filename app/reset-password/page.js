'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is in password recovery mode — good, stay on this page
      }
    })
  }, [])

  const handleReset = async () => {
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Password updated!</h1>
        <p className="text-gray-400 text-sm mb-6">You can now log in with your new password.</p>
        <a href="/login" className="bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition">
          Go to login
        </a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="text-3xl mb-2">🔑</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Set new password</h1>
        <p className="text-gray-400 text-sm mb-8">Choose a strong password for your account.</p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="minimum 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
            <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="repeat your password" />
          </div>
          <button onClick={handleReset} disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-medium transition">
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  )
}