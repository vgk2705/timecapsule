'use client'
import { useState } from 'react'
import { supabase } from '../../supabase'

export default function SubmitProof() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [contactInfo, setContactInfo] = useState(null)
  const [proofType, setProofType] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const handleFindContact = async () => {
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

  const handleSubmitProof = async () => {
    if (!proofType) { setError('Please select a proof type.'); return }
    if (!proofFile) { setError('Please upload a proof document.'); return }

    // Check file size (10MB max)
    if (proofFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Upload proof document to Cloudflare R2 via API
      // Step 1 — Get presigned URL
setUploadProgress('Preparing upload...')
const urlRes = await fetch('/api/get-upload-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: contactInfo.user_id,
    fileType: 'proof',
    fileName: proofFile.name,
    fileSize: proofFile.size,
    contentType: proofFile.type,
    plan: 'legacy',
  }),
})

const urlData = await urlRes.json()
if (urlData.error) throw new Error(urlData.error)

// Step 2 — Upload directly to R2
setUploadProgress('Uploading document...')
const uploadRes = await fetch(urlData.presignedUrl, {
  method: 'PUT',
  body: proofFile,
  headers: { 'Content-Type': proofFile.type },
})

if (!uploadRes.ok) throw new Error('Failed to upload document')

// Use the key to build a signed URL for admin to view later
const proofUrl = `proof:${urlData.key}` // Store key, admin uses signed URL to view
setUploadProgress('Saving verification record...')

      // Save verification record to Supabase
      const { error: verifyError } = await supabase
        .from('legacy_verifications')
        .insert({
          user_id: contactInfo.user_id,
          legacy_contact_id: contactInfo.id,
          proof_document_url: proofUrl,
          proof_document_name: proofFile.name,
          proof_document_size: proofFile.size,
          proof_type: proofType,
          submitted_at: new Date().toISOString(),
          status: 'pending',
        })

      if (verifyError) throw new Error('Failed to save verification record')

      setUploadProgress('Notifying team...')

      // Notify admin team
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
        })
      })

      setUploadProgress('')
      setSubmitted(true)
    } catch (err) {
      setUploadProgress('')
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (submitted) return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">💜</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Proof submitted</h1>
        <p className="text-gray-500 mb-6">
          Our team has received your submission and will contact you within <strong>48 hours</strong> on your mobile number to verify.
        </p>
        <div className="bg-white border border-purple-200 rounded-xl p-5 text-sm text-left space-y-2">
          <p className="text-purple-700">✅ Proof document uploaded securely</p>
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

          {/* Step 1 — Find contact */}
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
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFindContact()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="your@email.com"
                />
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

          {/* Step 2 — Submit proof */}
          {step === 2 && contactInfo && (
            <div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-purple-700 font-medium">✅ Legacy contact verified</p>
                <p className="text-xs text-gray-500 mt-1">
                  You are listed as the legacy contact for a TimeCapsule user.
                </p>
              </div>

              <h2 className="text-lg font-bold text-gray-800 mb-4">Submit proof of passing</h2>

              {/* Proof type selection */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of proof <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'death_certificate', label: 'Death Certificate', desc: 'Official government-issued certificate' },
                    { id: 'hospital_letter', label: 'Hospital / Doctor Letter', desc: 'Letter from hospital or treating doctor' },
                    { id: 'obituary', label: 'Obituary / News Article', desc: 'Published obituary or news report' },
                    { id: 'other', label: 'Other official document', desc: 'Any other official documentation' },
                  ].map(opt => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                        proofType === opt.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}>
                      <input
                        type="radio"
                        name="proofType"
                        value={opt.id}
                        checked={proofType === opt.id}
                        onChange={e => setProofType(e.target.value)}
                        className="accent-purple-600 mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                        <p className="text-xs text-gray-400">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* File upload */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload document <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setProofFile(e.target.files[0])}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer"
                />
                {proofFile && (
                  <div className="mt-2 bg-green-50 rounded-xl p-3 border border-green-200">
                    <p className="text-sm text-green-700 font-medium">✅ {proofFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC accepted · Max 10MB · Stored securely</p>
              </div>

              {/* Additional notes */}
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

              {/* Call notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-xs text-amber-700 font-medium">
                  📞 Our team will call <strong>{contactInfo.contact_mobile}</strong> within 48 hours
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Messages will only be released after our team personally verifies with you.
                </p>
              </div>

              {/* Upload progress */}
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
                disabled={loading || !proofType || !proofFile}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition">
                {loading ? 'Submitting...' : 'Submit Proof →'}
              </button>

              <button
                onClick={() => { setStep(1); setError('') }}
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