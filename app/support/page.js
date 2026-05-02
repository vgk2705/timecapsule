'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function SupportPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState({ category: 'delivery_issue', subject: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      fetchTickets(data.user.id)
    })
  }, [])

  async function fetchTickets(userId) {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setTickets(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('tickets').insert({
      user_id: user.id,
      email: user.email,
      category: form.category,
      subject: form.subject,
      description: form.description,
      status: 'open'
    })
    if (!error) {
      await fetch('/api/notify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, subject: form.subject, description: form.description, category: form.category })
      })
      setSuccess(true)
      setForm({ category: 'delivery_issue', subject: '', description: '' })
      fetchTickets(user.id)
    }
    setLoading(false)
  }

  const statusConfig = {
    open: { label: 'Open', bg: '#fef3c7', color: '#92400e' },
    in_progress: { label: 'In Progress', bg: '#dbeafe', color: '#1e40af' },
    resolved: { label: 'Resolved', bg: '#dcfce7', color: '#166534' }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-5 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <span className="text-2xl">⏳</span>
          <span className="text-xl font-semibold text-amber-900">TimeCapsule</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full text-sm font-medium transition">
          Dashboard
        </button>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
        <p className="text-gray-500 mb-8">Having an issue? We're here to help.</p>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-10">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Submit a ticket</h2>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-green-700 font-medium text-sm">
              ✅ Ticket submitted! We'll respond to your email soon.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
              >
                <option value="delivery_issue">Capsule not delivered</option>
                <option value="login_problem">Login / Account issue</option>
                <option value="edit_delete">Edit or Delete problem</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description of your issue"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your issue in detail..."
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-vertical"
              />
            </div>

            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-semibold text-sm transition">
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>

        {/* Tickets List */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Your Tickets</h2>
        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 shadow-sm">
            No tickets submitted yet.
          </div>
        ) : (
          tickets.map(ticket => {
            const s = statusConfig[ticket.status] || statusConfig.open
            return (
              <div key={ticket.id} className="bg-white rounded-2xl px-6 py-5 mb-3 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <strong className="text-gray-900">{ticket.subject}</strong>
                  <span style={{ background: s.bg, color: s.color }}
                    className="px-3 py-1 rounded-full text-xs font-bold">
                    {s.label}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-2">{ticket.description}</p>
                <p className="text-gray-300 text-xs">
                  {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )
          })
        )}
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