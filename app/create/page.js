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

const PER_CAPSULE_PRICING = {
  INR: {
    audio: { '1': 49, '5': 99, '10': 199, '10+': 399 },
    video: { '1': 149, '5': 299, '10': 499, '10+': 999 },
  },
  EUR: {
    audio: { '1': 1.49, '5': 2.99, '10': 5.99, '10+': 11.99 },
    video: { '1': 4.99, '5': 8.99, '10': 14.99, '10+': 29.99 },
  }
}

function getDeliveryYears(unlockDate) {
  if (!unlockDate) return 5
  const today = new Date()
  const delivery = new Date(unlockDate)
  return Math.max(1, Math.ceil((delivery - today) / (1000 * 60 * 60 * 24 * 365)))
}

function getPriceTier(years) {
  if (years <= 1) return '1'
  if (years <= 5) return '5'
  if (years <= 10) return '10'
  return '10+'
}

function getPerCapsulePrice(mediaType, unlockDate, isIndia) {
  const currency = isIndia ? 'INR' : 'EUR'
  const years = getDeliveryYears(unlockDate)
  const tier = getPriceTier(years)
  const price = PER_CAPSULE_PRICING[currency][mediaType][tier]
  return {
    price,
    currency,
    symbol: isIndia ? '₹' : '€',
    tier,
    years,
    display: `${isIndia ? '₹' : '€'}${price}`
  }
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
  const [uploadProgress, setUploadProgress] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [isPaid, setIsPaid] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [capsuleCount, setCapsuleCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const [isIndia, setIsIndia] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [perCapsulePaying, setPerCapsulePaying] = useState(false)

  // ✅ NEW — Multiple recipients for Forever plan
  const [additionalRecipients, setAdditionalRecipients] = useState([])
  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' })

  // Legacy mode states
  const [isLegacyMode, setIsLegacyMode] = useState(false)
  const [legacyPlan, setLegacyPlan] = useState(null)
  const [legacyCapsuleCount, setLegacyCapsuleCount] = useState(0)
  const [legacyLimitReached, setLegacyLimitReached] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUserId(user.id)

      const params = new URLSearchParams(window.location.search)
      const legacyParam = params.get('legacy') === 'true'
      setIsLegacyMode(legacyParam)

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      const paid = sub && (sub.plan === 'loved' || sub.plan === 'forever')
      setIsPaid(paid)
      setCurrentPlan(sub?.plan || 'free')

      const { data: legacy } = await supabase
        .from('legacy_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      setLegacyPlan(legacy || null)

      if (legacyParam) {
        if (!legacy) { window.location.href = '/legacy-setup'; return }
        const { data: legacyCapsules } = await supabase
          .from('capsules').select('id')
          .eq('sender_id', user.id).eq('is_legacy', true)
        const legacyCount = legacyCapsules?.length || 0
        setLegacyCapsuleCount(legacyCount)
        if (legacyCount >= 3) { setLegacyLimitReached(true); return }
      } else {
        if (!paid) {
          const { data: capsules } = await supabase
            .from('capsules').select('id')
            .eq('sender_id', user.id).eq('is_legacy', false)
          const count = capsules?.length || 0
          setCapsuleCount(count)
          if (count >= 3) { setLimitReached(true); return }
        }
      }

      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(data => { if (data.country_code === 'IN') setIsIndia(true) })
        .catch(() => {})

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

  // ✅ NEW — Add/remove additional recipients
  const handleAddRecipient = () => {
    if (!newRecipient.name || !newRecipient.email) return
    if (additionalRecipients.length >= 9) {
      alert('Maximum 10 recipients total (including primary)')
      return
    }
    // Check duplicate email
    if (newRecipient.email === form.recipientEmail ||
      additionalRecipients.some(r => r.email === newRecipient.email)) {
      alert('This email is already added as a recipient')
      return
    }
    setAdditionalRecipients([...additionalRecipients, { ...newRecipient }])
    setNewRecipient({ name: '', email: '' })
    setShowAddRecipient(false)
  }

  const handleRemoveRecipient = (index) => {
    setAdditionalRecipients(additionalRecipients.filter((_, i) => i !== index))
  }

  const uploadFileToR2 = async (file, user) => {
    setUploadProgress('Preparing upload...')
    const urlRes = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        fileType: messageType,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || (messageType === 'video' ? 'video/mp4' : 'audio/mpeg'),
        plan: isLegacyMode ? 'legacy' : currentPlan,
      }),
    })
    const urlData = await urlRes.json()
    if (urlData.error) throw new Error(urlData.error)

    setUploadProgress('Uploading your media file...')
    const uploadRes = await fetch(urlData.presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || (messageType === 'video' ? 'video/mp4' : 'audio/mpeg'),
      },
    })
    if (!uploadRes.ok) throw new Error('Upload to cloud storage failed')

    setUploadProgress('Confirming upload...')
    await fetch('/api/confirm-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, fileType: messageType, fileSize: file.size }),
    })

    return { url: urlData.publicUrl, fileName: file.name, fileSize: file.size }
  }

  // ✅ UPDATED — saveCapsule now includes additionalRecipients
  const saveCapsule = async (user, mediaUrl, mediaFileName, mediaFileSize, paymentId = null, paymentAmount = null, paymentCurrency = null) => {
    setUploadProgress('Sealing your capsule...')

    const insertData = {
      sender_name: form.senderName,
      relationship: form.relationship,
      recipient_name: form.recipientName,
      recipient_email: form.recipientEmail,
      message: form.message || (messageType === 'audio'
        ? `[Audio message: ${mediaFileName || 'audio file'}]`
        : messageType === 'video'
        ? `[Video message: ${mediaFileName || 'video file'}]`
        : ''),
      unlock_date: isLegacyMode ? null : form.unlockDate,
      status: 'locked',
      is_legacy: isLegacyMode,
      media_type: messageType !== 'text' ? messageType : null,
      media_url: mediaUrl,
      media_file_name: mediaFileName,
      media_file_size: mediaFileSize,
      // ✅ Save additional recipients (only for Forever plan)
      recipients: currentPlan === 'forever' && additionalRecipients.length > 0
        ? additionalRecipients
        : [],
    }
    if (user) insertData.sender_id = user.id

    const { data, error } = await supabase
      .from('capsules')
      .insert(insertData)
      .select()

    if (error) throw new Error('Failed to save capsule')

    if (paymentId && data?.[0]?.id) {
      const deliveryYears = getDeliveryYears(form.unlockDate)
      await supabase.from('capsule_payments').insert({
        user_id: user.id,
        capsule_id: data[0].id,
        payment_provider: 'razorpay',
        payment_id: paymentId,
        amount: paymentAmount,
        currency: paymentCurrency || 'INR',
        media_type: messageType,
        delivery_years: deliveryYears,
        status: 'paid',
      })
    }

    return data
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    let mediaUrl = null
    let mediaFileName = null
    let mediaFileSize = null

    const fileToUpload = messageType === 'audio' ? audioFile : messageType === 'video' ? videoFile : null
    if (fileToUpload) {
      try {
        const result = await uploadFileToR2(fileToUpload, user)
        mediaUrl = result.url
        mediaFileName = result.fileName
        mediaFileSize = result.fileSize
      } catch (err) {
        alert(err.message || 'Upload failed. Please try again.')
        setLoading(false)
        setUploadProgress('')
        return
      }
    }

    try {
      await saveCapsule(user, mediaUrl, mediaFileName, mediaFileSize)
      setLoading(false)
      setUploadProgress('')
      setSubmitted(true)
    } catch (err) {
      alert('Something went wrong saving your capsule. Please try again.')
      setLoading(false)
      setUploadProgress('')
    }
  }

  const handlePerCapsulePayment = async () => {
    const fileToUpload = messageType === 'audio' ? audioFile : videoFile
    if (!fileToUpload) {
      alert(`Please select a ${messageType} file first`)
      return
    }
    setPerCapsulePaying(true)
    try {
      const res = await fetch('/api/razorpay-create-capsule-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mediaType: messageType,
          unlockDate: form.unlockDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          fileSizeBytes: fileToUpload.size,
          currency: 'INR',
        })
      })
      const orderData = await res.json()
      if (orderData.error) throw new Error(orderData.error)

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        order_id: orderData.orderId,
        name: 'TimeCapsule',
        description: orderData.label || `${messageType} capsule`,
        image: 'https://www.mytimecapsule.app/favicon.ico',
        prefill: { email: (await supabase.auth.getUser()).data.user?.email || '' },
        theme: { color: '#f59e0b' },
        handler: async function(response) {
          setLoading(true)
          setPerCapsulePaying(false)
          const { data: { user } } = await supabase.auth.getUser()
          try {
            const result = await uploadFileToR2(fileToUpload, user)
            await saveCapsule(
              user, result.url, result.fileName, result.fileSize,
              response.razorpay_payment_id, orderData.amount / 100, 'INR'
            )
            setLoading(false)
            setUploadProgress('')
            setSubmitted(true)
          } catch (err) {
            alert('Payment successful but upload failed. Contact support with payment ID: ' + response.razorpay_payment_id)
            setLoading(false)
            setUploadProgress('')
          }
        },
        modal: { ondismiss: () => setPerCapsulePaying(false) }
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert(err.message || 'Something went wrong. Please try again.')
      setPerCapsulePaying(false)
    }
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

  const accentClasses = isLegacyMode ? {
    bg: 'bg-purple-50',
    ring: 'focus:ring-purple-300',
    btn: 'bg-purple-600 hover:bg-purple-700',
    text: 'text-purple-600',
    progress: 'bg-purple-500',
    tab: 'text-purple-600',
  } : {
    bg: 'bg-amber-50',
    ring: 'focus:ring-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-600',
    text: 'text-amber-600',
    progress: 'bg-amber-500',
    tab: 'text-amber-600',
  }

  if (legacyLimitReached) return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center p-6 md:p-10 max-w-md">
          <div className="text-6xl mb-6">👻</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">Legacy limit reached</h1>
          <p className="text-gray-500 mb-2">You've used all <strong>3 legacy capsules</strong>.</p>
          <p className="text-gray-500 mb-8">The Legacy plan allows a maximum of 3 capsules to keep them truly meaningful.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/dashboard" className="bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition text-center font-semibold">Back to Dashboard</a>
            <a href="/manage-plan" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">Manage Plan</a>
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
            <a href="/dashboard" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">Back to Dashboard</a>
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
          {/* Show additional recipients if any */}
          {additionalRecipients.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 text-sm text-green-700">
              <p className="font-medium mb-1">Also delivering to:</p>
              {additionalRecipients.map((r, i) => (
                <p key={i}>✅ {r.name} ({r.email})</p>
              ))}
            </div>
          )}
          {isLegacyMode && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-6 text-sm text-purple-700">
              <p>✅ {legacyCapsuleCount + 1}/3 legacy capsules used</p>
              <p className="mt-1">Your legacy contacts will be notified when the time comes.</p>
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

          {isLegacyMode && (
            <div className="bg-purple-100 border border-purple-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-purple-800 font-bold text-sm">👻 Creating Legacy Capsule</p>
              <p className="text-purple-600 text-xs mt-0.5">
                {legacyCapsuleCount}/3 legacy capsules used · Delivered after our team verifies your passing
              </p>
            </div>
          )}

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

          <div className="flex items-center gap-2 mb-6 md:mb-8">
            {[1, isLegacyMode ? null : 2, isLegacyMode ? 2 : 3].filter(Boolean).map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                step > i ? accentClasses.progress : 'bg-gray-200'
              }`} />
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8">

            {/* ─────────────── STEP 1 ─────────────── */}
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

                  {/* Sender name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your name <span className="text-red-500">*</span>
                    </label>
                    <input name="senderName" value={form.senderName} onChange={handleChange}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="e.g. Gopala" />
                  </div>

                  {/* Relationship */}
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

                  {/* Recipient name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Their name <span className="text-red-500">*</span>
                    </label>
                    <input name="recipientName" value={form.recipientName} onChange={handleChange}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="e.g. Karsanvidhun" />
                  </div>

                  {/* Recipient email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Their email <span className="text-red-500">*</span>
                    </label>
                    <input name="recipientEmail" value={form.recipientEmail} onChange={handleChange} type="email"
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="their@email.com" />
                  </div>

                  {/* ✅ NEW — Additional recipients for Forever plan */}
                  {currentPlan === 'forever' && !isLegacyMode && (
                    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Additional recipients</label>
                          <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">👑 Forever</span>
                        </div>
                        {!showAddRecipient && additionalRecipients.length < 9 && (
                          <button type="button" onClick={() => setShowAddRecipient(true)}
                            className="text-xs text-amber-700 hover:text-amber-800 font-semibold border border-amber-300 px-2 py-1 rounded-lg transition">
                            + Add
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mb-3">
                        Same message delivered to multiple people on the unlock date. ({1 + additionalRecipients.length}/10 recipients)
                      </p>

                      {/* Existing additional recipients list */}
                      {additionalRecipients.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {additionalRecipients.map((r, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                              <div>
                                <span className="text-sm text-gray-700 font-medium">{r.name}</span>
                                <span className="text-xs text-gray-400 ml-2">{r.email}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveRecipient(i)}
                                className="text-xs text-red-400 hover:text-red-600 transition font-medium">
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new recipient form */}
                      {showAddRecipient && (
                        <div className="bg-white rounded-xl p-3 border border-amber-200 space-y-2">
                          <input type="text" value={newRecipient.name}
                            onChange={e => setNewRecipient({ ...newRecipient, name: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            placeholder="Recipient name *" />
                          <input type="email" value={newRecipient.email}
                            onChange={e => setNewRecipient({ ...newRecipient, email: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            placeholder="Recipient email *" />
                          <div className="flex gap-2">
                            <button type="button" onClick={handleAddRecipient}
                              disabled={!newRecipient.name || !newRecipient.email}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-medium transition">
                              Add Recipient
                            </button>
                            <button type="button"
                              onClick={() => { setShowAddRecipient(false); setNewRecipient({ name: '', email: '' }) }}
                              className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm transition hover:border-gray-300">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {additionalRecipients.length === 0 && !showAddRecipient && (
                        <p className="text-xs text-gray-400 italic">No additional recipients added yet.</p>
                      )}
                    </div>
                  )}

                  {/* DOB — normal mode only */}
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

                  <button onClick={() => setStep(2)}
                    disabled={!form.senderName || !form.relationship || !form.recipientName || !form.recipientEmail}
                    className={`w-full ${accentClasses.btn} disabled:opacity-40 text-white py-4 rounded-xl font-medium transition`}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────── STEP 2 — Milestone (normal only) ─────────────── */}
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
                    {additionalRecipients.length > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Delivered to {1 + additionalRecipients.length} recipients
                      </p>
                    )}
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
                  <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">← Back</button>
                  <button onClick={() => setStep(3)} disabled={!form.milestone || !form.unlockDate}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm">
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ─────────────── STEP 2 (legacy) OR STEP 3 (normal) — Message ─────────────── */}
            {((step === 2 && isLegacyMode) || (step === 3 && !isLegacyMode)) && (
              <div>
                <div className="text-3xl mb-2">✍️</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Your message</h1>
                <p className="text-gray-400 text-sm mb-5">
                  {isLegacyMode
                    ? `This message will be delivered to ${form.recipientName} after our team verifies your passing.`
                    : `Delivered to ${form.recipientName}${additionalRecipients.length > 0 ? ` and ${additionalRecipients.length} others` : ''} on ${form.unlockDate}.`
                  }
                </p>

                {isLegacyMode && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-5 text-xs text-purple-700">
                    <p>👻 This is a <strong>legacy capsule</strong> — delivered only after team verification.</p>
                    <p className="mt-1">Tip: Write as if this is the last message they'll ever receive from you. 💜</p>
                  </div>
                )}

                {/* Show recipients summary for Forever plan */}
                {additionalRecipients.length > 0 && !isLegacyMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                    <p className="font-semibold mb-1">👑 Delivering to {1 + additionalRecipients.length} recipients:</p>
                    <p>• {form.recipientName} ({form.recipientEmail})</p>
                    {additionalRecipients.map((r, i) => (
                      <p key={i}>• {r.name} ({r.email})</p>
                    ))}
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
                        messageType === tab.id ? `bg-white ${accentClasses.tab} shadow-sm` : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <span>{tab.emoji}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Text message */}
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

                {/* Audio — free users: pay per capsule */}
                {messageType === 'audio' && !isPaid && !isLegacyMode && (
                  <div className="space-y-4">
                    <div className={`border-2 rounded-xl p-5 text-center ${audioFile ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-3xl mb-2">🎵</div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Select your audio file</p>
                      <input type="file" accept="audio/*"
                        onChange={e => setAudioFile(e.target.files[0])}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                      {audioFile && (
                        <div className="mt-3 bg-white rounded-xl p-3 border border-green-200">
                          <p className="text-sm text-green-700 font-medium">✅ {audioFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">MP3, WAV, M4A · Max 50MB</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choose how to unlock audio</p>
                      </div>
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-bold text-gray-800 text-sm">💳 Pay for this capsule only</p>
                        <p className="text-xs text-gray-500 mt-1">
                          One-time · No subscription ·{' '}
                          {form.unlockDate
                            ? <>Delivery in {getDeliveryYears(form.unlockDate)} years → <strong>{getPerCapsulePrice('audio', form.unlockDate, isIndia).display}</strong></>
                            : <>from {isIndia ? '₹49' : '€1.49'}</>
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">⚠️ No refund if capsule deleted</p>
                        <button onClick={handlePerCapsulePayment} disabled={perCapsulePaying || !audioFile}
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                          {perCapsulePaying ? 'Processing...' : !audioFile ? '← Select audio file first' : `Pay ${getPerCapsulePrice('audio', form.unlockDate, isIndia).display} & Seal`}
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-gray-800 text-sm">📅 Subscribe for unlimited</p>
                        <p className="text-xs text-gray-500 mt-1">{isIndia ? '₹99/mo' : '€2.99/mo'} · Unlimited audio & video</p>
                        <button onClick={goToPricing}
                          className="w-full mt-3 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition">
                          See subscription plans →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio — unlocked for paid/legacy */}
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
                    <p className="text-gray-400 text-xs mt-3">MP3, WAV, M4A · Max 50MB · Uploaded securely to cloud</p>
                  </div>
                )}

                {/* Video — free users: pay per capsule */}
                {messageType === 'video' && !isPaid && !isLegacyMode && (
                  <div className="space-y-4">
                    <div className={`border-2 rounded-xl p-5 text-center ${videoFile ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-3xl mb-2">🎥</div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Select your video file</p>
                      <input type="file" accept="video/*"
                        onChange={e => setVideoFile(e.target.files[0])}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                      {videoFile && (
                        <div className="mt-3 bg-white rounded-xl p-3 border border-green-200">
                          <p className="text-sm text-green-700 font-medium">✅ {videoFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          {/* Show size-based pricing info */}
                          {(() => {
                            const mb = videoFile.size / (1024 * 1024)
                            const tier = mb <= 100 ? 'up to 100MB' : mb <= 500 ? '101-500MB' : '501MB-2GB'
                            return <p className="text-xs text-amber-600 mt-1">Size tier: {tier}</p>
                          })()}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">MP4, MOV · Max 2GB · Price based on file size</p>
                    </div>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Choose how to unlock video</p>
                      </div>
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-bold text-gray-800 text-sm">💳 Pay for this capsule only</p>
                        <p className="text-xs text-gray-500 mt-1">
                          One-time · Price by file size + delivery ·{' '}
                          {form.unlockDate
                            ? <>Delivery in {getDeliveryYears(form.unlockDate)} years → <strong>{getPerCapsulePrice('video', form.unlockDate, isIndia).display}</strong></>
                            : <>from {isIndia ? '₹149' : '€4.99'}</>
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">⚠️ No refund if capsule deleted</p>
                        <button onClick={handlePerCapsulePayment} disabled={perCapsulePaying || !videoFile}
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                          {perCapsulePaying ? 'Processing...' : !videoFile ? '← Select video file first' : `Pay ${getPerCapsulePrice('video', form.unlockDate, isIndia).display} & Seal`}
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-gray-800 text-sm">📅 Subscribe for unlimited</p>
                        <p className="text-xs text-gray-500 mt-1">{isIndia ? '₹99/mo' : '€2.99/mo'} · Unlimited audio & video</p>
                        <button onClick={goToPricing}
                          className="w-full mt-3 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition">
                          See subscription plans →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video — unlocked for paid/legacy */}
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
                    <p className="text-gray-400 text-xs mt-3">MP4, MOV · Max 500MB · Uploaded securely to cloud</p>
                  </div>
                )}

                {/* Upload progress */}
                {uploadProgress && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm text-blue-700">⏳ {uploadProgress}</p>
                  </div>
                )}

                {/* Seal button — paid/legacy/text only */}
                {(isPaid || isLegacyMode || messageType === 'text') && (
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setStep(isLegacyMode ? 1 : 2)}
                      className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">
                      ← Back
                    </button>
                    <button onClick={handleSubmit} disabled={isSealDisabled()}
                      className={`flex-1 ${accentClasses.btn} disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm`}>
                      {loading
                        ? uploadProgress ? 'Uploading...' : 'Sealing...'
                        : isLegacyMode ? 'Seal legacy capsule 👻' : 'Seal capsule 🔒'
                      }
                    </button>
                  </div>
                )}

                {/* Back button for free users on audio/video tabs */}
                {!isPaid && !isLegacyMode && messageType !== 'text' && (
                  <div className="mt-4">
                    <button onClick={() => setStep(isLegacyMode ? 1 : 2)}
                      className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">
                      ← Back
                    </button>
                  </div>
                )}

                {messageType === 'audio' && (isPaid || isLegacyMode) && !audioFile && (
                  <p className={`text-center text-xs ${accentClasses.text} mt-3`}>Please select an audio file to continue.</p>
                )}
                {messageType === 'video' && (isPaid || isLegacyMode) && !videoFile && (
                  <p className={`text-center text-xs ${accentClasses.text} mt-3`}>Please select a video file to continue.</p>
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