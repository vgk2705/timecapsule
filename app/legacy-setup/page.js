'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

export default function LegacySetup() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [step, setStep] = useState(1)
  const [userDob, setUserDob] = useState('')
  const [ageInfo, setAgeInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasLegacyPlan, setHasLegacyPlan] = useState(false)
  const [legacyContact, setLegacyContact] = useState({
    name: '', email: '', mobile: '', relationship: ''
  })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)

      // Check if already has legacy plan
      const { data: plan } = await supabase
        .from('legacy_plans')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
      if (plan) setHasLegacyPlan(true)
    })

    // Load Razorpay
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const calculateAge = (dob) => {
    const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
    let group, years, price, priceEur
    if (age < 30) { group = '20s'; years = 75; price = '₹4,999'; priceEur = '€49' }
    else if (age < 40) { group = '30s'; years = 65; price = '₹4,499'; priceEur = '€44' }
    else if (age < 50) { group = '40s'; years = 55; price = '₹3,999'; priceEur = '€39' }
    else if (age < 60) { group = '50s'; years = 45; price = '₹3,499'; priceEur = '€34' }
    else if (age < 70) { group = '60s'; years = 35; price = '₹2,999'; priceEur = '€29' }
    else if (age < 80) { group = '70s'; years = 25; price = '₹2,499'; priceEur = '€24' }
    else { group = '80+'; years = 15; price = '₹1,999'; priceEur = '€19' }
    return { age, group, years, price, priceEur }
  }

  const handleDobChange = (dob) => {
    setUserDob(dob)
    if (dob) setAgeInfo(calculateAge(dob))
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/razorpay-create-legacy-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, userDob })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: 'INR',
        order_id: data.orderId,
        name: 'TimeCapsule Legacy Plan',
        description: `Legacy plan — ${data.years} years storage`,
        prefill: { email: user.email, name: user.user_metadata?.name || '' },
        theme: { color: '#7c3aed' },
        handler: async function(response) {
          // Save legacy plan to Supabase
          await supabase.from('legacy_plans').insert({
            user_id: user.id,
            user_dob: userDob,
            user_age: data.age,
            years_covered: data.years,
            amount_paid: data.amount / 100,
            currency: 'INR',
            payment_provider: 'razorpay',
            payment_id: response.razorpay_payment_id,
            status: 'active',
            storage_limit_bytes: 1073741824 // 1GB
          })
          setHasLegacyPlan(true)
          setStep(3) // Go to legacy contact setup
        },
        modal: { ondismiss: () => setLoading(false) }
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert('Something went wrong. Please try again.')
      console.error(err)
    }
    setLoading(false)
  }

  const handleSaveLegacyContact = async () => {
    if (!legacyContact.name || !legacyContact.email || !legacyContact.mobile) {
      alert('Please fill all required fields')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('legacy_contacts').upsert({
      user_id: user.id,
      contact_name: legacyContact.name,
      contact_email: legacyContact.email,
      contact_mobile: legacyContact.mobile,
      relationship: legacyContact.relationship,
      status: 'active'
    }, { onConflict: 'user_id' })

    if (!error) {
      // Set up check-in
      const nextCheckin = new Date()
      nextCheckin.setMonth(nextCheckin.getMonth() + 6)
      await supabase.from('checkins').upsert({
        user_id: user.id,
        last_checkin_at: new Date().toISOString(),
        next_checkin_due: nextCheckin.toISOString(),
        checkin_token: crypto.randomUUID(),
      }, { onConflict: 'user_id' })

      setStep(4)
    } else {
      alert('Error saving. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-purple-50 flex flex-col">
      <header className="px-4 md:px-6 py-4 border-b border-purple-100 bg-purple-50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-2xl">⏳</span>
            <span className="text-lg font-semibold text-purple-900">TimeCapsule</span>
          </div>
          <a href="/dashboard" className="text-sm text-purple-600 hover:underline">← Dashboard</a>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">👻</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">When I Am Gone</h1>
          <p className="text-gray-500">Leave messages that will be delivered after you pass away. Verified by our team before release.</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10">
          {['Plan', 'Payment', 'Contact', 'Done'].map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-sm font-bold ${
                step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-purple-600 text-white' :
                'bg-gray-200 text-gray-400'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">

          {/* Step 1 — Enter DOB and see pricing */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Choose your Legacy Plan</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your date of birth to calculate your personalised plan price. We store your legacy capsules until delivery — no monthly charges ever.</p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your date of birth <span className="text-red-500">*</span>
                </label>
                <input type="date" value={userDob}
                  onChange={e => handleDobChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>

              {ageInfo && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Your age: {ageInfo.age} years</p>
                      <p className="text-sm text-gray-500">Storage covered: {ageInfo.years} years</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-700">{ageInfo.price}</p>
                      <p className="text-xs text-gray-400">one-time payment</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 border-t border-purple-100 pt-4">
                    <p>✅ Up to 3 legacy capsules</p>
                    <p>✅ 1GB total storage (text + audio + video)</p>
                    <p>✅ Stored for {ageInfo.years} years</p>
                    <p>✅ Personal verification by our team</p>
                    <p>✅ No monthly charges — ever</p>
                    <p>✅ Check-in reminders every 6 months</p>
                    <p>✅ Legacy contact notified when time comes</p>
                  </div>
                </div>
              )}

              {/* What happens section */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">How it works:</h3>
                <div className="space-y-2 text-xs text-gray-500">
                  <p>1️⃣ Pay once — your capsules are stored for {ageInfo?.years || '??'} years</p>
                  <p>2️⃣ We email you every 6 months to check you're still with us</p>
                  <p>3️⃣ If you miss a check-in, we contact your legacy contact</p>
                  <p>4️⃣ They submit proof and our team calls to verify personally</p>
                  <p>5️⃣ After verification, your messages are delivered with love 💛</p>
                </div>
              </div>

              <button onClick={() => setStep(2)}
                disabled={!userDob || !ageInfo}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-4 rounded-xl font-semibold transition">
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Step 2 — Payment */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Complete Payment</h2>
              <p className="text-gray-500 text-sm mb-6">One-time payment. No recurring charges.</p>

              {ageInfo && (
                <div className="bg-purple-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">Legacy Plan</p>
                      <p className="text-sm text-gray-500">{ageInfo.years} years · 1GB storage · 3 capsules</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{ageInfo.price}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm text-gray-500 mb-6 bg-amber-50 rounded-xl p-4">
                <p>⚠️ <strong>Important:</strong> This is a one-time payment.</p>
                <p>📧 You'll receive check-in emails every 6 months.</p>
                <p>🔒 Your capsules are stored securely until delivery.</p>
                <p>👥 Our team personally verifies before releasing messages.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300">
                  ← Back
                </button>
                <button onClick={handlePayment} disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition">
                  {loading ? 'Processing...' : `Pay ${ageInfo?.price}`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Legacy Contact */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Add Your Legacy Contact</h2>
              <p className="text-gray-500 text-sm mb-6">This trusted person will be contacted when you miss a check-in. Our team will call them to verify before releasing your messages.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Their full name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={legacyContact.name}
                    onChange={e => setLegacyContact({ ...legacyContact, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="e.g. Swapna" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Their email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={legacyContact.email}
                    onChange={e => setLegacyContact({ ...legacyContact, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="their@email.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Their mobile number <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" value={legacyContact.mobile}
                    onChange={e => setLegacyContact({ ...legacyContact, mobile: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="+91 98765 43210" />
                  <p className="text-xs text-gray-400 mt-1">Our team will call this number to verify before releasing your messages.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship to you
                  </label>
                  <select value={legacyContact.relationship}
                    onChange={e => setLegacyContact({ ...legacyContact, relationship: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                    <option value="">Select relationship</option>
                    <option value="spouse">Spouse / Partner</option>
                    <option value="child">Son / Daughter</option>
                    <option value="sibling">Brother / Sister</option>
                    <option value="parent">Father / Mother</option>
                    <option value="friend">Close Friend</option>
                    <option value="lawyer">Lawyer / Notary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-700">
                  <p className="font-semibold mb-1">⚠️ Important — Tell your legacy contact:</p>
                  <p>• They are named as your legacy contact on TimeCapsule</p>
                  <p>• They may be contacted if you miss check-ins</p>
                  <p>• Our team will call them before releasing your messages</p>
                </div>

                <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Required fields</p>

                <button onClick={handleSaveLegacyContact} disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-4 rounded-xl font-semibold transition">
                  {loading ? 'Saving...' : 'Save & Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-6xl mb-6">💜</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Legacy Plan Active!</h2>
              <p className="text-gray-500 mb-6">Your legacy capsules will be kept safe and delivered with love when the time comes.</p>

              <div className="bg-purple-50 rounded-xl p-4 mb-6 text-left text-sm text-gray-600 space-y-2">
                <p>✅ Legacy plan activated</p>
                <p>✅ Legacy contact saved</p>
                <p>✅ Check-in emails set up every 6 months</p>
                <p>📝 Next step: Create your legacy capsules</p>
              </div>

              <div className="flex flex-col gap-3">
                <a href="/create?legacy=true"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition text-center">
                  Create Legacy Capsule →
                </a>
                <a href="/dashboard"
                  className="block w-full border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300 text-center">
                  Back to Dashboard
                </a>
              </div>
            </div>
          )}

        </div>
      </main>

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
}