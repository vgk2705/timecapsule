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
  const [contacts, setContacts] = useState([
    { name: '', email: '', mobile: '', relationship: '' },
    { name: '', email: '', mobile: '', relationship: '' },
  ])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const { data: plan } = await supabase
        .from('legacy_plans')
        .select('*')
        .eq('user_id', data.user.id)
        .single()
      if (plan) setHasLegacyPlan(true)
    })

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const calculateAge = (dob) => {
    const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
    let group, years, price, priceEur
    if (age < 30) { group = '20s'; years = 75; price = '₹4,999'; priceEur = '€149' }
    else if (age < 40) { group = '30s'; years = 65; price = '₹4,499'; priceEur = '€134' }
    else if (age < 50) { group = '40s'; years = 55; price = '₹3,999'; priceEur = '€119' }
    else if (age < 60) { group = '50s'; years = 45; price = '₹3,499'; priceEur = '€104' }
    else if (age < 70) { group = '60s'; years = 35; price = '₹2,999'; priceEur = '€89' }
    else if (age < 80) { group = '70s'; years = 25; price = '₹2,499'; priceEur = '€74' }
    else { group = '80+'; years = 15; price = '₹1,999'; priceEur = '€59' }
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
        // ✅ FIX — check insert result before advancing to step 3
        handler: async function(response) {
          const { data: insertedPlan, error: insertError } = await supabase
            .from('legacy_plans')
            .insert({
              user_id: user.id,
              user_dob: userDob,
              user_age: data.age,
              years_covered: data.years,
              amount_paid: data.amount / 100,
              currency: 'INR',
              payment_provider: 'razorpay',
              payment_id: response.razorpay_payment_id,
              status: 'active',
              storage_limit_bytes: 1073741824
            })
            .select()

          if (insertError) {
            console.error('Legacy plan insert failed:', insertError)
            alert('Payment successful but saving failed. Please contact support immediately with this payment ID: ' + response.razorpay_payment_id)
            setLoading(false)
            return
          }

          setHasLegacyPlan(true)
          setStep(3)
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

  const addContact = () => {
    if (contacts.length >= 5) {
      alert('Maximum 5 legacy contacts allowed.')
      return
    }
    setContacts([...contacts, { name: '', email: '', mobile: '', relationship: '' }])
  }

  const removeContact = (index) => {
    if (contacts.length <= 2) {
      alert('Minimum 2 legacy contacts required for safety.')
      return
    }
    setContacts(contacts.filter((_, i) => i !== index))
  }

  const updateContact = (index, field, value) => {
    const updated = [...contacts]
    updated[index][field] = value
    setContacts(updated)
  }

  const handleSaveLegacyContact = async () => {
    const validContacts = contacts.filter(c => c.name && c.email && c.mobile)
    if (validContacts.length < 2) {
      alert('Please fill in at least 2 legacy contacts with name, email and mobile.')
      return
    }

    setLoading(true)
    try {
      await supabase
        .from('legacy_contacts')
        .delete()
        .eq('user_id', user.id)

      for (let i = 0; i < validContacts.length; i++) {
        const contact = validContacts[i]
        await supabase.from('legacy_contacts').insert({
          user_id: user.id,
          contact_name: contact.name,
          contact_email: contact.email,
          contact_mobile: contact.mobile,
          relationship: contact.relationship,
          status: 'active',
          priority: i + 1,
          is_primary: i === 0,
        })

        await fetch('/api/notify-legacy-contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactName: contact.name,
            contactEmail: contact.email,
            userName: user.user_metadata?.name || user.email,
            isPrimary: i === 0,
          })
        })
      }

      const nextCheckin = new Date()
      nextCheckin.setMonth(nextCheckin.getMonth() + 6)
      await supabase.from('checkins').upsert({
        user_id: user.id,
        last_checkin_at: new Date().toISOString(),
        next_checkin_due: nextCheckin.toISOString(),
        checkin_token: crypto.randomUUID(),
        missed: false,
        legacy_alert_sent: false,
      }, { onConflict: 'user_id' })

      setStep(4)
    } catch (err) {
      alert('Error saving contacts. Please try again.')
      console.error(err)
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

        <div className="text-center mb-10">
          <div className="text-5xl mb-4">👻</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">When I Am Gone</h1>
          <p className="text-gray-500">Leave messages to be delivered after you pass. Verified personally by our team.</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10">
          {['Plan', 'Payment', 'Contacts', 'Done'].map((label, i) => (
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

          {/* Step 1 — DOB and pricing */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Choose your Legacy Plan</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your date of birth to calculate your personalised price. No monthly charges — ever.</p>

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
                    <p>✅ 2-5 legacy contacts for safety</p>
                    <p>✅ Personal verification by our team</p>
                    <p>✅ No monthly charges — ever</p>
                    <p>✅ Check-in reminders every 6 months</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">How it works:</h3>
                <div className="space-y-2 text-xs text-gray-500">
                  <p>1️⃣ Pay once — stored for {ageInfo?.years || '??'} years</p>
                  <p>2️⃣ Add 2-5 trusted legacy contacts</p>
                  <p>3️⃣ We email you every 6 months to check you're still with us</p>
                  <p>4️⃣ If you miss a check-in, we contact ALL your legacy contacts</p>
                  <p>5️⃣ They submit proof — our team calls to verify personally</p>
                  <p>6️⃣ After verification, your messages are delivered with love 💛</p>
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
                      <p className="text-sm text-gray-500">{ageInfo.years} years · 1GB · 3 capsules · 2-5 contacts</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{ageInfo.price}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm text-gray-500 mb-6 bg-amber-50 rounded-xl p-4">
                <p>⚠️ <strong>One-time payment.</strong></p>
                <p>📧 Check-in emails every 6 months.</p>
                <p>👥 Add 2-5 trusted contacts after payment.</p>
                <p>🔒 Your capsules stored securely until delivery.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl transition hover:border-gray-300">← Back</button>
                <button onClick={handlePayment} disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-3 rounded-xl font-semibold transition">
                  {loading ? 'Processing...' : `Pay ${ageInfo?.price}`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Multiple Legacy Contacts */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">Add Legacy Contacts</h2>
              <p className="text-gray-500 text-sm mb-2">Add 2-5 trusted people. All will be notified when check-in is missed. Anyone can submit proof.</p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700">
                <p>⚠️ <strong>Minimum 2 contacts required</strong> for safety. Maximum 5.</p>
                <p className="mt-1">All contacts will receive a welcome email with the proof submission link.</p>
              </div>

              <div className="space-y-4 mb-4">
                {contacts.map((contact, index) => (
                  <div key={index} className={`border-2 rounded-xl p-4 ${index === 0 ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        index === 0 ? 'bg-purple-200 text-purple-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {index === 0 ? '⭐ Primary Contact' : `Contact ${index + 1}`}
                      </span>
                      {contacts.length > 2 && (
                        <button onClick={() => removeContact(index)}
                          className="text-xs text-red-400 hover:text-red-600 transition">
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <input type="text" value={contact.name}
                        onChange={e => updateContact(index, 'name', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        placeholder="Full name *" />
                      <input type="email" value={contact.email}
                        onChange={e => updateContact(index, 'email', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        placeholder="Email address *" />
                      <input type="tel" value={contact.mobile}
                        onChange={e => updateContact(index, 'mobile', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        placeholder="Mobile number (for team call) *" />
                      <select value={contact.relationship}
                        onChange={e => updateContact(index, 'relationship', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white">
                        <option value="">Relationship (optional)</option>
                        <option value="spouse">Spouse / Partner</option>
                        <option value="child">Son / Daughter</option>
                        <option value="sibling">Brother / Sister</option>
                        <option value="parent">Father / Mother</option>
                        <option value="friend">Close Friend</option>
                        <option value="lawyer">Lawyer / Notary</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {contacts.length < 5 && (
                <button onClick={addContact}
                  className="w-full border-2 border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 py-3 rounded-xl text-sm font-medium transition mb-4">
                  + Add another contact ({contacts.length}/5)
                </button>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700">
                <p>📧 Each contact will receive a welcome email informing them they are a legacy contact and providing the proof submission link.</p>
              </div>

              <button onClick={handleSaveLegacyContact} disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-4 rounded-xl font-semibold transition">
                {loading ? 'Saving & Notifying contacts...' : 'Save Contacts & Continue →'}
              </button>
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
                <p>✅ {contacts.filter(c => c.name && c.email).length} legacy contacts saved</p>
                <p>✅ All contacts notified with proof submission link</p>
                <p>✅ Check-in emails set up every 6 months</p>
                <p>📝 Next: Create your legacy capsules</p>
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