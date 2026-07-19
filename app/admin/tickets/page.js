'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ADMIN_EMAIL = 'vgkp2705@gmail.com' // change to your Supabase login email

export default function AdminTickets() {
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) {
        router.push('/')
        return
      }
      fetchTickets()
    })
  }, [])

  async function fetchTickets() {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('tickets').update({ status }).eq('id', id)
    fetchTickets()
  }

  const statusColors = {
    open: '#fef3c7',
    in_progress: '#dbeafe',
    resolved: '#dcfce7'
  }

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh', background: '#f9fafb' }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <span className="text-lg font-semibold text-gray-900">Admin — Support Tickets</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/analytics" className="text-sm text-gray-500 hover:text-gray-700 font-medium">📊 Analytics</a>
            <a href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700 font-medium">👥 Users</a>
            <a href="/admin/legacy" className="text-sm text-gray-500 hover:text-gray-700 font-medium">👻 Legacy</a>
            <a href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700 font-medium">← Dashboard</a>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        {loading ? <p>Loading...</p> : tickets.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No tickets yet.</p>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '20px', marginBottom: '16px', background: statusColors[ticket.status] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ color: '#1f2937', fontSize: '16px' }}>{ticket.subject}</strong>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0' }}>
                    {ticket.email} · {ticket.category?.replace('_', ' ')} · {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                  <p style={{ color: '#374151', marginTop: '8px' }}>{ticket.description}</p>
                </div>
                <select
                  value={ticket.status}
                  onChange={e => updateStatus(ticket.id, e.target.value)}
                  style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', marginLeft: '16px', cursor: 'pointer' }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}