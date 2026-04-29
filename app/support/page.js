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

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800'
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '700px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ color: '#b45309' }}>⏳ Support</h1>
      <p style={{ color: '#6b7280' }}>Having an issue? Submit a ticket and we'll get back to you.</p>

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', color: '#166534' }}>
          ✅ Ticket submitted! We'll respond to your email soon.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fffbeb', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Category</label>
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            <option value="delivery_issue">Capsule not delivered</option>
            <option value="login_problem">Login / Account issue</option>
            <option value="edit_delete">Edit or Delete problem</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Subject</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief description of your issue"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151' }}>Description</label>
          <textarea
            required
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe your issue in detail..."
            rows={5}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ background: '#b45309', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer' }}
        >
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      <h2 style={{ color: '#374151' }}>Your Tickets</h2>
      {tickets.length === 0 ? (
        <p style={{ color: '#9ca3af' }}>No tickets yet.</p>
      ) : (
        tickets.map(ticket => (
          <div key={ticket.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#1f2937' }}>{ticket.subject}</strong>
              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}
                className={statusColors[ticket.status]}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0 4px' }}>{ticket.description}</p>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>{new Date(ticket.created_at).toLocaleDateString()}</p>
          </div>
        ))
      )}
    </div>
  )
}