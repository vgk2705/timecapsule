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

const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const TEXT_PRICING = {
  INR: { '1': '₹19', '5': '₹29', '10': '₹49', '10+': '₹99' },
  EUR: { '1': '€0.99', '5': '€1.49', '10': '€1.99', '10+': '€2.99' },
}
const AUDIO_PRICING = {
  INR: { '1': '₹49', '5': '₹99', '10': '₹199', '10+': '₹399' },
  EUR: { '1': '€2.49', '5': '€3.99', '10': '€6.99', '10+': '€12.99' },
}
const VIDEO_PRICING = {
  INR: { '1': '₹149', '5': '₹299', '10': '₹499', '10+': '₹999' },
  EUR: { '1': '€5.99', '5': '€9.99', '10': '€15.99', '10+': '€30.99' },
}

function getDeliveryYears(unlockDate) {
  if (!unlockDate) return 5
  return Math.max(1, Math.ceil((new Date(unlockDate) - new Date()) / (1000 * 60 * 60 * 24 * 365)))
}

function getPriceTier(years) {
  if (years <= 1) return '1'
  if (years <= 5) return '5'
  if (years <= 10) return '10'
  return '10+'
}

function getDisplayPrice(mediaType, unlockDate, isIndia) {
  const currency = isIndia ? 'INR' : 'EUR'
  const tier = getPriceTier(getDeliveryYears(unlockDate))
  const map = mediaType === 'text' ? TEXT_PRICING : mediaType === 'audio' ? AUDIO_PRICING : VIDEO_PRICING
  return map[currency][tier]
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function CreateCapsule() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [messageType, setMessageType] = useState('text')
  const [form, setForm] = useState({
    senderName: '', relationship: '', recipientName: '',
    recipientEmail: '', recipientDob: '', milestone: '', unlockDate: '', message: '',
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
  const [recipientEmailError, setRecipientEmailError] = useState('')
  const [dateError, setDateError] = useState('')
  const [isBypassMode, setIsBypassMode] = useState(false)

  // Blocking overlay state
  const [uploadBlocking, setUploadBlocking] = useState(false)
  const [uploadBlockingMessage, setUploadBlockingMessage] = useState('')

  // ✅ NEW — Preview modal state
  const [showPreview, setShowPreview] = useState(false)

  const [additionalRecipients, setAdditionalRecipients] = useState([])
  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' })
  const [newRecipientEmailError, setNewRecipientEmailError] = useState('')

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
      const bypassParam = params.get('bypass') === 'true'
      setIsLegacyMode(legacyParam)
      setIsBypassMode(bypassParam)

      const { data: sub } = await supabase
        .from('subscriptions').select('plan, status')
        .eq('user_id', user.id).eq('status', 'active').single()
      const paid = sub && (sub.plan === 'loved' || sub.plan === 'forever')
      setIsPaid(paid)
      setCurrentPlan(sub?.plan || 'free')

      const { data: legacy } = await supabase
        .from('legacy_plans').select('*')
        .eq('user_id', user.id).eq('status', 'active').single()
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
          if (count >= 3 && !bypassParam) {
            setLimitReached(true)
            return
          }
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
        if (parsed.message) setWordCount(parsed.message.trim() === '' ? 0 : parsed.message.trim().split(/\s+/).length)
        sessionStorage.removeItem('capsuleForm')
        sessionStorage.removeItem('capsuleStep')
        sessionStorage.removeItem('capsuleMessageType')
      } else {
        setForm(f => ({ ...f, senderName: user.user_metadata?.name || '' }))
      }
    }
    checkUser()
  }, [])

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value }
    if (e.target.name === 'message') {
      setWordCount(e.target.value.trim() === '' ? 0 : e.target.value.trim().split(/\s+/).length)
    }
    if (e.target.name === 'recipientEmail') {
      setRecipientEmailError(e.target.value && !isValidEmail(e.target.value) ? 'Please enter a valid email (e.g. name@example.com)' : '')
    }
    if (e.target.name === 'unlockDate') {
      if (e.target.value && e.target.value <= new Date().toISOString().split('T')[0]) {
        setDateError('Please select a future date')
      } else {
        setDateError('')
      }
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
    setDateError('')
    setForm(updated)
  }

  const handleMessageTypeSwitch = (newType) => {
    if (newType === messageType) return
    const hasTextContent = messageType === 'text' && form.message.trim().length > 0
    const hasAudioContent = messageType === 'audio' && audioFile
    const hasVideoContent = messageType === 'video' && videoFile
    if (hasTextContent || hasAudioContent || hasVideoContent) {
      const contentType = messageType === 'text' ? 'text message' : messageType === 'audio' ? 'audio file' : 'video file'
      if (!confirm(`You have a ${contentType} ready. Switching will clear it. Continue?`)) return
    }
    if (messageType === 'text') setForm(f => ({ ...f, message: '' }))
    if (messageType === 'audio') setAudioFile(null)
    if (messageType === 'video') setVideoFile(null)
    setWordCount(0)
    setMessageType(newType)
  }

  const goToPricing = () => {
    sessionStorage.setItem('capsuleForm', JSON.stringify(form))
    sessionStorage.setItem('capsuleStep', step.toString())
    sessionStorage.setItem('capsuleMessageType', messageType)
    router.push('/upgrade')
  }

  const handleAddRecipient = () => {
    if (!newRecipient.name || !newRecipient.email) return
    if (!isValidEmail(newRecipient.email)) { setNewRecipientEmailError('Please enter a valid email address'); return }
    if (newRecipient.email === form.recipientEmail || additionalRecipients.some(r => r.email === newRecipient.email)) {
      setNewRecipientEmailError('This email is already added'); return
    }
    if (additionalRecipients.length >= 9) { alert('Maximum 10 recipients total'); return }
    setAdditionalRecipients([...additionalRecipients, { ...newRecipient }])
    setNewRecipient({ name: '', email: '' })
    setNewRecipientEmailError('')
    setShowAddRecipient(false)
  }

  const handleRemoveRecipient = (index) => {
    setAdditionalRecipients(additionalRecipients.filter((_, i) => i !== index))
  }

  const uploadFileToR2 = async (file, user) => {
    const setMsg = uploadBlocking ? setUploadBlockingMessage : setUploadProgress
    setMsg('Preparing upload...')
    const urlRes = await fetch('/api/get-upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id, fileType: messageType, fileName: file.name, fileSize: file.size,
        contentType: file.type || (messageType === 'video' ? 'video/mp4' : 'audio/mpeg'),
        plan: isLegacyMode ? 'legacy' : currentPlan,
      }),
    })
    const urlData = await urlRes.json()
    if (urlData.error) throw new Error(urlData.error)
    setMsg(`Uploading ${(file.size / 1024 / 1024).toFixed(1)}MB to cloud...`)
    const uploadRes = await fetch(urlData.presignedUrl, {
      method: 'PUT', body: file,
      headers: { 'Content-Type': file.type || (messageType === 'video' ? 'video/mp4' : 'audio/mpeg') },
    })
    if (!uploadRes.ok) throw new Error('Upload to cloud storage failed')
    setMsg('Confirming upload...')
    await fetch('/api/confirm-upload', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, fileType: messageType, fileSize: file.size }),
    })
    return { url: urlData.publicUrl, fileName: file.name, fileSize: file.size }
  }

  const saveCapsule = async (user, mediaUrl, mediaFileName, mediaFileSize, paymentId = null, paymentAmount = null, paymentCurrency = null) => {
    if (uploadBlocking) setUploadBlockingMessage('Saving your capsule...')
    else setUploadProgress('Sealing your capsule...')

    const insertData = {
      sender_name: form.senderName, relationship: form.relationship,
      recipient_name: form.recipientName, recipient_email: form.recipientEmail,
      sender_email: user?.email || null,
      message: messageType === 'text' ? form.message : `[${messageType === 'audio' ? 'Audio' : 'Video'} message: ${mediaFileName || 'file'}]`,
      unlock_date: isLegacyMode ? null : form.unlockDate,
      status: 'locked', is_legacy: isLegacyMode,
      media_type: messageType !== 'text' ? messageType : null,
      media_url: mediaUrl, media_file_name: mediaFileName, media_file_size: mediaFileSize,
      recipients: currentPlan === 'forever' && additionalRecipients.length > 0 ? additionalRecipients : [],
      plan_type: isLegacyMode ? 'legacy' : currentPlan, // ✅ NEW — track plan at creation time
    }
    if (user) insertData.sender_id = user.id
    const { data, error } = await supabase.from('capsules').insert(insertData).select()
    if (error) {
      console.error('Capsule insert error:', error)
      throw new Error(error.message || 'Failed to save capsule')
    }
    if (paymentId && data?.[0]?.id) {
      await supabase.from('capsule_payments').insert({
        user_id: user.id, capsule_id: data[0].id,
        payment_provider: 'razorpay', payment_id: paymentId,
        amount: paymentAmount, currency: paymentCurrency || 'INR',
        media_type: messageType, delivery_years: getDeliveryYears(form.unlockDate), status: 'paid',
      })
    }
    return data
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    let mediaUrl = null, mediaFileName = null, mediaFileSize = null
    const fileToUpload = messageType === 'audio' ? audioFile : messageType === 'video' ? videoFile : null

    // ✅ Show blocking overlay for file uploads (Loved/Forever/Legacy)
    if (fileToUpload) {
      setUploadBlocking(true)
      setUploadBlockingMessage(`Uploading ${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB to cloud...`)
      try {
        const result = await uploadFileToR2(fileToUpload, user)
        mediaUrl = result.url; mediaFileName = result.fileName; mediaFileSize = result.fileSize
      } catch (err) {
        setUploadBlocking(false)
        alert(err.message || 'Upload failed. Please try again.')
        setLoading(false); setUploadProgress(''); return
      }
    }

    try {
      if (fileToUpload) setUploadBlockingMessage('Sealing your capsule...')
      await saveCapsule(user, mediaUrl, mediaFileName, mediaFileSize)
      setUploadBlocking(false)
      setLoading(false); setUploadProgress(''); setSubmitted(true)
    } catch (err) {
      setUploadBlocking(false)
      alert('Something went wrong saving your capsule. Please try again.')
      setLoading(false); setUploadProgress('')
   }
  }

  const handlePerCapsulePayment = async (type) => {
    const fileToUpload = type === 'audio' ? audioFile : type === 'video' ? videoFile : null
    if ((type === 'audio' || type === 'video') && !fileToUpload) {
      alert(`Please select a ${type} file first`); return
    }
    if (type === 'text' && !form.message.trim()) {
      alert('Please write your message first'); return
    }
    setPerCapsulePaying(true)
    try {
      const res = await fetch('/api/razorpay-create-capsule-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, mediaType: type,
          unlockDate: form.unlockDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          fileSizeBytes: fileToUpload?.size || 0, currency: 'INR',
        })
      })
      const orderData = await res.json()
      if (orderData.error) throw new Error(orderData.error)

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount, currency: 'INR', order_id: orderData.orderId,
        name: 'TimeCapsule', description: orderData.label || `${type} capsule`,
        image: 'https://www.mytimecapsule.app/favicon.ico',
        prefill: { email: (await supabase.auth.getUser()).data.user?.email || '' },
        theme: { color: '#f59e0b' },
        handler: async function(response) {
          setPerCapsulePaying(false)
          setUploadBlocking(true)
          setUploadBlockingMessage('✅ Payment successful! Preparing your capsule...')

          const { data: { user } } = await supabase.auth.getUser()
          try {
            let mediaUrl = null, mediaFileName = null, mediaFileSize = null
            if (fileToUpload) {
              setUploadBlockingMessage(`Uploading ${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB to cloud...`)
              const result = await uploadFileToR2(fileToUpload, user)
              mediaUrl = result.url; mediaFileName = result.fileName; mediaFileSize = result.fileSize
            }
            setUploadBlockingMessage('Sealing your capsule...')
            await saveCapsule(user, mediaUrl, mediaFileName, mediaFileSize,
              response.razorpay_payment_id, orderData.amount / 100, 'INR')
            setUploadBlocking(false)
            setUploadProgress('')
            setSubmitted(true)
          } catch (err) {
            setUploadBlocking(false)
            alert('Payment successful but saving failed. Contact support with payment ID: ' + response.razorpay_payment_id)
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
    if (messageType === 'text') return !form.message
    if (messageType === 'audio') return !audioFile
    if (messageType === 'video') return !videoFile
    return true
  }

  const accentClasses = isLegacyMode ? {
    bg: 'bg-purple-50', ring: 'focus:ring-purple-300',
    btn: 'bg-purple-600 hover:bg-purple-700', text: 'text-purple-600',
    progress: 'bg-purple-500', tab: 'text-purple-600',
  } : {
    bg: 'bg-amber-50', ring: 'focus:ring-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-600', text: 'text-amber-600',
    progress: 'bg-amber-500', tab: 'text-amber-600',
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
        <div className="text-center p-6 md:p-10 max-w-lg w-full">
          <div className="text-6xl mb-4">💌</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">3 free capsules used</h1>
          <p className="text-gray-500 mb-8">Want to create more? Pay per capsule or subscribe for unlimited.</p>

          <div className="bg-white border-2 border-amber-400 rounded-2xl p-5 mb-4 text-left shadow-sm">
            <p className="font-bold text-gray-800 text-base mb-1">💳 Pay per capsule</p>
            <p className="text-sm text-gray-500 mb-4">No subscription needed · Create any type</p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">📝 Text capsule — unlimited words</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '1 year', inr: '₹19', eur: '€0.99' },
                  { label: '1-5 years', inr: '₹29', eur: '€1.49' },
                  { label: '5-10 years', inr: '₹49', eur: '€1.99' },
                  { label: '10+ years', inr: '₹99', eur: '€2.99' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2 text-xs">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-bold text-amber-700">{isIndia ? r.inr : r.eur}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">🎵 Audio capsule — max 50MB</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '1 year', inr: '₹49', eur: '€2.49' },
                  { label: '1-5 years', inr: '₹99', eur: '€3.99' },
                  { label: '5-10 years', inr: '₹199', eur: '€6.99' },
                  { label: '10+ years', inr: '₹399', eur: '€12.99' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2 text-xs">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-bold text-amber-700">{isIndia ? r.inr : r.eur}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">🎥 Video capsule — price by file size</p>
              <div className="space-y-1">
                {[
                  { label: '≤100MB · 1yr', inr: '₹149', eur: '€5.99' },
                  { label: '≤100MB · 5yr', inr: '₹299', eur: '€9.99' },
                  { label: '101-500MB · 1yr', inr: '₹299', eur: '€10.99' },
                  { label: '501MB-2GB · 1yr', inr: '₹599', eur: '€20.99' },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2 text-xs">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="font-bold text-amber-700">{isIndia ? r.inr : r.eur}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 mt-1 px-1">Price shown at checkout based on your file + delivery date</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4">⚠️ No refund if capsule deleted after payment</p>
            <a href="/create?bypass=true"
              className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold transition text-sm">
              Create Capsule →
            </a>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 text-left shadow-sm">
            <p className="font-bold text-gray-800 text-base mb-1">📅 Subscribe for unlimited</p>
            <p className="text-sm text-gray-500 mb-1">Unlimited text + audio + video · No per-capsule fees</p>
            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-gray-500">Loved plan</p>
                <p className="font-bold text-gray-800">{isIndia ? '₹99/mo' : '€2.99/mo'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-gray-500">Forever plan</p>
                <p className="font-bold text-gray-800">{isIndia ? '₹249/mo' : '€4.99/mo'}</p>
              </div>
            </div>
            <a href="/upgrade"
              className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold transition text-sm">
              See subscription plans →
            </a>
          </div>

          <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition">← Back to dashboard</a>
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
              : <>It will be delivered to <strong>{form.recipientName}</strong>{additionalRecipients.length > 0 ? ` and ${additionalRecipients.length} others` : ''} on <strong>{form.unlockDate}</strong>.</>
            }
          </p>
          {additionalRecipients.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 text-sm text-green-700">
              <p className="font-medium mb-1">Also delivering to:</p>
              {additionalRecipients.map((r, i) => <p key={i}>✅ {r.name} ({r.email})</p>)}
            </div>
          )}
          {isLegacyMode && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-6 text-sm text-purple-700">
              <p>✅ {legacyCapsuleCount + 1}/3 legacy capsules used</p>
              <p className="mt-1">Your legacy contacts will be notified when the time comes.</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <a href="/dashboard" className={`${accentClasses.btn} text-white px-6 py-3 rounded-full transition text-center`}>View my capsules</a>
            {isLegacyMode && legacyCapsuleCount < 2 && (
              <a href="/create?legacy=true" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">Add another legacy capsule</a>
            )}
            {!isLegacyMode && (
              <a href="/create" className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full hover:border-gray-400 transition text-center">Create another</a>
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

      {/* Blocking upload overlay */}
      {uploadBlocking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Please wait...</h2>
            <p className="text-gray-500 text-sm mb-6">{uploadBlockingMessage}</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
              <div className="h-2 rounded-full bg-amber-500 animate-pulse" style={{ width: '100%' }} />
            </div>
            <p className="text-xs text-red-500 font-medium">⚠️ Do not close or refresh this page</p>
          </div>
        </div>
      )}

      {/* ✅ NEW — Capsule Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">📬</div>
              <h2 className="text-lg font-bold text-gray-800">Preview your capsule</h2>
              <p className="text-xs text-gray-400 mt-1">Check everything before sealing</p>
            </div>

            <div className="space-y-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">From</p>
                <p className="text-sm font-medium text-gray-800">{form.senderName} ({form.relationship})</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">To</p>
                <p className="text-sm font-medium text-gray-800">{form.recipientName}</p>
                <p className="text-xs text-gray-500">{form.recipientEmail}</p>
                {additionalRecipients.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">+ {additionalRecipients.length} more recipient{additionalRecipients.length > 1 ? 's' : ''}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Unlocks</p>
                <p className="text-sm font-medium text-gray-800">
                  {isLegacyMode ? '👻 After team verification of your passing' : form.unlockDate}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-600 mb-1">
                  {messageType === 'text' ? '📝 Message' : messageType === 'audio' ? '🎵 Audio file' : '🎥 Video file'}
                </p>
                {messageType === 'text' ? (
                  <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-wrap">{form.message}</p>
                ) : messageType === 'audio' ? (
                  <p className="text-sm text-gray-700">{audioFile?.name} · {audioFile ? (audioFile.size / 1024 / 1024).toFixed(2) : 0} MB</p>
                ) : (
                  <p className="text-sm text-gray-700">{videoFile?.name} · {videoFile ? (videoFile.size / 1024 / 1024).toFixed(2) : 0} MB</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowPreview(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium transition hover:border-gray-300">
                ← Edit
              </button>
              <button onClick={() => { setShowPreview(false); handleSubmit() }} disabled={isSealDisabled()}
                className={`flex-1 ${accentClasses.btn} disabled:opacity-40 text-white py-3 rounded-xl text-sm font-semibold transition`}>
                {isLegacyMode ? 'Confirm & Seal 👻' : 'Confirm & Seal 🔒'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 py-8 md:py-12 px-4 md:px-6">
        <div className="max-w-xl mx-auto">

          <a href="/dashboard" className={`${accentClasses.text} text-sm mb-4 inline-block`}>← Back to dashboard</a>

          {isLegacyMode && (
            <div className="bg-purple-100 border border-purple-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-purple-800 font-bold text-sm">👻 Creating Legacy Capsule</p>
              <p className="text-purple-600 text-xs mt-0.5">{legacyCapsuleCount}/3 used · Delivered after team verifies your passing</p>
            </div>
          )}

          {!isPaid && !isLegacyMode && (
            <div className={`rounded-xl px-4 py-2 mb-4 text-sm text-center ${
              isBypassMode ? 'bg-blue-50 text-blue-700' : capsuleCount >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isBypassMode
                ? <>💳 Pay per capsule · <span className="font-semibold">Free capsules used up</span></>
                : capsuleCount < 3
                  ? <>{capsuleCount}/3 free capsules used</>
                  : null
              }
            </div>
          )}

          <div className="flex items-center gap-2 mb-6 md:mb-8">
            {[1, isLegacyMode ? null : 2, isLegacyMode ? 2 : 3].filter(Boolean).map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${step > i ? accentClasses.progress : 'bg-gray-200'}`} />
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 md:p-8">

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div>
                <div className="text-3xl mb-2">{isLegacyMode ? '👻' : '👤'}</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">
                  {isLegacyMode ? 'Who receives this legacy message?' : 'Who is this for?'}
                </h1>
                <p className="text-gray-400 text-sm mb-6">
                  {isLegacyMode ? 'Delivered after our team verifies your passing.' : 'Tell us about yourself and the person receiving this message.'}
                </p>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your name <span className="text-red-500">*</span></label>
                    <input name="senderName" value={form.senderName} onChange={handleChange}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="e.g. Gopala" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Your relationship to recipient <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                      {RELATIONSHIPS.map(r => (
                        <button key={r.id} type="button" onClick={() => setForm({ ...form, relationship: r.id })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Their name <span className="text-red-500">*</span></label>
                    <input name="recipientName" value={form.recipientName} onChange={handleChange}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder="e.g. Karsanvidhun" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Their email <span className="text-red-500">*</span></label>
                    <input name="recipientEmail" value={form.recipientEmail} onChange={handleChange} type="email"
                      className={`w-full border rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring} ${recipientEmailError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      placeholder="their@email.com" />
                    {recipientEmailError && <p className="text-xs text-red-500 mt-1">{recipientEmailError}</p>}
                  </div>

                  {currentPlan === 'forever' && !isLegacyMode && (
                    <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Additional recipients</span>
                          <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">👑 Forever</span>
                        </div>
                        {!showAddRecipient && additionalRecipients.length < 9 && (
                          <button type="button" onClick={() => setShowAddRecipient(true)}
                            className="text-xs text-amber-700 hover:text-amber-800 font-semibold border border-amber-300 px-2 py-1 rounded-lg transition">
                            + Add
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">Same message delivered to multiple people. ({1 + additionalRecipients.length}/10 recipients)</p>
                      {additionalRecipients.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {additionalRecipients.map((r, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                              <div>
                                <span className="text-sm text-gray-700 font-medium">{r.name}</span>
                                <span className="text-xs text-gray-400 ml-2">{r.email}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveRecipient(i)} className="text-xs text-red-400 hover:text-red-600 transition font-medium">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {showAddRecipient && (
                        <div className="bg-white rounded-xl p-3 border border-amber-200 space-y-2">
                          <input type="text" value={newRecipient.name}
                            onChange={e => setNewRecipient({ ...newRecipient, name: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            placeholder="Recipient name *" />
                          <input type="email" value={newRecipient.email}
                            onChange={e => {
                              setNewRecipient({ ...newRecipient, email: e.target.value })
                              setNewRecipientEmailError(e.target.value && !isValidEmail(e.target.value) ? 'Please enter a valid email' : '')
                            }}
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300 ${newRecipientEmailError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                            placeholder="Recipient email *" />
                          {newRecipientEmailError && <p className="text-xs text-red-500">{newRecipientEmailError}</p>}
                          <div className="flex gap-2">
                            <button type="button" onClick={handleAddRecipient}
                              disabled={!newRecipient.name || !newRecipient.email || !!newRecipientEmailError}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-medium transition">
                              Add Recipient
                            </button>
                            <button type="button"
                              onClick={() => { setShowAddRecipient(false); setNewRecipient({ name: '', email: '' }); setNewRecipientEmailError('') }}
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

                  {!isLegacyMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Their date of birth <span className="text-red-500">*</span></label>
                      <input name="recipientDob" value={form.recipientDob} onChange={handleChange} type="date"
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`} />
                    </div>
                  )}

                  <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>
                  <button onClick={() => setStep(2)}
                    disabled={!form.senderName || !form.relationship || !form.recipientName || !form.recipientEmail || !isValidEmail(form.recipientEmail)}
                    className={`w-full ${accentClasses.btn} disabled:opacity-40 text-white py-4 rounded-xl font-medium transition`}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 — Milestone ── */}
            {step === 2 && !isLegacyMode && (
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">When should it unlock?</h1>
                <p className="text-gray-400 text-sm mb-6">Choose a life milestone for {form.recipientName}.</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {MILESTONES.map(m => (
                    <button key={m.id} onClick={() => handleMilestone(m.id)}
                      className={`p-3 md:p-4 rounded-xl border-2 text-left transition ${form.milestone === m.id ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                      <div className="text-xl md:text-2xl mb-1">{m.emoji}</div>
                      <div className="text-xs md:text-sm font-medium text-gray-800">{m.label}</div>
                      <div className="text-xs text-gray-400 hidden md:block">{m.description}</div>
                    </button>
                  ))}
                </div>
                {form.unlockDate && !['graduation','custom'].includes(form.milestone) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                    <p className="text-sm text-amber-700">📅 Will unlock on <strong>{form.unlockDate}</strong>
                      {additionalRecipients.length > 0 && <span className="ml-2 text-xs">· {1 + additionalRecipients.length} recipients</span>}
                    </p>
                  </div>
                )}
                {['graduation','custom'].includes(form.milestone) && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Choose the date <span className="text-red-500">*</span></label>
                    <input name="unlockDate" value={form.unlockDate} onChange={handleChange} type="date"
                      min={tomorrow}
                      className={`w-full border rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300 ${dateError ? 'border-red-300' : 'border-gray-200'}`} />
                    {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">← Back</button>
                  <button
                    onClick={() => {
                      if (form.unlockDate && form.unlockDate <= new Date().toISOString().split('T')[0]) {
                        setDateError('Please select a future date')
                        return
                      }
                      setStep(3)
                    }}
                    disabled={!form.milestone || !form.unlockDate || !!dateError}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm">
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2 (legacy) OR STEP 3 (normal) — Message ── */}
            {((step === 2 && isLegacyMode) || (step === 3 && !isLegacyMode)) && (
              <div>
                <div className="text-3xl mb-2">✍️</div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">Your message</h1>
                <p className="text-gray-400 text-sm mb-5">
                  {isLegacyMode
                    ? `Delivered to ${form.recipientName} after team verification.`
                    : `Delivered to ${form.recipientName}${additionalRecipients.length > 0 ? ` + ${additionalRecipients.length} others` : ''} on ${form.unlockDate}.`
                  }
                </p>

                {isLegacyMode && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-5 text-xs text-purple-700">
                    <p>👻 <strong>Legacy capsule</strong> — delivered only after team verification.</p>
                    <p className="mt-1">Write as if this is the last message they'll ever receive from you. 💜</p>
                  </div>
                )}

                {additionalRecipients.length > 0 && !isLegacyMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                    <p className="font-semibold mb-1">👑 Delivering to {1 + additionalRecipients.length} recipients:</p>
                    <p>• {form.recipientName} ({form.recipientEmail})</p>
                    {additionalRecipients.map((r, i) => <p key={i}>• {r.name} ({r.email})</p>)}
                  </div>
                )}

                {/* Message type tabs */}
                <div className="flex gap-1 md:gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
                  {[
                    { id: 'text', emoji: '📝', label: 'Text' },
                    { id: 'audio', emoji: '🎵', label: 'Audio' },
                    { id: 'video', emoji: '🎥', label: 'Video' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => handleMessageTypeSwitch(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                        messageType === tab.id ? `bg-white ${accentClasses.tab} shadow-sm` : 'text-gray-500 hover:text-gray-700'
                      }`}>
                      <span>{tab.emoji}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* TEXT — paid/legacy */}
                {messageType === 'text' && (isPaid || isLegacyMode) && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your message <span className="text-red-500">*</span></label>
                    <textarea name="message" value={form.message} onChange={handleChange} rows={7}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring}`}
                      placeholder={isLegacyMode ? `Write your final message to ${form.recipientName}...` : `Write something from your heart to ${form.recipientName}...`} />
                    <p className="text-xs text-gray-400">{wordCount} words · Unlimited</p>
                  </div>
                )}

                {/* TEXT — free users */}
                {messageType === 'text' && !isPaid && !isLegacyMode && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your message <span className="text-red-500">*</span></label>
                      <textarea name="message" value={form.message} onChange={handleChange} rows={7}
                        className={`w-full border rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 ${accentClasses.ring} ${wordCount > 5000 && !isBypassMode ? 'border-red-300' : 'border-gray-200'}`}
                        placeholder={`Write something from your heart to ${form.recipientName}...`} />
                      <div className="flex justify-between items-center mt-1">
                        <p className={`text-xs ${wordCount > 5000 && !isBypassMode ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {isBypassMode
                            ? `${wordCount} words · Unlimited`
                            : `${wordCount} / 5,000 words${wordCount > 5000 ? ' — over limit!' : ''}`
                          }
                        </p>
                      </div>
                    </div>

                    {(isBypassMode || wordCount > 5000) && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {isBypassMode ? 'Pay per capsule — unlimited words' : 'Over 5,000 words — unlock unlimited'}
                          </p>
                        </div>
                        <div className="p-4 border-b border-gray-100">
                          <p className="font-bold text-gray-800 text-sm">💳 Pay for this capsule — unlimited words</p>
                          <p className="text-xs text-gray-500 mt-1">
                            One-time ·{' '}
                            {form.unlockDate
                              ? <>Delivery in {getDeliveryYears(form.unlockDate)} years → <strong>{getDisplayPrice('text', form.unlockDate, isIndia)}</strong></>
                              : <>from {isIndia ? '₹19' : '€0.99'}</>}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">⚠️ No refund if capsule deleted</p>
                          <button onClick={() => handlePerCapsulePayment('text')}
                            disabled={perCapsulePaying || !form.message.trim()}
                            className="w-full mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                            {perCapsulePaying ? 'Processing...' : !form.message.trim() ? 'Write your message first ↑' : `Pay ${getDisplayPrice('text', form.unlockDate, isIndia)} & Seal`}
                          </button>
                        </div>
                        <div className="p-4">
                          <p className="font-bold text-gray-800 text-sm">📅 Subscribe for unlimited always</p>
                          <p className="text-xs text-gray-500 mt-1">{isIndia ? '₹99/mo' : '€2.99/mo'} · Unlimited text + audio + video</p>
                          <button onClick={goToPricing}
                            className="w-full mt-3 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition">
                            See subscription plans →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* AUDIO — free users */}
                {messageType === 'audio' && !isPaid && !isLegacyMode && (
                  <div className="space-y-4">
                    <div className={`border-2 rounded-xl p-5 text-center ${audioFile ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-3xl mb-2">🎵</div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Select your audio file</p>
                      {!audioFile ? (
                        <>
                          <input type="file" accept="audio/*" id="audio-input-free" onChange={e => setAudioFile(e.target.files[0])} className="hidden" />
                          <label htmlFor="audio-input-free" className="inline-block cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition">
                            Choose audio file
                          </label>
                        </>
                      ) : (
                        <div className="bg-white rounded-xl p-3 border border-green-200">
                          <p className="text-sm text-green-700 font-medium">✅ {audioFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button onClick={() => setAudioFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg transition">🗑️ Remove file</button>
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
                          One-time ·{' '}
                          {form.unlockDate
                            ? <>Delivery in {getDeliveryYears(form.unlockDate)} years → <strong>{getDisplayPrice('audio', form.unlockDate, isIndia)}</strong></>
                            : <>from {isIndia ? '₹49' : '€2.49'}</>}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">⚠️ No refund if capsule deleted</p>
                        <button onClick={() => handlePerCapsulePayment('audio')} disabled={perCapsulePaying || !audioFile}
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                          {perCapsulePaying ? 'Processing...' : !audioFile ? 'Select audio file first ↑' : `Pay ${getDisplayPrice('audio', form.unlockDate, isIndia)} & Seal`}
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-gray-800 text-sm">📅 Subscribe for unlimited</p>
                        <p className="text-xs text-gray-500 mt-1">{isIndia ? '₹99/mo' : '€2.99/mo'} · Unlimited audio & video</p>
                        <button onClick={goToPricing} className="w-full mt-3 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition">
                          See subscription plans →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AUDIO — paid/legacy */}
                {messageType === 'audio' && (isPaid || isLegacyMode) && (
                  <div className={`border-2 rounded-xl p-6 text-center ${audioFile ? 'border-green-300 bg-green-50' : isLegacyMode ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'}`}>
                    <div className="text-4xl mb-3">🎵</div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Audio Message</h3>
                    <p className="text-gray-500 text-sm mb-4">Upload an audio file or record your voice.</p>
                    {!audioFile ? (
                      <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                    ) : (
                      <div className="bg-white rounded-xl p-3 border border-green-200 mb-2">
                        <p className="text-sm text-green-700 font-medium">✅ {audioFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button onClick={() => setAudioFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg transition">🗑️ Remove file</button>
                      </div>
                    )}
                    <p className="text-gray-400 text-xs mt-3">MP3, WAV, M4A · Max 50MB · Uploaded securely to cloud</p>
                  </div>
                )}

                {/* VIDEO — free users */}
                {messageType === 'video' && !isPaid && !isLegacyMode && (
                  <div className="space-y-4">
                    <div className={`border-2 rounded-xl p-5 text-center ${videoFile ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="text-3xl mb-2">🎥</div>
                      <p className="text-sm font-medium text-gray-700 mb-3">Select your video file</p>
                      {!videoFile ? (
                        <>
                          <input type="file" accept="video/*" id="video-input-free" onChange={e => setVideoFile(e.target.files[0])} className="hidden" />
                          <label htmlFor="video-input-free" className="inline-block cursor-pointer border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition">
                            Choose video file
                          </label>
                        </>
                      ) : (
                        <div className="bg-white rounded-xl p-3 border border-green-200">
                          <p className="text-sm text-green-700 font-medium">✅ {videoFile.name}</p>
                          <p className="text-xs text-gray-400 mt-1">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          {(() => {
                            const mb = videoFile.size / (1024 * 1024)
                            const tier = mb <= 100 ? 'up to 100MB' : mb <= 500 ? '101-500MB' : '501MB-2GB'
                            return <p className="text-xs text-amber-600 mt-1">Size tier: {tier}</p>
                          })()}
                          <button onClick={() => setVideoFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg transition">🗑️ Remove file</button>
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
                            ? <>Delivery in {getDeliveryYears(form.unlockDate)} years → <strong>{getDisplayPrice('video', form.unlockDate, isIndia)}</strong></>
                            : <>from {isIndia ? '₹149' : '€5.99'}</>}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">⚠️ No refund if capsule deleted</p>
                        <button onClick={() => handlePerCapsulePayment('video')} disabled={perCapsulePaying || !videoFile}
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                          {perCapsulePaying ? 'Processing...' : !videoFile ? 'Select video file first ↑' : `Pay ${getDisplayPrice('video', form.unlockDate, isIndia)} & Seal`}
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-gray-800 text-sm">📅 Subscribe for unlimited</p>
                        <p className="text-xs text-gray-500 mt-1">{isIndia ? '₹99/mo' : '€2.99/mo'} · Unlimited audio & video</p>
                        <button onClick={goToPricing} className="w-full mt-3 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl text-sm font-medium transition">
                          See subscription plans →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIDEO — paid/legacy */}
                {messageType === 'video' && (isPaid || isLegacyMode) && (
                  <div className={`border-2 rounded-xl p-6 text-center ${videoFile ? 'border-green-300 bg-green-50' : isLegacyMode ? 'border-purple-200 bg-purple-50' : 'border-green-200 bg-green-50'}`}>
                    <div className="text-4xl mb-3">🎥</div>
                    <h3 className="text-base font-bold text-gray-800 mb-2">Video Message</h3>
                    <p className="text-gray-500 text-sm mb-4">Upload a video file.</p>
                    {!videoFile ? (
                      <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                    ) : (
                      <div className="bg-white rounded-xl p-3 border border-green-200 mb-2">
                        <p className="text-sm text-green-700 font-medium">✅ {videoFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button onClick={() => setVideoFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg transition">🗑️ Remove file</button>
                      </div>
                    )}
                    <p className="text-gray-400 text-xs mt-3">MP4, MOV · Max 500MB · Uploaded securely to cloud</p>
                  </div>
                )}

                {uploadProgress && !uploadBlocking && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-sm text-blue-700">⏳ {uploadProgress}</p>
                  </div>
                )}

                {/* ✅ Seal button — paid/legacy — now opens preview instead of submitting directly */}
                {(isPaid || isLegacyMode) && (
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setStep(isLegacyMode ? 1 : 2)}
                      className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">← Back</button>
                    <button onClick={() => setShowPreview(true)} disabled={isSealDisabled()}
                      className={`flex-1 ${accentClasses.btn} disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm`}>
                      Preview & Seal →
                    </button>
                  </div>
                )}

                {/* ✅ Seal button — free text within 5000 words, not bypass — now opens preview */}
                {!isPaid && !isLegacyMode && messageType === 'text' && wordCount <= 5000 && !isBypassMode && (
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">← Back</button>
                    <button onClick={() => setShowPreview(true)} disabled={!form.message || loading}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white py-3 rounded-xl font-medium transition text-sm">
                      Preview & Seal →
                    </button>
                  </div>
                )}

                {/* Back only buttons */}
                {!isPaid && !isLegacyMode && messageType !== 'text' && (
                  <div className="mt-4">
                    <button onClick={() => setStep(2)} className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">← Back</button>
                  </div>
                )}
                {!isPaid && !isLegacyMode && messageType === 'text' && (wordCount > 5000 || isBypassMode) && (
                  <div className="mt-4">
                    <button onClick={() => setStep(2)} className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-sm">← Back</button>
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