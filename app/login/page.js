'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="text-3xl mb-2">⏳</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
        <p className="text-gray-400 text-sm mb-8">Log in to see your capsules.</p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" value={form.email} onChange={handleChange} type="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="you@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input name="password" value={form.password} onChange={handleChange} type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="your password" />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-medium transition">
            {loading ? 'Logging in...' : 'Log in'}
          </button>
          <p className="text-center text-sm text-gray-400">
            No account yet? <a href="/signup" className="text-amber-600 hover:underline">Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}