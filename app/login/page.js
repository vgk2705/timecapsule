'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    })
    setLoading(false)
    if (error) setError(error.message)
    else window.location.href = '/dashboard'
  }

  const handleForgotPassword = async () => {
    if (!form.email) { setError('Please enter your email first.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: 'https://mytimecapsule.app/reset-password'
    })
    if (error) setError(error.message)
    else setResetSent(true)
  }

  if (resetSent) return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm">We sent a password reset link to <strong>{form.email}</strong>. Check your inbox!</p>
          <a href="/login" className="inline-block mt-6 text-amber-600 hover:underline text-sm">Back to login</a>
        </div>
      </div>
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

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 w-full max-w-md">
          <div className="text-3xl mb-2">⏳</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-8">Log in to see your capsules.</p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type="password"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="your password"
              />
            </div>
            <div className="text-right">
              <button onClick={handleForgotPassword} className="text-sm text-amber-600 hover:underline">
                Forgot password?
              </button>
            </div>

            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-4 rounded-xl font-medium transition">
              {loading ? 'Logging in...' : 'Log in'}
            </button>
            <p className="text-center text-sm text-gray-400">
              No account yet? <a href="/signup" className="text-amber-600 hover:underline">Sign up</a>
            </p>
          </div>
        </div>
      </div>

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