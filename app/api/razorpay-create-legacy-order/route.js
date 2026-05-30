import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Price by age group in paise (INR × 100)
const LEGACY_PRICING = {
  '20s': { amountINR: 499900, amountEUR: 14900, years: 75, labelINR: '₹4,999', labelEUR: '€149' },
  '30s': { amountINR: 449900, amountEUR: 13400, years: 65, labelINR: '₹4,499', labelEUR: '€134' },
  '40s': { amountINR: 399900, amountEUR: 11900, years: 55, labelINR: '₹3,999', labelEUR: '€119' },
  '50s': { amountINR: 349900, amountEUR: 10400, years: 45, labelINR: '₹3,499', labelEUR: '€104' },
  '60s': { amountINR: 299900, amountEUR: 8900, years: 35, labelINR: '₹2,999', labelEUR: '€89' },
  '70s': { amountINR: 249900, amountEUR: 7400, years: 25, labelINR: '₹2,499', labelEUR: '€74' },
  '80+': { amountINR: 199900, amountEUR: 5900, years: 15, labelINR: '₹1,999', labelEUR: '€59' },
}

function getAgeGroup(dob) {
  const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 30) return { group: '20s', age }
  if (age < 40) return { group: '30s', age }
  if (age < 50) return { group: '40s', age }
  if (age < 60) return { group: '50s', age }
  if (age < 70) return { group: '60s', age }
  if (age < 80) return { group: '70s', age }
  return { group: '80+', age }
}

export async function POST(request) {
  try {
    const { userId, userDob } = await request.json()
    if (!userId || !userDob) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { group, age } = getAgeGroup(userDob)
    const pricing = LEGACY_PRICING[group]

    const order = await razorpay.orders.create({
      amount: pricing.amount,
      currency: 'INR',
      notes: {
        user_id: userId,
        user_dob: userDob,
        age_group: group,
        years_covered: pricing.years,
        plan_type: 'legacy'
      }
    })

    return Response.json({
      orderId: order.id,
      amount: pricing.amount,
      ageGroup: group,
      age,
      years: pricing.years,
      label: pricing.label,
    })

  } catch (error) {
    console.error('Legacy order error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}