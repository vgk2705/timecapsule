'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const ADMIN_EMAIL = 'vgkp2705@gmail.com'

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [dailySignups, setDailySignups] = useState([])
  const [todayCapsules, setTodayCapsules] = useState([])

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/'
        return
      }
      fetchStats()
      fetchDailySignups()
      fetchTodayCapsules()
    }
    checkAdmin()
  }, [])

  const fetchStats = async () => {
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(new Date().setDate(1))
    monthStart.setHours(0, 0, 0, 0)

    const [
      totalUsersRes,
      todayUsersRes,
      weekUsersRes,
      monthUsersRes,
      totalCapsulesRes,
      deliveredCapsulesRes,
      lockedCapsulesRes,
      todayCapsulesRes,
      textCapsulesRes,
      audioCapsulesRes,
      videoCapsulesRes,
      legacyCapsulesRes,
      lovedSubsRes,
      foreverSubsRes,
      cancelledSubsRes,
      legacyPlansRes,
      capsulePaymentsRes,
      dueTodayRes,
      activeTicketsRes,
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
      supabase.from('capsules').select('id', { count: 'exact', head: true }),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('status', 'locked'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).is('media_type', null).eq('is_legacy', false),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('media_type', 'audio'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('media_type', 'video'),
      supabase.from('capsules').select('id', { count: 'exact', head: true }).eq('is_legacy', true),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'loved').eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'forever').eq('status', 'active'),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('legacy_plans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('capsule_payments').select('amount, currency, media_type, status'),
      supabase.from('capsules').select('id, recipient_name, recipient_email, unlock_date, media_type', { count: 'exact' }).eq('status', 'locked').lte('unlock_date', new Date().toISOString().split('T')[0]).not('unlock_date', 'is', null),
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    ])

    const payments = capsulePaymentsRes.data || []
    const paidPayments = payments.filter(p => p.status === 'paid')
    const totalRevenueINR = paidPayments.filter(p => p.currency === 'INR').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    const perCapsuleByType = {
      text: paidPayments.filter(p => p.media_type === 'text').length,
      audio: paidPayments.filter(p => p.media_type === 'audio').length,
      video: paidPayments.filter(p => p.media_type === 'video').length,
    }

    setStats({
      totalUsers: totalUsersRes.count || 0,
      todayUsers: todayUsersRes.count || 0,
      weekUsers: weekUsersRes.count || 0,
      monthUsers: monthUsersRes.count || 0,
      totalCapsules: totalCapsulesRes.count || 0,
      deliveredCapsules: deliveredCapsulesRes.count || 0,
      lockedCapsules: lockedCapsulesRes.count || 0,
      todayCapsules: todayCapsulesRes.count || 0,
      textCapsules: textCapsulesRes.count || 0,
      audioCapsules: audioCapsulesRes.count || 0,
      videoCapsules: videoCapsulesRes.count || 0,
      legacyCapsules: legacyCapsulesRes.count || 0,
      lovedSubs: lovedSubsRes.count || 0,
      foreverSubs: foreverSubsRes.count || 0,
      cancelledSubs: cancelledSubsRes.count || 0,
      legacyPlans: legacyPlansRes.count || 0,
      totalPerCapsulePayments: paidPayments.length,
      totalRevenueINR,
      perCapsuleByType,
      dueToday: dueTodayRes.count || 0,
      dueTodayList: dueTodayRes.data || [],
      openTickets: activeTicketsRes.count || 0,
    })

    setLoading(false)
  }

  const fetchDailySignups = async () => {
    // Get last 14 days of signups
    const results = []
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date()
      dayStart.setDate(dayStart.getDate() - i)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())

      results.push({
        date: dayStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        count: count || 0,
      })
    }
    setDailySignups(results)
  }

  const fetchTodayCapsules = async () => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('capsules')
      .select('id, recipient_name, recipient_email, unlock_date, media_type, is_legacy, sender_name')
      .eq('status', 'locked')
      .lte('unlock_date', new Date().toISOString().split('T')[0])
      .not('unlock_date', 'is', null)
      .order('unlock_date', { ascending: true })

    setTodayCapsules(data || [])
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Loading analytics...</p>
    </div>
  )

  const estimatedMRR = (stats.lovedSubs * 99) + (stats.foreverSubs * 249)
  const maxDailySignup = Math.max(...dailySignups.map(d => d.count), 1)

  const StatCard = ({ label, value, sub, color = 'gray', alert = false }) => (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border ${alert ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${alert ? 'text-red-600' : `text-${color}-700`}`}>{value}</p>
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
            <a href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">Users</a>
            <a href="/admin/legacy" className="text-sm text-gray-500 hover:text-gray-700">Legacy</a>
            <a href="/admin/tickets" className="text-sm text-gray-500 hover:text-gray-700">Tickets</a>
            <a href="/dashboard" className="text-sm text-amber-600 hover:text-amber-700">Dashboard</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* 🚨 Action required alerts */}
        {(stats.dueToday > 0 || stats.openTickets > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-red-700 mb-2">🚨 Action Required</p>
            <div className="flex flex-wrap gap-4">
              {stats.dueToday > 0 && (
                <p className="text-sm text-red-600">
                  ⏰ <strong>{stats.dueToday}</strong> capsule{stats.dueToday > 1 ? 's' : ''} due for delivery today — run the cron if not already done
                </p>
              )}
              {stats.openTickets > 0 && (
                <a href="/admin/tickets" className="text-sm text-red-600 hover:underline">
                  💬 <strong>{stats.openTickets}</strong> open support ticket{stats.openTickets > 1 ? 's' : ''} →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">👥 Users</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers} color="blue" />
            <StatCard label="Signed up today" value={stats.todayUsers} color="green" alert={stats.todayUsers > 50} sub="New today" />
            <StatCard label="This week" value={stats.weekUsers} color="green" />
            <StatCard label="This month" value={stats.monthUsers} color="green" />
          </div>
        </div>

        {/* Daily signups chart — last 14 days */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">📈 Daily Signups — Last 14 Days</h2>
          <div className="flex items-end gap-1 h-32">
            {dailySignups.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{day.count > 0 ? day.count : ''}</span>
                <div
                  className="w-full bg-amber-400 rounded-t-sm transition-all"
                  style={{ height: `${day.count === 0 ? 2 : Math.max(4, (day.count / maxDailySignup) * 100)}%`, minHeight: '2px' }}
                />
                <span className="text-xs text-gray-400 rotate-45 origin-left mt-1 hidden md:block">{day.date}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-6">
            <span>{dailySignups[0]?.date}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Revenue */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">💰 Revenue</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Est. MRR (INR)" value={`₹${estimatedMRR.toLocaleString('en-IN')}`} sub="Active subs only" color="green" />
            <StatCard label="Per-Capsule Revenue" value={`₹${stats.totalRevenueINR.toLocaleString('en-IN')}`} sub={`${stats.totalPerCapsulePayments} payments`} color="amber" />
            <StatCard label="Cancelled Subs" value={stats.cancelledSubs} color="red" />
            <StatCard label="Open Tickets" value={stats.openTickets} color="red" alert={stats.openTickets > 0} />
          </div>
        </div>

        {/* Plans */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">📦 Plans</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Loved Active" value={stats.lovedSubs} sub="₹99/mo" color="amber" />
            <StatCard label="Forever Active" value={stats.foreverSubs} sub="₹249/mo" color="gray" />
            <StatCard label="Legacy Active" value={stats.legacyPlans} sub="One-time" color="purple" />
            <StatCard label="Free Users" value={Math.max(0, stats.totalUsers - stats.lovedSubs - stats.foreverSubs - stats.legacyPlans)} color="gray" />
          </div>
        </div>

        {/* Capsules */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">💌 Capsules</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total" value={stats.totalCapsules} color="blue" />
            <StatCard label="Delivered" value={stats.deliveredCapsules} color="green" />
            <StatCard label="Locked (pending)" value={stats.lockedCapsules} color="amber" />
            <StatCard label="Created today" value={stats.todayCapsules} color="blue" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="📝 Text" value={stats.textCapsules} />
            <StatCard label="🎵 Audio" value={stats.audioCapsules} />
            <StatCard label="🎥 Video" value={stats.videoCapsules} />
            <StatCard label="👻 Legacy" value={stats.legacyCapsules} color="purple" />
          </div>
        </div>

        {/* Capsules due today */}
        {todayCapsules.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-amber-700">⏰ Capsules Due for Delivery ({todayCapsules.length})</h2>
              <button
                onClick={async () => {
                  const res = await fetch('/api/send-capsules', { headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'timecapsule2026'}` } })
                  const text = await res.text()
                  alert('Cron result: ' + text)
                  fetchTodayCapsules()
                  fetchStats()
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                🚀 Run Delivery Now
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayCapsules.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
                  <div>
                    <span className="font-medium text-gray-800">{c.recipient_name}</span>
                    <span className="text-gray-400 ml-2">{c.recipient_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">from {c.sender_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.is_legacy ? 'bg-purple-100 text-purple-700' :
                      c.media_type === 'audio' ? 'bg-blue-100 text-blue-700' :
                      c.media_type === 'video' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {c.is_legacy ? '👻' : c.media_type === 'audio' ? '🎵' : c.media_type === 'video' ? '🎥' : '📝'}
                    </span>
                    <span className="text-xs text-amber-600 font-medium">{c.unlock_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-capsule payment breakdown */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">💳 Per-Capsule Payments</h2>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Text Payments" value={stats.perCapsuleByType.text} />
            <StatCard label="Audio Payments" value={stats.perCapsuleByType.audio} color="blue" />
            <StatCard label="Video Payments" value={stats.perCapsuleByType.video} color="blue" />
          </div>
        </div>

        <button
          onClick={() => { fetchStats(); fetchDailySignups(); fetchTodayCapsules() }}
          className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          🔄 Refresh All Stats
        </button>

      </main>
    </div>
  )
}