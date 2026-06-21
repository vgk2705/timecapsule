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
  const [viewingDoc, setViewingDoc] = useState(null)

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

  const handleViewSingleFile = async (verificationId, fileIndex, key) => {
    const loadingId = `${verificationId}-${fileIndex}`
    setViewingDoc(loadingId)
    try {
      const res = await fetch('/api/get-proof-view-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (data.error) {
        alert(`Failed to load document: ${data.error}`)
      } else {
        window.open(data.viewUrl, '_blank')
      }
    } catch (err) {
      alert('Error loading document: ' + err.message)
    }
    setViewingDoc(null)
  }

  const handleApprove = async (verification) => {
    if (!confirm(`Approve and release all legacy capsules for user ${verification.user_id}?`)) return
    setActionLoading(verification.id)

    try {
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
    const isAlive = confirm(
      'Is this rejection because the user is CONFIRMED ALIVE (false alarm)?\n\n' +
      'Click OK → User is ALIVE (resets their check-in cycle, notifies contact everything is fine)\n' +
      'Click Cancel → Proof was just INSUFFICIENT (contact can resubmit better documents)'
    )
    const category = isAlive ? 'false_alarm_alive' : 'insufficient_proof'

    const reason = prompt(
      isAlive
        ? 'Optional note for the legacy contact (e.g. "Confirmed via phone call on [date]"):'
        : 'Reason for rejection (visible to legacy contact, e.g. "Document was unclear, please resubmit a clearer scan"):'
    )
    if (reason === null) return

    setActionLoading(verification.id)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase
        .from('legacy_verifications')
        .update({
          status: 'rejected',
          rejection_reason: reason || (isAlive ? 'Confirmed alive via phone verification' : 'Insufficient proof'),
          rejection_category: category,
          verified_by: user.email,
          verified_at: new Date().toISOString(),
          team_notes: notes[verification.id] || '',
        })
        .eq('id', verification.id)

      if (category === 'false_alarm_alive') {
        const nextCheckin = new Date()
        nextCheckin.setMonth(nextCheckin.getMonth() + 6)
        await supabase
          .from('checkins')
          .update({
            checked_in_at: new Date().toISOString(),
            next_checkin_due: nextCheckin.toISOString(),
            missed: false,
            legacy_alert_sent: false,
          })
          .eq('user_id', verification.user_id)
      }

      await fetch('/api/notify-legacy-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: verification.id,
          category,
          reason: reason || '',
        })
      }).catch(err => console.error('Notify rejection email failed:', err))

      alert(
        category === 'false_alarm_alive'
          ? '✅ Marked as alive. Check-in cycle reset, contact notified.'
          : '❌ Rejected as insufficient proof. Contact notified to resubmit.'
      )
      fetchVerifications()
    } catch (err) {
      alert('Error: ' + err.message)
    }
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
            {verifications.map(v => {
              // ✅ Resolve files: prefer dedicated jsonb column, fallback to old single-url records
              const proofFiles = (v.proof_document_keys && v.proof_document_keys.length > 0)
                ? v.proof_document_keys
                : (v.proof_document_url ? [{ key: v.proof_document_url, name: v.proof_document_name || 'Document', size: v.proof_document_size }] : [])

              return (
                <div key={v.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

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

                    {/* ✅ Proof documents — each file listed individually with its own view button */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2">PROOF SUBMITTED</p>
                      <p className="text-sm font-medium text-gray-800 capitalize mb-2">{v.proof_type?.replace('_', ' ')}</p>

                      {proofFiles.length === 0 ? (
                        <p className="text-xs text-gray-400">No document attached.</p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500">{proofFiles.length} document{proofFiles.length > 1 ? 's' : ''}:</p>
                          {proofFiles.map((file, i) => {
                            const loadingId = `${v.id}-${i}`
                            return (
                              <button
                                key={i}
                                onClick={() => handleViewSingleFile(v.id, i, file.key)}
                                disabled={viewingDoc === loadingId}
                                className="block text-sm text-purple-600 hover:underline font-medium disabled:opacity-50 text-left truncate max-w-full">
                                {viewingDoc === loadingId ? '⏳ Loading...' : `📄 ${file.name}${file.size ? ` (${(file.size / 1024 / 1024).toFixed(1)}MB)` : ''} →`}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

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

                  {v.called_at && (
                    <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
                      📞 Called on {new Date(v.called_at).toLocaleDateString('en-GB')} by {v.called_by}
                    </div>
                  )}

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
                      ❌ Rejected by {v.verified_by} ·{' '}
                      {v.rejection_category === 'false_alarm_alive' ? '🟢 User confirmed alive' : '📋 Insufficient proof'} ·{' '}
                      {v.rejection_reason}
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}