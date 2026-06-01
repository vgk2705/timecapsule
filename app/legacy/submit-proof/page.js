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

  const handleFindContact = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('legacy_contacts')
      .select('*, legacy_plans!user_id(*)')
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

    setLoading(true)
    setError('')

    try {
      // Upload proof document to Supabase storage
      const fileExt = proofFile.name.split('.').pop()
      const fileName = `${contactInfo.user_id}_${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('legacy-proofs')
        .upload(fileName, proofFile)

      if (uploadError) throw new Error('Failed to upload document')

      const { data: { publicUrl } } = supabase.storage
        .from('legacy-proofs')
        .getPublicUrl(fileName)

      // Save verification record
      const { error: verifyError } = await supabase
        .from('legacy_verifications')
        .insert({
          user_id: contactInfo.user_id,
          legacy_contact_id: contactInfo.id,
          proof_document_url: publicUrl,
          proof_document_name: proofFile.name,
          proof_document_size: proofFile.size,
          proof_type: proofType,
          submitted_at: new Date().toISOString(),
          status: 'pending',
        })

      if (verifyError) throw new Error('Failed to save verification')

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

      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (submitted) return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">💜</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Proof submitted</h1>
        <p className="text-gray-500 mb-4">
          Our team has received your submission and will contact you within <strong>48 hours</strong> on your mobile number to verify.
        </p>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700 text-left">
          <p>✅ Proof document received</p>
          <p>📞 Our team will call you at <strong>{contactInfo?.contact_mobile}</strong></p>
          <p>⏳ Verification takes 24-48 hours</p>
          <p>💌 Messages released after verification</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <header className="px-4 py-4 border-b border-purple-100">
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
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="your@email.com" />
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button onClick={handleFindContact} disabled={!email || loading}
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
                <p className="text-xs text-gray-500 mt-1">You are listed as the legacy contact for a TimeCapsule user.</p>
              </div>

              <h2 className="text-lg font-bold text-gray-800 mb-4">Submit proof of passing</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of proof <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'death_certificate', label: 'Death Certificate' },
                    { id: 'hospital_letter', label: 'Hospital/Doctor Letter' },
                    { id: 'obituary', label: 'Obituary / News Article' },
                    { id: 'other', label: 'Other official document' },
                  ].map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      proofType === opt.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                    }`}>
                      <input type="radio" name="proofType" value={opt.id}
                        checked={proofType === opt.id}
                        onChange={e => setProofType(e.target.value)}
                        className="accent-purple-600" />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload document <span className="text-red-500">*</span>
                </label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setProofFile(e.target.files[0])}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white cursor-pointer" />
                {proofFile && (
                  <div className="mt-2 bg-green-50 rounded-xl p-3 border border-green-200">
                    <p className="text-sm text-green-700">✅ {proofFile.name}</p>
                    <p className="text-xs text-gray-400">{(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, DOC accepted · Max 10MB</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  placeholder="Any additional information for our team..." />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                <p>⚠️ Our team will call you at <strong>{contactInfo.contact_mobile}</strong> within 48 hours to verify.</p>
                <p className="mt-1">Messages will only be released after personal verification.</p>
              </div>

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button onClick={handleSubmitProof} disabled={loading || !proofType || !proofFile}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition">
                {loading ? 'Submitting...' : 'Submit Proof →'}
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