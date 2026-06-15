'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const EUR_PLANS = {
  loved: {
    pricing: {
      monthly: { price: 2.99, label: 'month', saving: null },
      yearly: { price: 29.90, label: 'year', saving: '2mo free' },
      fiveYear: { price: 143.52, label: '5yrs', saving: '1yr free' },
      tenYear: { price: 287.04, label: '10yrs', saving: '2yrs free' },
    }
  },
  forever: {
    pricing: {
      monthly: { price: 4.99, label: 'month', saving: null },
      yearly: { price: 49.90, label: 'year', saving: '2mo free' },
      fiveYear: { price: 239.52, label: '5yrs', saving: '1yr free' },
      tenYear: { price: 479.04, label: '10yrs', saving: '2yrs free' },
    }
  }
}

const INR_PLANS = {
  loved: {
    pricing: {
      monthly: { price: 99, label: 'month', saving: null },
      yearly: { price: 990, label: 'year', saving: '2mo free' },
      fiveYear: { price: 4752, label: '5yrs', saving: '1yr free' },
      tenYear: { price: 9504, label: '10yrs', saving: '2yrs free' },
    }
  },
  forever: {
    pricing: {
      monthly: { price: 249, label: 'month', saving: null },
      yearly: { price: 2490, label: 'year', saving: '2mo free' },
      fiveYear: { price: 11952, label: '5yrs', saving: '1yr free' },
      tenYear: { price: 23904, label: '10yrs', saving: '2yrs free' },
    }
  }
}

const PERIOD_LABELS = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  fiveYear: '5 Years',
  tenYear: '10 Years',
}

