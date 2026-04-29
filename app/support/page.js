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
    <div style={{ minHeight: '100vh', background: '#fffef0', fontFamily: 'sans-serif' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', background: '#fffef0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => router.push('/')}>
          <span style={{ fontSize: '22px' }}>⏳</span>
          <span style={{ fontWeight: '700', fontSize: '18px', color: '#1a1a1a' }}>TimeCapsule</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '999px', padding: '10px 22px', fontWeight: '600', cursor: 'pointer' }}>
          Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>Support</h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>Having an issue? We're here to help.</p>

        {/* Form Card */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', marginBottom: '40px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', marginBottom: '24px' }}>Submit a ticket</h2>

          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', color: '#166534', fontWeight: '500' }}>
              ✅ Ticket submitted! We'll respond to your email soon.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '15px', background: 'white', outline: 'none' }}
              >
                <option value="delivery_issue">Capsule not delivered</option>
                <option value="login_problem">Login / Account issue</option>
                <option value="edit_delete">Edit or Delete problem</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Subject</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Brief description of your issue"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Description</label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your issue in detail..."
                rows={5}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '15px', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#f59e0b', color: 'white', padding: '14px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer' }}
            >
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>

        {/* Tickets List */}
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', marginBottom: '16px' }}>Your Tickets</h2>
        {tickets.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            No tickets submitted yet.
          </div>
        ) : (
          tickets.map(ticket => {
            const s = statusConfig[ticket.status] || statusConfig.open
            return (
              <div key={ticket.id} style={{ background: 'white', borderRadius: '16px', padding: '20px 24px', marginBottom: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: '#1a1a1a', fontSize: '16px' }}>{ticket.subject}</strong>
                  <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: '700' }}>
                    {s.label}
                  </span>
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px' }}>{ticket.description}</p>
                <p style={{ color: '#d1d5db', fontSize: '12px', margin: 0 }}>{new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}