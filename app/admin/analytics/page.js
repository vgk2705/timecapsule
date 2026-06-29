'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const ADMIN_EMAIL = 'vgkp2705@gmail.com'

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/'
        return
      }
      fetchStats()
    }
    checkAdmin()
  }, [])

  const fetchStats = async () => {
    setLoading(true)

    const [
      totalUsersRes,
      totalCapsulesRes,
      deliveredCapsulesRes,
      lockedCapsulesRes,
      textCapsulesRes,
      audioCapsulesRes,
      videoCapsulesRes,
      legacyCapsulesRes,
      lovedSubsRes,
      foreverSubsRes,
      cancelledSubsRes,
      legacyPlansRes,
      capsulePaymentsRes,
      newUsersThisMonthRes,
      newUsersThisWeekRes,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('capsules').select('id', { count: 'exact', head: true }),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('status', 'locked'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).is('media_type', null).eq('is_legacy', false),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('media_type', 'audio'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('media_type', 'video'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('is_legacy', true),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'loved').eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'forever').eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('legacy_plans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('capsule_payments').select('amount, currency, media_type, status'),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', new Date(new Date().setDate(1)).toISOString()),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    // Calculate revenue from capsule payments
    const payments = capsulePaymentsRes.data || []
    const paidPayments = payments.filter(p => p.status === 'paid')
    const totalPerCapsuleRevenueINR = paidPayments
      .filter(p => p.currency === 'INR')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const totalPerCapsuleRevenueEUR = paidPayments
      .filter(p => p.currency === 'EUR')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

    const perCapsuleByType = {
      text: paidPayments.filter(p => p.media_type === 'text').length,
      audio: paidPayments.filter(p => p.media_type === 'audio').length,
      video: paidPayments.filter(p => p.media_type === 'video').length,
    }

    setStats({
      totalUsers: totalUsersRes.count || 0,
      newUsersThisMonth: newUsersThisMonthRes.count || 0,
      newUsersThisWeek: newUsersThisWeekRes.count || 0,
      totalCapsules: totalCapsulesRes.count || 0,
      deliveredCapsules: deliveredCapsulesRes.count || 0,
      lockedCapsules: lockedCapsulesRes.count || 0,
      textCapsules: textCapsulesRes.count || 0,
      audioCapsules: audioCapsulesRes.count || 0,
      videoCapsules: videoCapsulesRes.count || 0,
      legacyCapsules: legacyCapsulesRes.count || 0,
      lovedSubs: lovedSubsRes.count || 0,
      foreverSubs: foreverSubsRes.count || 0,
      cancelledSubs: cancelledSubsRes.count || 0,
      legacyPlans: legacyPlansRes.count || 0,
      totalPerCapsulePayments: paidPayments.length,
      totalPerCapsuleRevenueINR,
      totalPerCapsuleRevenueEUR,
      perCapsuleByType,
    })

    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading analytics...</p>
    </div>
  )

  const estimatedMRR_INR = (stats.lovedSubs * 99) + (stats.foreverSubs * 249)

  const StatCard = ({ label, value, sub, color = 'gray' }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold text-${color}-700`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <span className="text-lg font-semibold text-gray-900">Admin — Analytics</span>
          </div>
          <div className="flex gap-3">
            <a href="/admin/legacy" className="text-sm text-gray-500 hover:text-gray-700">Legacy</a>
            <a href="/admin/tickets" className="text-sm text-gray-500 hover:text-gray-700">Tickets</a>
            <a href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        <h2 className="text-lg font-bold text-gray-800 mb-3">👥 Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users" value={stats.totalUsers} color="blue" />
          <StatCard label="New This Month" value={stats.newUsersThisMonth} color="green" />
          <StatCard label="New This Week" value={stats.newUsersThisWeek} color="green" />
          <StatCard label="Active Loved+Forever" value={stats.lovedSubs + stats.foreverSubs} color="amber" />
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-3">💰 Revenue (estimated)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Est. Monthly Recurring (INR)" value={`₹${estimatedMRR_INR.toLocaleString('en-IN')}`} sub="Loved + Forever active subs" color="green" />
          <StatCard label="Per-Capsule Revenue (INR)" value={`₹${stats.totalPerCapsuleRevenueINR.toLocaleString('en-IN')}`} sub={`${stats.totalPerCapsulePayments} payments`} color="amber" />
          <StatCard label="Per-Capsule Revenue (EUR)" value={`€${stats.totalPerCapsuleRevenueEUR.toFixed(2)}`} color="amber" />
          <StatCard label="Cancelled Subscriptions" value={stats.cancelledSubs} color="red" />
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-3">📦 Plans</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Loved Plan" value={stats.lovedSubs} sub="₹99/mo active" color="amber" />
          <StatCard label="Forever Plan" value={stats.foreverSubs} sub="₹249/mo active" color="gray" />
          <StatCard label="Legacy Plan" value={stats.legacyPlans} sub="one-time active" color="purple" />
          <StatCard label="Free Users" value={stats.totalUsers - stats.lovedSubs - stats.foreverSubs} color="gray" />
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-3">💌 Capsules</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Capsules" value={stats.totalCapsules} color="blue" />
          <StatCard label="Delivered" value={stats.deliveredCapsules} color="green" />
          <StatCard label="Still Locked" value={stats.lockedCapsules} color="amber" />
          <StatCard label="Legacy Capsules" value={stats.legacyCapsules} color="purple" />
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-3">📝 Capsule Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Text" value={stats.textCapsules} color="gray" />
          <StatCard label="Audio" value={stats.audioCapsules} color="blue" />
          <StatCard label="Video" value={stats.videoCapsules} color="blue" />
          <StatCard label="Legacy" value={stats.legacyCapsules} color="purple" />
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-3">💳 Per-Capsule Payments by Type</h2>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Text Payments" value={stats.perCapsuleByType.text} color="gray" />
          <StatCard label="Audio Payments" value={stats.perCapsuleByType.audio} color="blue" />
          <StatCard label="Video Payments" value={stats.perCapsuleByType.video} color="blue" />
        </div>

        <button onClick={fetchStats} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          🔄 Refresh Stats
        </button>

      </main>
    </div>
  )
}