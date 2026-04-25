'use client'
import { useState } from 'react'
import { supabase } from '../supabase'

export default function CreateCapsule() {
  const [form, setForm] = useState({
    senderName: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    unlockDate: ''
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { error } = await supabase.from('capsules').insert([{
      recipient_name: form.recipientName,
      recipient_email: form.recipientEmail,
      message: form.message,
      unlock_date: form.unlockDate,
      status: 'locked'
    }])
    setLoading(false)
    if (!error) setSubmitted(true)
    else alert('Something went wrong. Please try again.')
  }

  if (submitted) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="text-center p-10">
        <div className="text-6xl mb-6">💌</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Your capsule is sealed!</h1>
        <p className="text-gray-500 text-lg">It will be delivered to {form.recipientName} on {form.unlockDate}.</p>
        <a href="/" className="inline-block mt-8 bg-amber-500 text-white px-6 py-3 rounded-full hover:bg-amber-600 transition">
          Back to home
        </a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50 py-12 px-6">
      <div className="max-w-xl mx-auto">
        <a href="/" className="text-amber-600 text-sm mb-8 inline-block">← Back</a>
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="text-3xl mb-2">⏳</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Create a Time Capsule</h1>
          <p className="text-gray-400 text-sm mb-8">Your message will be locked until the date you choose.</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input name="senderName" value={form.senderName} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="e.g. Dad" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient's name</label>
              <input name="recipientName" value={form.recipientName} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="e.g. Arjun" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient's email</label>
              <input name="recipientEmail" value={form.recipientEmail} onChange={handleChange} type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="e.g. arjun@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unlock date</label>
              <input name="unlockDate" value={form.unlockDate} onChange={handleChange} type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your message</label>
              <textarea name="message" value={form.message} onChange={handleChange} rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Write something from your heart..." />
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-medium transition">
              {loading ? 'Sealing...' : 'Seal this capsule 🔒'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}