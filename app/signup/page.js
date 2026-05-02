'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function Signup() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [consent, setConsent] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignup = async () => {
    setError('')
    if (!form.name.trim()) { setError('Please enter your name.'); return }
    if (!form.email.trim()) { setError('Please enter your email.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) { setError('Please enter a valid email address.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (!consent) { setError('Please agree to the Terms of Service and Privacy Policy.'); return }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } }
    })
    setLoading(false)
    if (error) setError(error.message)
    else setConfirmed(true)
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-md text-center">
            <div className="text-5xl mb-4">📬</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">Check your email!</h1>
            <p className="text-gray-500 text-sm mb-2">We sent a confirmation link to</p>
            <p className="text-amber-600 font-semibold mb-6">{form.email}</p>
            <p className="text-gray-400 text-sm mb-8">
              Click the link in the email to activate your account, then come back to log in.
            </p>
            <a href="/login" className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-medium transition inline-block">
              Go to Login
            </a>
            <p className="text-gray-400 text-xs mt-6">Can't find the email? Check your spam folder.</p>
          </div>
        </div>
        <footer className="text-center py-8 text-gray-400 text-sm">
          <div className="flex justify-center gap-6 mb-3">
            <a href="/privacy" className="hover:text-amber-600 transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-amber-600 transition">Terms of Service</a>
            <a href="/data-protection" className="hover:text-amber-600 transition">Data Protection</a>
          </div>
          © 2026 TimeCapsule · Made with love for families
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
          <div className="text-3xl mb-2">⏳</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Create your account</h1>
          <p className="text-gray-400 text-sm mb-8">Start leaving messages for the future.</p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name <span className="text-red-500">*</span>
              </label>
              <input name="name" value={form.name} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="e.g. Gopala" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="email" value={form.email} onChange={handleChange} type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="you@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input name="password" value={form.password} onChange={handleChange} type="password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="minimum 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <input name="confirmPassword" value={form.confirmPassword} onChange={handleChange} type="password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="repeat your password" />
            </div>

            {/* Consent checkbox */}
            <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 accent-amber-500 w-4 h-4 flex-shrink-0"
              />
              <label htmlFor="consent" className="text-xs text-gray-500 leading-relaxed">
                I agree to the{' '}
                <a href="/terms" className="text-amber-600 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-amber-600 hover:underline">Privacy Policy</a>.
                I understand my data will be processed as described in the{' '}
                <a href="/data-protection" className="text-amber-600 hover:underline">Data Protection</a> notice.
                <span className="text-red-500"> *</span>
              </label>
            </div>

            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>

            <button
              onClick={handleSignup}
              disabled={loading || !consent}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-4 rounded-xl font-medium transition">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <p className="text-center text-sm text-gray-400">
              Already have an account? <a href="/login" className="text-amber-600 hover:underline">Log in</a>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        <div className="flex justify-center gap-6 mb-3">
          <a href="/privacy" className="hover:text-amber-600 transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-amber-600 transition">Terms of Service</a>
          <a href="/data-protection" className="hover:text-amber-600 transition">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}