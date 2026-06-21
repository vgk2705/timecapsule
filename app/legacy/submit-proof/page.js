'use client'
import { useState } from 'react'
import { supabase } from '../../supabase'

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export default function SubmitProof() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [contactInfo, setContactInfo] = useState(null)
  const [proofType, setProofType] = useState('')
  const [proofFiles, setProofFiles] = useState([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const handleFindContact = async () => {
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com)')
      return
    }
    setEmailError('')
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('legacy_contacts')
      .select('*')
      .eq('contact_email', email.trim().toLowerCase())
      .eq('status', 'active')
      .single()

    if (error || !data) {
      setError('No legacy contact found with this email. Please check and try again.')
      setLoading(false)
      return
    }
    setContactInfo(data)
    setStep(2)
    setLoading(false)
  }

  const handleAddFiles = (newFiles) => {
    const filesArray = Array.from(newFiles)
    const maxFiles = 10
    const maxSizePerFile = 50 * 1024 * 1024

    const validFiles = []
    for (const file of filesArray) {
      if (proofFiles.length + validFiles.length >= maxFiles) {
        alert(`Maximum ${maxFiles} files allowed.`)
        break
      }
      if (file.size > maxSizePerFile) {
        alert(`${file.name} is too large. Maximum size per file is 50MB.`)
        continue
      }
      validFiles.push(file)
    }
    setProofFiles([...proofFiles, ...validFiles])
  }

  const handleRemoveFile = (index) => {
    setProofFiles(proofFiles.filter((_, i) => i !== index))
  }

  const uploadProofFile = async (file, userId) => {
    const urlRes = await fetch('/api/get-proof-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
      }),
    })

    if (!urlRes.ok) {
      const errData = await urlRes.json().catch(() => ({}))
      throw new Error(errData.error || `Failed to get upload URL (server returned ${urlRes.status})`)
    }

    const urlData = await urlRes.json()
    if (urlData.error) throw new Error(urlData.error)

    const uploadRes = await fetch(urlData.presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })

    if (!uploadRes.ok) {
      throw new Error(`Upload to cloud storage failed for ${file.name} (status ${uploadRes.status})`)
    }

    return { key: urlData.key, name: file.name, size: file.size }
  }

  const handleSubmitProof = async () => {
    if (!proofType) { setError('Please select a proof type.'); return }
    if (proofFiles.length === 0) { setError('Please upload at least one proof document.'); return }

    setLoading(true)
    setError('')

    try {
      const uploadedFiles = []

      for (let i = 0; i < proofFiles.length; i++) {
        const file = proofFiles[i]
        setUploadProgress(`Uploading document ${i + 1} of ${proofFiles.length}: ${file.name}...`)
        const result = await uploadProofFile(file, contactInfo.user_id)
        uploadedFiles.push(result)
      }

      setUploadProgress('Saving verification record...')

      const { error: verifyError } = await supabase
        .from('legacy_verifications')
        .insert({
          user_id: contactInfo.user_id,
          legacy_contact_id: contactInfo.id,
          proof_document_url: uploadedFiles[0].key,
          proof_document_name: uploadedFiles.map(f => f.name).join(', '),
          proof_document_size: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
          proof_type: proofType,
          submitted_at: new Date().toISOString(),
          status: 'pending',
          team_notes: uploadedFiles.length > 1
            ? `Multiple files (${uploadedFiles.length}): ${uploadedFiles.map(f => f.key).join(' | ')}`
            : null,
        })

      if (verifyError) throw new Error('Failed to save verification record: ' + verifyError.message)

      setUploadProgress('Notifying team...')

      await fetch('/api/notify-legacy-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: contactInfo.contact_name,
          contactEmail: contactInfo.contact_email,
          contactMobile: contactInfo.contact_mobile,
          userId: contactInfo.user_id,
          proofType,
          notes,
          fileCount: uploadedFiles.length,
        })
      })

      setUploadProgress('')
      setSubmitted(true)
    } catch (err) {
      console.error('Submit proof error:', err)
      setUploadProgress('')
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const PROOF_TYPES = [
    { id: 'death_certificate', label: 'Death Certificate' },
    { id: 'hospital_letter', label: 'Hospital / Doctor Letter' },
    { id: 'obituary', label: 'Obituary / News Article' },
    { id: 'other', label: 'Other official document' },
  ]

  if (submitted) return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">💜</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Proof submitted</h1>
        <p className="text-gray-500 mb-6">
          Our team has received your submission and will contact you within <strong>48 hours</strong> on your mobile number to verify.
        </p>
        <div className="bg-white border border-purple-200 rounded-xl p-5 text-sm text-left space-y-2">
          <p className="text-purple-700">✅ {proofFiles.length} document{proofFiles.length > 1 ? 's' : ''} uploaded securely</p>
          <p className="text-purple-700">📞 Our team will call you at <strong>{contactInfo?.contact_mobile}</strong></p>
          <p className="text-purple-700">⏳ Verification takes 24-48 hours</p>
          <p className="text-purple-700">💌 Messages released only after personal verification</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <header className="px-4 py-4 border-b border-purple-100 bg-purple-50">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <span className="text-2xl">⏳</span>
          <span className="text-lg font-semibold text-purple-900">TimeCapsule</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👻</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Legacy Message Release</h1>
          <p className="text-gray-500 text-sm">
            Submit proof to release the messages left for their loved ones.
            Our team will personally verify before releasing any messages.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">

          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Verify your identity</h2>
              <p className="text-gray-500 text-sm mb-6">
                Enter the email address that was registered as the legacy contact.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleFindContact()}
                  className={`w-full border rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                    emailError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="your@email.com"
                />
                {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleFindContact}
                disabled={!email || loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition">
                {loading ? 'Searching...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ✅ STEP 2 — Redesigned: dropdown first, then file upload below */}
          {step === 2 && contactInfo && (
            <div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-purple-700 font-medium">✅ Legacy contact verified</p>
                <p className="text-xs text-gray-500 mt-1">
                  You are listed as the legacy contact for a TimeCapsule user.
                </p>
              </div>

              <h2 className="text-lg font-bold text-gray-800 mb-4">Submit proof of passing</h2>

              {/* ✅ Proof type — now a dropdown */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of proof <span className="text-red-500">*</span>
                </label>
                <select
                  value={proofType}
                  onChange={e => setProofType(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 appearance-none cursor-pointer">
                  <option value="">Select proof type...</option>
                  {PROOF_TYPES.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* ✅ File upload — only enabled/shown after proof type selected */}
              <div className={`mb-5 transition ${!proofType ? 'opacity-50' : ''}`}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload documents <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  multiple
                  disabled={!proofType}
                  onChange={e => handleAddFiles(e.target.files)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {!proofType ? 'Select a proof type first ↑' : 'PDF, JPG, PNG, DOC accepted · Max 50MB per file · Up to 10 files'}
                </p>

                {proofFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {proofFiles.map((file, i) => (
                      <div key={i} className="bg-green-50 rounded-xl p-3 border border-green-200 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 font-medium">✅ {file.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={() => handleRemoveFile(i)}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg transition flex-shrink-0">
                          🗑️ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Any additional information for our team..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-xs text-amber-700 font-medium">
                  📞 Our team will call <strong>{contactInfo.contact_mobile}</strong> within 48 hours
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Messages will only be released after our team personally verifies with you.
                </p>
              </div>

              {uploadProgress && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-purple-700">⏳ {uploadProgress}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmitProof}
                disabled={loading || !proofType || proofFiles.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition">
                {loading ? 'Submitting...' : `Submit ${proofFiles.length > 0 ? `${proofFiles.length} Document${proofFiles.length > 1 ? 's' : ''}` : 'Proof'} →`}
              </button>

              <button
                onClick={() => { setStep(1); setError(''); setProofFiles([]) }}
                className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600 transition">
                ← Use different email
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-gray-400 text-sm px-4">
        <div className="flex flex-wrap justify-center gap-4 mb-3">
          <a href="/privacy" className="hover:text-purple-600 transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-purple-600 transition">Terms of Service</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}