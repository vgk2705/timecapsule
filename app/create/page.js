'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const MILESTONES = [
  { id: '18', label: '18th Birthday', emoji: '🎂', description: 'When they become an adult' },
  { id: '21', label: '21st Birthday', emoji: '🎉', description: 'A special coming of age' },
  { id: '25', label: '25th Birthday', emoji: '🌟', description: 'Quarter century milestone' },
  { id: '30', label: '30th Birthday', emoji: '🚀', description: 'Entering a new decade' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', description: 'Pick the graduation date' },
  { id: 'custom', label: 'Custom Date', emoji: '📅', description: 'I will choose the exact date' },
]

const RELATIONSHIPS = [
  { id: 'mother', label: 'Mother', emoji: '👩' },
  { id: 'father', label: 'Father', emoji: '👨' },
  { id: 'wife', label: 'Wife', emoji: '👰' },
  { id: 'husband', label: 'Husband', emoji: '🤵' },
  { id: 'grandfather', label: 'Grandfather', emoji: '👴' },
  { id: 'grandmother', label: 'Grandmother', emoji: '👵' },
  { id: 'brother', label: 'Brother', emoji: '👦' },
  { id: 'sister', label: 'Sister', emoji: '👧' },
  { id: 'son', label: 'Son', emoji: '🧒' },
  { id: 'daughter', label: 'Daughter', emoji: '👶' },
  { id: 'friend', label: 'Friend', emoji: '🤝' },
  { id: 'other', label: 'Other', emoji: '💛' },
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
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [messageType, setMessageType] = useState('text')
  const [form, setForm] = useState({
    senderName: '',
    relationship: '',
    recipientName: '',
    recipientEmail: '',
    recipientDob: '',
    milestone: '',
    unlockDate: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isPaid, setIsPaid] = useState(false)
  const [capsuleCount, setCapsuleCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [isIndia, setIsIndia] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)

  // Legacy mode states
  const [isLegacyMode, setIsLegacyMode] = useState(false)
  const [legacyPlan, setLegacyPlan] = useState(null)
  const [legacyCapsuleCount, setLegacyCapsuleCount] = useState(0)
  const [legacyLimitReached, setLegacyLimitReached] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      // Check if legacy mode from URL
      const params = new URLSearchParams(window.location.search)
      const legacyParam = params.get('legacy') === 'true'
      setIsLegacyMode(legacyParam)

      // Check subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      const paid = sub && (sub.plan === 'loved' || sub.plan === 'forever')
      setIsPaid(paid)

      // Check legacy plan
      const { data: legacy } = await supabase
        .from('legacy_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      setLegacyPlan(legacy || null)

      if (legacyParam) {
        // Legacy mode checks
        if (!legacy) {
          // No legacy plan — redirect to setup
          window.location.href = '/legacy-setup'
          return
        }
        // Count existing legacy capsules
        const { data: legacyCapsules } = await supabase
          .from('capsules')
          .select('id')
          .eq('sender_id', user.id)
          .eq('is_legacy', true)
        const legacyCount = legacyCapsules?.length || 0
        setLegacyCapsuleCount(legacyCount)
        if (legacyCount >= 3) {
          setLegacyLimitReached(true)
          return
        }
      } else {
        // Normal mode — check free capsule limit
        if (!paid) {
          const { data: capsules } = await supabase
            .from('capsules')
            .select('id')
            .eq('sender_id', user.id)
            .eq('is_legacy', false)
          const count = capsules?.length || 0
          setCapsuleCount(count)
          if (count >= 3) {
            setLimitReached(true)
            return
          }
        }
      }

      // Detect India
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(data => { if (data.country_code === 'IN') setIsIndia(true) })
        .catch(() => {})

      // Restore saved form
      const savedForm = sessionStorage.getItem('capsuleForm')
      const savedStep = sessionStorage.getItem('capsuleStep')
      const savedMessageType = sessionStorage.getItem('capsuleMessageType')
      if (savedForm) {
        const parsed = JSON.parse(savedForm)
        setForm(parsed)
        if (savedStep) setStep(parseInt(savedStep))
        if (savedMessageType) setMessageType(savedMessageType)
        if (parsed.message) {
          const words = parsed.message.trim() === '' ? 0 : parsed.message.trim().split(/\s+/).length
          setWordCount(words)
        }
        sessionStorage.removeItem('capsuleForm')
        sessionStorage.removeItem('capsuleStep')
        sessionStorage.removeItem('capsuleMessageType')
      } else {
        const name = user.user_metadata?.name || ''
        setForm(f => ({ ...f, senderName: name }))
      }
    }
    checkUser()
  }, [])

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value }
    if (e.target.name === 'message') {
      const words = e.target.value.trim() === '' ? 0 : e.target.value.trim().split(/\s+/).length
      setWordCount(words)
    }
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

  const goToPricing = () => {
    sessionStorage.setItem('capsuleForm', JSON.stringify(form))
    sessionStorage.setItem('capsuleStep', step.toString())
    sessionStorage.setItem('capsuleMessageType', messageType)
    router.push('/upgrade')
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const insertData = {
      sender_name: form.senderName,
      relationship: form.relationship,
      recipient_name: form.recipientName,
      recipient_email: form.recipientEmail,
      message: form.message || '',
      unlock_date: isLegacyMode ? null : form.unlockDate,
      status: 'locked',
      is_legacy: isLegacyMode,
    }
    if (user) insertData.sender_id = user.id

    if (messageType === 'audio' && audioFile) {
      insertData.media_type = 'audio'
      insertData.media_file_name = audioFile.name
      insertData.media_file_size = audioFile.size
      if (!insertData.message) insertData.message = `[Audio message: ${audioFile.name}]`
    }
    if (messageType === 'video' && videoFile) {
      insertData.media_type = 'video'
      insertData.media_file_name = videoFile.name
      insertData.media_file_size = videoFile.size
      if (!insertData.message) insertData.message = `[Video message: ${videoFile.name}]`
    }

    const { error } = await supabase.from('capsules').insert(insertData)
    setLoading(false)
    if (!error) setSubmitted(true)
    else alert('Something went wrong. Please try again.')
  }

  const isSealDisabled = () => {
    if (loading) return true
    if (messageType === 'text') return !form.message || (wordCount > 5000 && !isPaid && !isLegacyMode)
    if (messageType === 'audio') {
      if (!isPaid && !isLegacyMode) return true
      return !audioFile
    }
    if (messageType === 'video') {
      if (!isPaid && !isLegacyMode) return true
      return !videoFile
    }
    return true
  }

  // Theme based on mode
  const accent = isLegacyMode ? 'purple' : 'amber'
  const accentClasses = isLegacyMode ? {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    ring: 'focus:ring-purple-300',
    btn: 'bg-purple-600 hover:bg-purple-700',
    text: 'text-purple-600',
    progress: 'bg-purple-500',
    tab: 'text-purple-600',
  } : {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    ring: 'focus:ring-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-600',
    text: 'text-amber-600',
    progress: 'bg-amber-500',
    tab: 'text-amber-600',
  }

  // Legacy limit reached
  if (legacyLimitReached) return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center p-6 md:p-10 max-w-md">
          <div className="text-6xl mb-6">👻</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Legacy limit reached</h1>
          <p className="text-gray-500 mb-2">You've used all <strong>3 legacy capsules</strong>.</p>
          <p className="text-gray-500 mb-8">The Legacy plan allows a maximum of 3 capsules to keep them truly meaningful.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/dashboard" className="bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition text-center font-semibold">
              Back to Dashboard
            </a>
            <a href="/manage-plan" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">
              Manage Plan
            </a>
          </div>
        </div>
      </div>
      <footer className="text-center py-6 text-gray-400 text-sm px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <a href="/privacy" className="hover:text-purple-600 transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-purple-600 transition">Terms of Service</a>
          <a href="/data-protection" className="hover:text-purple-600 transition">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )

  // Normal free limit reached
  if (limitReached) return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center p-6 md:p-10 max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Free limit reached</h1>
          <p className="text-gray-500 mb-2">You've used all <strong>3 free capsules</strong>.</p>
          <p className="text-gray-500 mb-8">Upgrade to create unlimited capsules + unlock audio & video messages.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/upgrade" className="bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition text-center font-semibold">
              Upgrade Now {isIndia ? '— ₹99/mo' : '— €2.99/mo'}
            </a>
            <a href="/dashboard" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">
              Back to Dashboard
            </a>
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

  // Submitted success
  if (submitted) return (
    <div className={`min-h-screen ${accentClasses.bg} flex flex-col`}>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center p-6 md:p-10">
          <div className="text-6xl mb-6">{isLegacyMode ? '👻' : '💌'}</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {isLegacyMode ? 'Legacy capsule sealed!' : 'Your capsule is sealed!'}
          </h1>
          <p className="text-gray-500 text-base md:text-lg">
            {isLegacyMode
              ? <>This message for <strong>{form.recipientName}</strong> will be delivered after our team verifies with your legacy contact.</>
              : <>It will be delivered to <strong>{form.recipientName}</strong> on <strong>{form.unlockDate}</strong>.</>
            }
          </p>
          {isLegacyMode && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-6 text-sm text-purple-700">
              <p>✅ {legacyCapsuleCount + 1}/3 legacy capsules used</p>
              <p className="mt-1">Your legacy contact will be notified when the time comes.</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href="/dashboard" className={`${accentClasses.btn} text-white px-6 py-3 rounded-full transition text-center`}>
              View my capsules
            </a>
            {isLegacyMode && legacyCapsuleCount < 2 && (
              <a href="/create?legacy=true" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">
                Add another legacy capsule
              </a>
            )}
            {!isLegacyMode && (
              <a href="/create" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">
                Create another
              </a>
            )}
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

  return (
    <div className={`min-h-screen ${accentClasses.bg} flex flex-col`}>
      <div className="flex-1 py-8 md:py-12 px-4 md:px-6">
        <div className="max-w-xl mx-auto">

          <a href="/dashboard" className={`${accentClasses.text} text-sm mb-4 inline-block`}>← Back to dashboard</a>

          {/* Legacy mode banner */}
          {isLegacyMode && (
            <div className="bg-purple-100 border border-purple-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-purple-800 font-bold text-sm">👻 Creating Legacy Capsule</p>
              <p className="text-purple-600 text-xs mt-0.5">
                {legacyCapsuleCount}/3 legacy capsules used · Delivered after our team verifies your passing
              </p>
            </div>
          )}

          {/* Free plan counter — normal mode */}
          {!isPaid && !isLegacyMode && (
            <div className={`rounded-xl px-4 py-2 mb-4 text-sm text-center ${
              capsuleCount >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {capsuleCount}/3 free capsules used
              {capsuleCount >= 2 && (
                <a href="/upgrade" className="ml-2 font-bold underline">Upgrade for unlimited</a>
              )}
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            {[1, isLegacyMode ? null : 2, isLegacyMode ? 2 : 3].filter(Boolean).map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                step > i ? accentClasses.progress : 'bg-gray-200'
              }`} />
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8">

            {/* Step 1 — Who is this for */}
            {step === 1 && (
              <div>
                <div className="text-3xl mb-2">{isLegacyMode ? '👻' : '👤'}</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
                  {isLegacyMode ? 'Who receives this legacy message?' : 'Who is this for?'}
                </h1>
                <p className="text-gray-400 text-sm mb-6">
                  {isLegacyMode
                    ? 'This message will be delivered to them after our team verifies your passing.'
                    : 'Tell us about yourself and the person receiving this message.'
                  }
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your name <span className="text-red-500">*</span>
                    </label>
                    <input name="senderName" value={form.senderName} onChange={handleChange}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="e.g. Gopala" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Your relationship to recipient <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                      {RELATIONSHIPS.map(r => (
                        <button key={r.id} type="button"
                          onClick={() => setForm({ ...form, relationship: r.id })}
                          className={`flex flex-col items-center p-1.5 md:p-2 rounded-xl border-2 transition text-center ${
                            form.relationship === r.id
                              ? isLegacyMode ? 'border-purple-500 bg-purple-50' : 'border-amber-500 bg-amber-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <span className="text-lg md:text-xl mb-1">{r.emoji}</span>
                          <span className="text-xs text-gray-600 font-medium leading-tight">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Their name <span className="text-red-500">*</span>
                    </label>
                    <input name="recipientName" value={form.recipientName} onChange={handleChange}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="e.g. Karsanvidhun" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Their email <span className="text-red-500">*</span>
                    </label>
                    <input name="recipientEmail" value={form.recipientEmail} onChange={handleChange} type="email"
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="their@email.com" />
                  </div>

                  {/* DOB only for normal mode */}
                  {!isLegacyMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Their date of birth <span className="text-red-500">*</span>
                      </label>
                      <input name="recipientDob" value={form.recipientDob} onChange={handleChange} type="date"
                        className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`} />
                    </div>
                  )}

                  <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>

                  <button
                    onClick={() => isLegacyMode ? setStep(2) : setStep(2)}
                    disabled={!form.senderName || !form.relationship || !form.recipientName || !form.recipientEmail}
                    className={`w-full ${accentClasses.btn} disabled:opacity-40 text-white py-4 rounded-xl font-medium transition`}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Milestone (normal) OR Message (legacy) */}
            {step === 2 && !isLegacyMode && (
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">When should it unlock?</h1>
                <p className="text-gray-400 text-sm mb-6">Choose a life milestone for {form.recipientName}.</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {MILESTONES.map(m => (
                    <button key={m.id} onClick={() => handleMilestone(m.id)}
                      className={`p-3 md:p-4 rounded-xl border-2 text-left transition ${
                        form.milestone === m.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                      }`}>
                      <div className="text-xl md:text-2xl mb-1">{m.emoji}</div>
                      <div className="text-xs md:text-sm font-medium text-gray-800">{m.label}</div>
                      <div className="text-xs text-gray-400 hidden md:block">{m.description}</div>
                    </button>
                  ))}
                </div>

                {form.unlockDate && !['graduation','custom'].includes(form.milestone) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                    <p className="text-sm text-amber-700">📅 Will unlock on <strong>{form.unlockDate}</strong></p>
                  </div>
                )}

                {['graduation','custom'].includes(form.milestone) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Choose the date <span className="text-red-500">*</span>
                    </label>
                    <input name="unlockDate" value={form.unlockDate} onChange={handleChange} type="date"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">
                    ← Back
                  </button>
                  <button onClick={() => setStep(3)} disabled={!form.milestone || !form.unlockDate}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm">
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 (legacy) OR Step 3 (normal) — Message */}
            {((step === 2 && isLegacyMode) || (step === 3 && !isLegacyMode)) && (
              <div>
                <div className="text-3xl mb-2">✍️</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Your message</h1>
                <p className="text-gray-400 text-sm mb-5">
                  {isLegacyMode
                    ? `This message will be delivered to ${form.recipientName} after our team verifies your passing.`
                    : `Delivered to ${form.recipientName} on ${form.unlockDate}.`
                  }
                </p>

                {/* Legacy info box */}
                {isLegacyMode && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-5 text-xs text-purple-700">
                    <p>👻 This is a <strong>legacy capsule</strong> — delivered only after team verification.</p>
                    <p className="mt-1">Tip: Write as if this is the last message they'll ever receive from you. 💜</p>
                  </div>
                )}

                {/* Message type tabs */}
                <div className="flex gap-1 md:gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
                  {[
                    { id: 'text', emoji: '📝', label: 'Text' },
                    { id: 'audio', emoji: '🎵', label: 'Audio' },
                    { id: 'video', emoji: '🎥', label: 'Video' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setMessageType(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                        messageType === tab.id
                          ? `bg-white ${accentClasses.tab} shadow-sm`
                          : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <span>{tab.emoji}</span>
                      <span>{tab.label}</span>
                      {tab.id !== 'text' && !isPaid && !isLegacyMode && (
                        <span className="bg-amber-100 text-amber-600 text-xs px-1 py-0.5 rounded-full">Pro</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Text */}
                {messageType === 'text' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your message <span className="text-red-500">*</span>
                    </label>
                    <textarea name="message" value={form.message} onChange={handleChange} rows={7}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder={isLegacyMode
                        ? `Write your final message to ${form.recipientName}...`
                        : `Write something from your heart to ${form.recipientName}...`
                      } />
                    <div className="flex justify-between items-center">
                      <p className={`text-xs ${wordCount > 5000 && !isPaid && !isLegacyMode ? 'text-red-500' : 'text-gray-400'}`}>
                        {isPaid || isLegacyMode ? `${wordCount} words` : `${wordCount} / 5,000 words`}
                      </p>
                      {wordCount > 5000 && !isPaid && !isLegacyMode && (
                        <a href="/upgrade" className="text-xs text-red-500 underline">Upgrade for unlimited</a>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio — locked for free non-legacy users */}
                {messageType === 'audio' && !isPaid && !isLegacyMode && (
                  <div className="border-2 border-dashed border-amber-200 rounded-xl p-6 text-center bg-amber-50">
                    <div className="text-4xl mb-3">🎵</div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Audio Messages</h3>
                    <p className="text-gray-500 text-sm mb-1">Record your voice or upload an audio file.</p>
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-3">
                      🔒 Premium Feature
                    </div>
                    <p className="text-gray-500 text-sm mb-4">Available on <strong>Loved</strong> and <strong>Forever</strong> plans</p>
                    <button onClick={goToPricing} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium transition text-sm">
                      Upgrade — {isIndia ? 'from ₹99/mo' : 'from €2.99/mo'}
                    </button>
                  </div>
                )}

                {/* Audio — unlocked for paid OR legacy users */}
                {messageType === 'audio' && (isPaid || isLegacyMode) && (
                  <div className={`border-2 rounded-xl p-6 text-center ${audioFile ? 'border-green-300 bg-green-50' : isLegacyMode ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'}`}>
                    <div className="text-4xl mb-3">🎵</div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Audio Message</h3>
                    <p className="text-gray-500 text-sm mb-4">Upload an audio file or record your voice.</p>
                    <input type="file" accept="audio/*"
                      onChange={e => setAudioFile(e.target.files[0])}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                    {audioFile && (
                      <div className="mt-3 bg-white rounded-xl p-3 border border-green-200">
                        <p className="text-sm text-green-700 font-medium">✅ {audioFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                    <p className="text-gray-400 text-xs mt-3">MP3, WAV, M4A · Max 50MB</p>
                  </div>
                )}

                {/* Video — locked for free non-legacy users */}
                {messageType === 'video' && !isPaid && !isLegacyMode && (
                  <div className="border-2 border-dashed border-amber-200 rounded-xl p-6 text-center bg-amber-50">
                    <div className="text-4xl mb-3">🎥</div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Video Messages</h3>
                    <p className="text-gray-500 text-sm mb-1">Upload a video message.</p>
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-3">
                      🔒 Premium Feature
                    </div>
                    <p className="text-gray-500 text-sm mb-4">Available on <strong>Loved</strong> and <strong>Forever</strong> plans</p>
                    <button onClick={goToPricing} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium transition text-sm">
                      Upgrade — {isIndia ? 'from ₹99/mo' : 'from €2.99/mo'}
                    </button>
                  </div>
                )}

                {/* Video — unlocked for paid OR legacy users */}
                {messageType === 'video' && (isPaid || isLegacyMode) && (
                  <div className={`border-2 rounded-xl p-6 text-center ${videoFile ? 'border-green-300 bg-green-50' : isLegacyMode ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'}`}>
                    <div className="text-4xl mb-3">🎥</div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Video Message</h3>
                    <p className="text-gray-500 text-sm mb-4">Upload a video file.</p>
                    <input type="file" accept="video/*"
                      onChange={e => setVideoFile(e.target.files[0])}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                    {videoFile && (
                      <div className="mt-3 bg-white rounded-xl p-3 border border-green-200">
                        <p className="text-sm text-green-700 font-medium">✅ {videoFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                    <p className="text-gray-400 text-xs mt-3">MP4, MOV · Max 500MB</p>
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <button onClick={() => setStep(isLegacyMode ? 1 : 2)}
                    className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">
                    ← Back
                  </button>
                  <button onClick={handleSubmit} disabled={isSealDisabled()}
                    className={`flex-1 ${accentClasses.btn} disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm`}>
                    {loading ? 'Sealing...' : isLegacyMode ? 'Seal legacy capsule 👻' : 'Seal capsule 🔒'}
                  </button>
                </div>

                {messageType !== 'text' && !isPaid && !isLegacyMode && (
                  <p className="text-center text-xs text-gray-400 mt-3">Switch to Text tab to seal your capsule for now.</p>
                )}
                {messageType === 'audio' && (isPaid || isLegacyMode) && !audioFile && (
                  <p className={`text-center text-xs ${accentClasses.text} mt-3`}>Please select an audio file.</p>
                )}
                {messageType === 'video' && (isPaid || isLegacyMode) && !videoFile && (
                  <p className={`text-center text-xs ${accentClasses.text} mt-3`}>Please select a video file.</p>
                )}
              </div>
            )}

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