export default function PricingPage() {
  const router = useRouter()
  const [period, setPeriod] = useState('monthly')
  const [user, setUser] = useState(null)
  const [isIndia, setIsIndia] = useState(false)
  const [currency, setCurrency] = useState({ symbol: '€', code: 'EUR', country: '' })
  const [locationLoaded, setLocationLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user)
    })
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const countryCode = data.country_code
        if (countryCode === 'IN') {
          setIsIndia(true)
          setCurrency({ symbol: '₹', code: 'INR', country: 'India' })
        } else {
          const currencyMap = {
            'US': { symbol: '$', code: 'USD', rate: 1.08, country: 'USA' },
            'GB': { symbol: '£', code: 'GBP', rate: 0.85, country: 'UK' },
            'AU': { symbol: 'A$', code: 'AUD', rate: 1.65, country: 'Australia' },
            'CA': { symbol: 'C$', code: 'CAD', rate: 1.47, country: 'Canada' },
            'SG': { symbol: 'S$', code: 'SGD', rate: 1.45, country: 'Singapore' },
            'AE': { symbol: 'AED', code: 'AED', rate: 3.97, country: 'UAE' },
            'MY': { symbol: 'RM', code: 'MYR', rate: 5.05, country: 'Malaysia' },
            'NZ': { symbol: 'NZ$', code: 'NZD', rate: 1.78, country: 'New Zealand' },
            'JP': { symbol: '¥', code: 'JPY', rate: 163, country: 'Japan' },
            'NL': { symbol: '€', code: 'EUR', rate: 1, country: 'Netherlands' },
            'DE': { symbol: '€', code: 'EUR', rate: 1, country: 'Germany' },
            'FR': { symbol: '€', code: 'EUR', rate: 1, country: 'France' },
            'IT': { symbol: '€', code: 'EUR', rate: 1, country: 'Italy' },
            'ES': { symbol: '€', code: 'EUR', rate: 1, country: 'Spain' },
            'BE': { symbol: '€', code: 'EUR', rate: 1, country: 'Belgium' },
          }
          const detected = currencyMap[countryCode]
          if (detected) setCurrency({ ...detected })
        }
        setLocationLoaded(true)
      })
      .catch(() => setLocationLoaded(true))
  }, [])

  const PLANS = isIndia ? INR_PLANS : EUR_PLANS

  const formatPrice = (price) => {
    if (!locationLoaded) return '...'
    if (isIndia) return `₹${price.toLocaleString('en-IN')}`
    if (currency.rate) {
      const converted = price * (currency.rate || 1)
      if (currency.code === 'JPY') return `${currency.symbol}${Math.round(converted)}`
      return `${currency.symbol}${converted.toFixed(2)}`
    }
    return `€${price.toFixed(2)}`
  }

  const priceNote = !locationLoaded ? null : isIndia
    ? 'Indian pricing via Razorpay · UPI, cards, GPay accepted'
    : currency.code !== 'EUR' ? `Approx. in ${currency.code}. Charged in EUR.` : null

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const upgradeLink = user ? '/upgrade' : '/signup'

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">

      <header className="px-4 md:px-6 py-4 border-b border-amber-100 bg-amber-50">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-xl md:text-2xl">⏳</span>
            <span className="text-base md:text-xl font-semibold text-amber-900">TimeCapsule</span>
          </div>
          <div className="flex gap-2 md:gap-3 items-center">
            {user ? (
              <>
                <span className="hidden md:block text-sm text-gray-500">Hi, {firstName}</span>
                <a href="/dashboard" className="bg-amber-500 hover:bg-amber-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-full text-sm font-medium transition">
                  Dashboard
                </a>
              </>
            ) : (
              <>
                <a href="/login" className="text-sm text-gray-500 hover:text-gray-700 px-2 md:px-4 py-2">Log in</a>
                <a href="/signup" className="bg-amber-500 hover:bg-amber-600 text-white px-3 md:px-5 py-1.5 md:py-2 rounded-full text-sm font-medium transition whitespace-nowrap">
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8 md:py-16">

        <div className="mb-8 md:mb-12">
          <button onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold text-base mb-6 md:mb-8">
            ← Back
          </button>
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">Simple, honest pricing</h1>
            <p className="text-gray-500 text-base md:text-lg">Start free. Upgrade when you're ready.</p>
            {locationLoaded && currency.country && (
              <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 md:px-4 py-1.5 mt-3 md:mt-4 text-xs md:text-sm text-gray-500 shadow-sm">
                <span>📍</span>
                <span>Showing prices for <strong>{currency.country}</strong> in <strong>{currency.code}</strong></span>
              </div>
            )}
            {priceNote && <p className="text-xs text-gray-400 mt-2">{priceNote}</p>}
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="bg-white rounded-2xl p-1 md:p-1.5 flex gap-1 shadow-sm overflow-x-auto max-w-full">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition whitespace-nowrap flex-shrink-0 ${
                  period === key ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {label}
                {key !== 'monthly' && (
                  <span className={`ml-1 md:ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    period === key ? 'bg-amber-400 text-white' : 'bg-green-100 text-green-700'
                  }`}>
                    {key === 'yearly' ? '2mo' : key === 'fiveYear' ? '1yr' : '2yr'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans grid — 4 cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-start">

          {/* Free */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">🆓</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Free</h2>
            <p className="text-gray-400 text-sm mb-5">Try it out</p>
            <div className="mb-5">
              <span className="text-3xl font-bold text-gray-900">{isIndia ? '₹' : currency.symbol}0</span>
              <span className="text-gray-400 text-sm ml-1">forever</span>
            </div>
            <a href={user ? '/dashboard' : '/signup'}
              className="block w-full text-center border-2 border-amber-500 text-amber-600 hover:bg-amber-50 py-2.5 rounded-xl font-medium transition mb-5 text-sm">
              {user ? 'Dashboard' : 'Get started free'}
            </a>
            {/* ✅ Updated — text + audio + video per capsule */}
            <ul className="space-y-2 md:space-y-3 text-sm text-gray-600">
              <li>✅ 3 text capsules free</li>
              <li>✅ 5,000 words (free capsules)</li>
              <li>✅ Text stored forever</li>
              <li>✅ Email delivery</li>
              <li>✅ All milestones</li>
              <li className="text-gray-600">
                📝 Text — pay per capsule
                <span className="ml-1 text-xs text-amber-600 font-semibold">
                  {isIndia ? 'from ₹19' : 'from €0.29'}
                </span>
                <span className="ml-1 text-xs text-gray-400">unlimited words</span>
              </li>
              <li className="text-gray-500">
                🎵 Audio — pay per capsule
                <span className="ml-1 text-xs text-amber-600 font-semibold">
                  {isIndia ? 'from ₹49' : 'from €1.49'}
                </span>
              </li>
              <li className="text-gray-500">
                🎥 Video — pay per capsule
                <span className="ml-1 text-xs text-amber-600 font-semibold">
                  {isIndia ? 'from ₹149' : 'from €4.99'}
                </span>
              </li>
              <li className="text-gray-300">❌ Legacy plan</li>
            </ul>
          </div>

          {/* Loved */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-amber-500 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              MOST POPULAR
            </div>
            <div className="text-3xl mb-3">💛</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Loved</h2>
            <p className="text-gray-400 text-sm mb-5">For families</p>
            <div className="mb-5">
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(PLANS.loved.pricing[period].price)}
              </span>
              <span className="text-gray-400 text-sm ml-1">/ {PLANS.loved.pricing[period].label}</span>
              {PLANS.loved.pricing[period].saving && (
                <div className="mt-1 inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full ml-1">
                  {PLANS.loved.pricing[period].saving}
                </div>
              )}
            </div>
            <a href={upgradeLink}
              className="block w-full text-center bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-medium transition mb-5 text-sm">
              {user ? 'Upgrade to Loved' : 'Start Loved'}
            </a>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>✅ Unlimited text capsules</li>
              <li>✅ Unlimited words</li>
              <li>✅ 🎵 Audio messages</li>
              <li>✅ 🎥 Video messages</li>
              <li>✅ 2GB media storage</li>
              <li>✅ Priority support</li>
              <li className="text-gray-300">❌ Legacy plan</li>
            </ul>
          </div>

          {/* Forever */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-3xl mb-3">👑</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Forever</h2>
            <p className="text-gray-400 text-sm mb-5">For generations</p>
            <div className="mb-5">
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(PLANS.forever.pricing[period].price)}
              </span>
              <span className="text-gray-400 text-sm ml-1">/ {PLANS.forever.pricing[period].label}</span>
              {PLANS.forever.pricing[period].saving && (
                <div className="mt-1 inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full ml-1">
                  {PLANS.forever.pricing[period].saving}
                </div>
              )}
            </div>
            <a href={upgradeLink}
              className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl font-medium transition mb-5 text-sm">
              {user ? 'Upgrade to Forever' : 'Start Forever'}
            </a>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>✅ Everything in Loved</li>
              <li>✅ 5GB media storage</li>
              <li>✅ 10 year storage</li>
              <li>✅ Multiple recipients</li>
              <li>✅ Legacy contact</li>
              <li>✅ Dedicated support</li>
              <li className="text-gray-300">❌ When I am gone</li>
            </ul>
          </div>

          {/* Legacy */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-purple-400 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              ONE-TIME
            </div>
            <div className="text-3xl mb-3">👻</div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Legacy</h2>
            <p className="text-gray-400 text-sm mb-5">When I am gone</p>
            <div className="mb-5">
              <span className="text-3xl font-bold text-purple-700">
                {isIndia ? '₹1,999+' : '€19+'}
              </span>
              <span className="text-gray-400 text-sm ml-1">one-time</span>
              <div className="mt-1 inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full ml-1">
                Based on your age
              </div>
            </div>
            <a href={user ? '/legacy-setup' : '/signup'}
              className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-medium transition mb-5 text-sm">
              {user ? 'Set Up Legacy' : 'Get Legacy Plan'}
            </a>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>✅ 3 legacy capsules</li>
              <li>✅ 1GB storage</li>
              <li>✅ Audio + Video included</li>
              <li>✅ No monthly charges</li>
              <li>✅ 👻 When I am gone</li>
              <li>✅ Team verification call</li>
              <li>✅ 6-month check-ins</li>
            </ul>
          </div>

        </div>

        {/* India note */}
        {isIndia && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-green-700 text-sm font-medium">
              🇮🇳 Indian pricing · Pay via UPI, GPay, PhonePe, Paytm, Cards & more
            </p>
          </div>
        )}

        {/* ✅ Per-capsule pricing note — updated with text capsules */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <span className="text-2xl">💳</span>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">No subscription? Pay per capsule</h3>
              {/* ✅ Updated description */}
              <p className="text-gray-500 text-sm mb-3">
                No subscription needed. Pay once per capsule.
                Text capsules get unlimited words when you pay.
                Audio and video price is based on file size and delivery date.
              </p>
              {/* ✅ Updated grid — now includes text pricing rows */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '📝 Text · 1yr', inr: '₹19', eur: '€0.29', note: 'unlimited words' },
                  { label: '📝 Text · 5yr', inr: '₹29', eur: '€0.49', note: 'unlimited words' },
                  { label: '📝 Text · 10yr', inr: '₹49', eur: '€0.99', note: 'unlimited words' },
                  { label: '📝 Text · 10yr+', inr: '₹99', eur: '€1.99', note: 'unlimited words' },
                  { label: '🎵 Audio · 1yr', inr: '₹49', eur: '€1.49' },
                  { label: '🎵 Audio · 5yr', inr: '₹99', eur: '€2.99' },
                  { label: '🎵 Audio · 10yr', inr: '₹199', eur: '€5.99' },
                  { label: '🎵 Audio · 10yr+', inr: '₹399', eur: '€11.99' },
                  { label: '🎥 Video · 1yr (≤100MB)', inr: '₹149', eur: '€4.99' },
                  { label: '🎥 Video · 5yr (≤100MB)', inr: '₹299', eur: '€8.99' },
                  { label: '🎥 Video · 1yr (101-500MB)', inr: '₹299', eur: '€9.99' },
                  { label: '🎥 Video · 5yr (101-500MB)', inr: '₹599', eur: '€19.99' },
                ].map((row, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-amber-100 text-center">
                    <p className="text-xs text-gray-500 mb-1">{row.label}</p>
                    <p className="font-bold text-gray-800">{isIndia ? row.inr : row.eur}</p>
                    {row.note && <p className="text-xs text-gray-400">{row.note}</p>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                ⚠️ No refund if capsule is deleted after payment. Subscribe for unlimited at {isIndia ? '₹99/mo' : '€2.99/mo'}.
              </p>
            </div>
          </div>
        </div>

        {/* Legacy special note */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl">👻</span>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">About the Legacy Plan</h3>
              <p className="text-gray-500 text-sm">
                The Legacy plan is a one-time payment based on your age. Price is lower as you get older since storage duration is shorter.
                Your messages are stored safely and only released after our team personally verifies with your legacy contact.
                No monthly charges — ever.
              </p>
            </div>
          </div>
        </div>

        {/* Refund policy */}
        <div className="mt-6 md:mt-8 bg-white rounded-2xl p-6 md:p-8 shadow-sm text-center">
          <div className="text-3xl mb-3">🛡️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Fair Refund Policy</h3>
          <p className="text-gray-500 text-sm max-w-2xl mx-auto">
            Not happy? Request a refund anytime. Subscription plans: charged only for months used.
            Legacy plan: refundable within 30 days of purchase.
            Text capsules kept forever. Media stored 6 more months then removed.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {[
            { q: 'What happens if I cancel?', a: 'Text capsules are safe forever. Audio and video kept 6 months after cancellation.' },
            { q: 'How does the Legacy plan work?', a: 'You pay once based on your age. We store your messages and release them only after our team personally verifies with your legacy contact.' },
            { q: 'What payment methods are accepted?', a: isIndia ? 'UPI, Google Pay, PhonePe, Paytm, credit/debit cards, net banking and EMI.' : 'All major cards, iDEAL, Google Pay, Apple Pay and more.' },
            { q: 'Is my data secure?', a: 'Yes. All capsules are encrypted. Only recipients receive messages on the unlock date or after legacy verification.' },
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-2 text-sm">{faq.q}</h4>
              <p className="text-gray-500 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Have questions? <a href="/support" className="text-amber-600 hover:underline font-medium">Contact Support</a>
          </p>
        </div>

      </main>

      <footer className="text-center py-6 md:py-8 text-gray-400 text-sm px-4">
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-3">
          <a href="/privacy" className="hover:text-amber-600 transition">Privacy Policy</a>
          <a href="/terms" className="hover:text-amber-600 transition">Terms of Service</a>
          <a href="/data-protection" className="hover:text-amber-600 transition">Data Protection</a>
        </div>
        © 2026 TimeCapsule · Made with love for families
      </footer>
    </div>
  )
}