'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const MILESTONES = [
  { id: '18', label: '18th Birthday', emoji: '🎂', description: 'When they become an adult' },
  { id: '21', label: '21st Birthday', emoji: '🎉', description: 'A special coming of age' },
  { id: '25', label: '25th Birthday', emoji: '🌟', description: 'Quarter century milestone' },
  { id: '30', label: '30th Birthday', emoji: '🚀', description: 'Entering a new decade' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', description: 'Pick the graduation date' },
  { id: 'custom', label: 'Custom Date', emoji: '📅', description: 'I will choose the exact date' },
]

function calculateUnlockDate(milestone, dob) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (milestone === '18') return new Date(birth.setFullYear(birth.getFullYear() + 18)).toISOString().split('T')[0]
  if (milestone === '21') return new Date(birth.setFullYear(birth.getFullYear() + 21)).toISOString().split('T')[0]
  if (milestone === '25') return new Date(birth.setFullYear(birth.getFullYear() + 25)).toISOString().split('T')[0]
  if (milestone === '30') return new Date(birth.setFullYear(birth.getFullYear() + 30)).toISOString().split('T')[0]
  return ''
}

export default function CreateCapsule() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    recipientName: '',
    recipientEmail: '',
    recipientDob: '',
    milestone: '',
    unlockDate: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) window.location.href = '/login'
    }
    checkUser()
  }, [])

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value }
    if (e.target.name === 'recipientDob' || e.target.name === 'milestone') {
      const dob = e.target.name === 'recipientDob' ? e.target.value : form.recipientDob
      const milestone = e.target.name === 'milestone' ? e.target.value : form.milestone
      if (!['graduation', 'custom'].includes(milestone)) {
        updated.unlockDate = calculateUnlockDate(milestone, dob)
      }
    }
    setForm(updated)
  }

  const handleMilestone = (id) => {
    const updated = { ...form, milestone: id }
    if (!['graduation', 'custom'].includes(id)) {
      updated.unlockDate = calculateUnlockDate(id, form.recipientDob)
    } else {
      updated.unlockDate = ''
    }
    setForm(updated)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const insertData = {
      recipient_name: form.recipientName,
      recipient_email: form.recipientEmail,
      message: form.message,
      unlock_date: form.unlockDate,
      status: 'locked'
    }
    if (user) insertData.sender_id = user.id
    const { error } = await supabase.from('capsules').insert(insertData)
    setLoading(false)
    if (!error) setSubmitted(true)
    else alert('Something went wrong. Please try again.')
  }

  if (submitted) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="text-center p-10">
        <div className="text-6xl mb-6">💌</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Your capsule is sealed!</h1>
        <p className="text-gray-500 text-lg">It will be delivered to <strong>{form.recipientName}</strong> on <strong>{form.unlockDate}</strong>.</p>
        <div className="flex gap-4 justify-center mt-8">
          <a href="/dashboard" className="bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition">
            View my capsules
          </a>
          <a href="/create" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition">
            Create another
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50 py-12 px-6">
      <div className="max-w-xl mx-auto">
        <a href="/dashboard" className="text-amber-600 text-sm mb-8 inline-block">← Back to dashboard</a>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-amber-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">

          {/* Step 1 — Who is this for */}
          {step === 1 && (
            <div>
              <div className="text-3xl mb-2">👤</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Who is this for?</h1>
              <p className="text-gray-400 text-sm mb-8">Tell us about the person who will receive this message.</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Their name</label>
                  <input name="recipientName" value={form.recipientName} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="e.g. Karsanvidhun" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Their email</label>
                  <input name="recipientEmail" value={form.recipientEmail} onChange={handleChange} type="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="their@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Their date of birth</label>
                  <input name="recipientDob" value={form.recipientDob} onChange={handleChange} type="date"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <button onClick={() => setStep(2)} disabled={!form.recipientName || !form.recipientEmail}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-4 rounded-xl font-medium transition">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Choose milestone */}
          {step === 2 && (
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">When should it unlock?</h1>
              <p className="text-gray-400 text-sm mb-8">Choose a life milestone for {form.recipientName}.</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {MILESTONES.map(m => (
                  <button key={m.id} onClick={() => handleMilestone(m.id)}
                    className={`p-4 rounded-xl border-2 text-left transition ${form.milestone === m.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                    <div className="text-2xl mb-1">{m.emoji}</div>
                    <div className="text-sm font-medium text-gray-800">{m.label}</div>
                    <div className="text-xs text-gray-400">{m.description}</div>
                  </button>
                ))}
              </div>

              {/* Show calculated date */}
              {form.unlockDate && !['graduation','custom'].includes(form.milestone) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm text-amber-700">📅 Will unlock on <strong>{form.unlockDate}</strong></p>
                </div>
              )}

              {/* Custom date picker */}
              {['graduation','custom'].includes(form.milestone) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Choose the date</label>
                  <input name="unlockDate" value={form.unlockDate} onChange={handleChange} type="date"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} disabled={!form.milestone || !form.unlockDate}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Write message */}
          {step === 3 && (
            <div>
              <div className="text-3xl mb-2">✍️</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Write your message</h1>
              <p className="text-gray-400 text-sm mb-8">This will be delivered to {form.recipientName} on {form.unlockDate}.</p>
              <div className="space-y-5">
                <textarea name="message" value={form.message} onChange={handleChange} rows={8}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Write something from your heart..." />
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300">
                    ← Back
                  </button>
                  <button onClick={handleSubmit} disabled={loading || !form.message}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition">
                    {loading ? 'Sealing...' : 'Seal this capsule 🔒'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}