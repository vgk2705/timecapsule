'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const ADMIN_EMAIL = 'vgkp2705@gmail.com'

export default function AdminLegacy() {
  const [verifications, setVerifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [notes, setNotes] = useState({})
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/'
        return
      }
      fetchVerifications()
    }
    checkAdmin()
  }, [filter])

  const fetchVerifications = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('legacy_verifications')
      .select(`
        *,
        legacy_contacts (
          contact_name,
          contact_email,
          contact_mobile,
          relationship
        )
      `)
      .eq('status', filter)
      .order('submitted_at', { ascending: false })

    setVerifications(data || [])
    setLoading(false)
  }

  const handleApprove = async (verification) => {
    if (!confirm(`Approve and release all legacy capsules for user ${verification.user_id}?`)) return
    setActionLoading(verification.id)

    try {
      // 1. Update verification status
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('legacy_verifications')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: user.email,
          team_notes: notes[verification.id] || '',
          capsules_released_at: new Date().toISOString(),
        })
        .eq('id', verification.id)

      // 2. Release legacy capsules
      const res = await fetch('/api/release-legacy-capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: verification.user_id, verificationId: verification.id })
      })

      const result = await res.json()
      if (result.error) throw new Error(result.error)

      alert(`✅ Approved! ${result.sent} legacy capsules released.`)
      fetchVerifications()
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setActionLoading(null)
  }

  const handleReject = async (verification) => {
    const reason = prompt('Reason for rejection:')
    if (!reason) return
    setActionLoading(verification.id)

    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('legacy_verifications')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        verified_by: user.email,
        team_notes: notes[verification.id] || '',
      })
      .eq('id', verification.id)

    alert('❌ Verification rejected.')
    fetchVerifications()
    setActionLoading(null)
  }

  const handleMarkCalled = async (verification) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('legacy_verifications')
      .update({
        status: 'under_review',
        called_at: new Date().toISOString(),
        called_by: user.email,
        team_notes: notes[verification.id] || '',
      })
      .eq('id', verification.id)

    alert('📞 Marked as called and under review.')
    fetchVerifications()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <span className="text-lg font-semibold text-gray-900">Admin — Legacy Verifications</span>
          </div>
          <div className="flex gap-3">
            <a href="/admin/tickets" className="text-sm text-gray-500 hover:text-gray-700">Tickets</a>
            <a href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm w-fit">
          {['pending', 'under_review', 'verified', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                filter === f ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : verifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <p className="text-gray-400">No {filter} verifications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {verifications.map(v => (
              <div key={v.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        v.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        v.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                        v.status === 'verified' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {v.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        Submitted: {new Date(v.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">User ID: {v.user_id}</p>
                  </div>
                </div>

                {/* Legacy contact details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-700 mb-2">LEGACY CONTACT</p>
                    <p className="font-semibold text-gray-800">{v.legacy_contacts?.contact_name}</p>
                    <p className="text-sm text-gray-600">{v.legacy_contacts?.contact_email}</p>
                    <a href={`tel:${v.legacy_contacts?.contact_mobile}`}
                      className="text-sm text-purple-600 font-bold hover:underline">
                      📞 {v.legacy_contacts?.contact_mobile}
                    </a>
                    <p className="text-xs text-gray-400 mt-1">Relationship: {v.legacy_contacts?.relationship}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">PROOF SUBMITTED</p>
                    <p className="text-sm font-medium text-gray-800 capitalize">{v.proof_type?.replace('_', ' ')}</p>
                    {v.proof_document_url && (
                      <a href={v.proof_document_url} target="_blank" rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm text-purple-600 hover:underline font-medium">
                        📄 View Document →
                      </a>
                    )}
                    {v.proof_document_name && (
                      <p className="text-xs text-gray-400 mt-1">{v.proof_document_name}</p>
                    )}
                  </div>
                </div>

                {/* Team notes */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Team Notes</label>
                  <textarea
                    value={notes[v.id] || v.team_notes || ''}
                    onChange={e => setNotes({ ...notes, [v.id]: e.target.value })}
                    rows={2}
                    placeholder="Add call notes, observations..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                {/* Call tracking */}
                {v.called_at && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
                    📞 Called on {new Date(v.called_at).toLocaleDateString('en-GB')} by {v.called_by}
                  </div>
                )}

                {/* Action buttons */}
                {(v.status === 'pending' || v.status === 'under_review') && (
                  <div className="flex flex-wrap gap-3">
                    {v.status === 'pending' && (
                      <button onClick={() => handleMarkCalled(v)}
                        disabled={actionLoading === v.id}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40">
                        📞 Mark as Called
                      </button>
                    )}
                    <button onClick={() => handleApprove(v)}
                      disabled={actionLoading === v.id}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40">
                      {actionLoading === v.id ? 'Releasing...' : '✅ Approve & Release'}
                    </button>
                    <button onClick={() => handleReject(v)}
                      disabled={actionLoading === v.id}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40">
                      ❌ Reject
                    </button>
                  </div>
                )}

                {v.status === 'verified' && (
                  <div className="text-xs text-green-600">
                    ✅ Verified by {v.verified_by} · Capsules released {v.capsules_released_at ? new Date(v.capsules_released_at).toLocaleDateString('en-GB') : ''}
                  </div>
                )}

                {v.status === 'rejected' && (
                  <div className="text-xs text-red-500">
                    ❌ Rejected by {v.verified_by} · Reason: {v.rejection_reason}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}