'use client'

import { useEffect, useState, useCallback } from 'react'
import { Habit, HabitLog } from '@/lib/supabase'
import { getHabits, getAllLogs, getDateRange, formatDate } from '@/lib/api'
import HabitCard from '@/components/HabitCard'
import AddHabitModal from '@/components/AddHabitModal'

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored ? stored === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])
  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])
  return { dark, toggle }
}

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logsMap, setLogsMap] = useState<Record<string, HabitLog[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState<'today' | 'all'>('today')
  const { dark, toggle: toggleDark } = useDarkMode()

  const today = formatDate(new Date())
  const todayDate = new Date()
  const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const yearStr = todayDate.getFullYear()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [fetchedHabits, allLogs] = await Promise.all([
        getHabits(),
        getAllLogs(getDateRange(52).from, getDateRange(52).to),
      ])
      setHabits(fetchedHabits)
      const map: Record<string, HabitLog[]> = {}
      for (const h of fetchedHabits) map[h.id] = []
      for (const log of allLogs) {
        if (map[log.habit_id]) map[log.habit_id].push(log)
      }
      setLogsMap(map)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleLogsChanged = useCallback((habitId: string, newLogs: HabitLog[]) => {
    setLogsMap((prev) => ({ ...prev, [habitId]: newLogs }))
  }, [])

  const handleUpdated = useCallback((updated: Habit) => {
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)))
  }, [])

  const handleArchived = useCallback((habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId))
    setLogsMap((prev) => {
      const next = { ...prev }
      delete next[habitId]
      return next
    })
  }, [])

  const handleCreated = useCallback((habit: Habit) => {
    setHabits((prev) => [...prev, habit])
    setLogsMap((prev) => ({ ...prev, [habit.id]: [] }))
    setShowAdd(false)
  }, [])

  const doneToday = habits.filter((h) => logsMap[h.id]?.some((l) => l.completed_date === today))
  const pendingToday = habits.filter((h) => !logsMap[h.id]?.some((l) => l.completed_date === today))
  const completionRate = habits.length > 0 ? Math.round((doneToday.length / habits.length) * 100) : 0
  const displayedHabits = tab === 'today' ? [...pendingToday, ...doneToday] : habits

  // Overall stats for sidebar
  const totalLogs = Object.values(logsMap).reduce((sum, logs) => sum + logs.length, 0)
  const thisMonth = today.slice(0, 7)
  const logsThisMonth = Object.values(logsMap).reduce(
    (sum, logs) => sum + logs.filter(l => l.completed_date.startsWith(thisMonth)).length, 0
  )
  const bestStreakHabit = habits.reduce((best, h) => {
    const s = Array.from(new Set((logsMap[h.id] ?? []).map(l => l.completed_date)))
    let streak = 0, max = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const ds = formatDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - i))
      if (s.includes(ds)) { streak++; max = Math.max(max, streak) } else streak = 0
    }
    return max > (best.streak ?? 0) ? { name: h.name, streak: max, color: h.color } : best
  }, {} as { name?: string; streak?: number; color?: string })

  const sharedCardProps = {
    logs: [] as HabitLog[],
    onLogsChanged: handleLogsChanged,
    onArchived: handleArchived,
    onUpdated: handleUpdated,
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row">

      {/* ── SIDEBAR (desktop only) ─────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 lg:min-h-screen bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 p-6 sticky top-0 self-start h-screen overflow-y-auto">
        {/* Logo / brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-sm">
            🟩
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Habit Tracker</span>
        </div>

        {/* Date block */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-0.5">{dayName}</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{dateStr}</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">{yearStr}</p>
        </div>

        {/* Progress ring + label */}
        {habits.length > 0 && (
          <div className="mb-6 flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4">
            {/* Mini ring */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-200 dark:text-zinc-700" />
                <circle
                  cx="28" cy="28" r="22" fill="none" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - completionRate / 100)}`}
                  strokeLinecap="round"
                  stroke={completionRate === 100 ? '#22c55e' : '#3b82f6'}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{completionRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Today's progress</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{doneToday.length} of {habits.length} done</p>
            </div>
          </div>
        )}

        {/* Nav tabs */}
        <nav className="flex flex-col gap-1 mb-6">
          {(['today', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                tab === t
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{t === 'today' ? '📅' : '📋'}</span>
              {t === 'today' ? "Today's Habits" : 'All Habits'}
              {t === 'today' && pendingToday.length > 0 && (
                <span className="ml-auto text-xs bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pendingToday.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide px-1">Stats</p>
          {[
            { label: 'Total check-ins', value: totalLogs, icon: '✅' },
            { label: 'This month', value: logsThisMonth, icon: '📆' },
            { label: 'Active habits', value: habits.length, icon: '🎯' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-base">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{label}</p>
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{value}</p>
              </div>
            </div>
          ))}
          {bestStreakHabit.name && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-base">🔥</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Best streak</p>
                <p className="text-sm font-bold truncate" style={{ color: bestStreakHabit.color }}>
                  {bestStreakHabit.name} · {bestStreakHabit.streak}d
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-base leading-none">+</span> New Habit
          </button>
          <button
            onClick={toggleDark}
            className="w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
          >
            {dark ? '☀️ Light mode' : '🌙 Dark mode'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Mobile header (hidden on desktop) */}
        <div className="lg:hidden bg-white dark:bg-zinc-900 px-5 pt-12 pb-5 shadow-sm sticky top-0 z-30 border-b border-transparent dark:border-zinc-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{dayName}</p>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{dateStr}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDark}
                className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {dark
                  ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                }
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center text-xl leading-none hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all active:scale-90 hover:scale-110"
              >
                +
              </button>
            </div>
          </div>
          {habits.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{doneToday.length}/{habits.length} done today</span>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{completionRate}%</span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${completionRate}%`,
                    background: completionRate === 100
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            {(['today', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {t === 'today' ? "Today's Habits" : 'All Habits'}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop page title */}
        <div className="hidden lg:flex items-center justify-between px-8 pt-8 pb-2">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {tab === 'today' ? "Today's Habits" : 'All Habits'}
            </h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-0.5">
              {tab === 'today'
                ? `${pendingToday.length} pending · ${doneToday.length} done`
                : `${habits.length} habit${habits.length !== 1 ? 's' : ''} total`}
            </p>
          </div>
          {habits.length > 0 && tab === 'today' && (
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-xl px-4 py-2 border border-zinc-100 dark:border-zinc-800">
              <div className="h-1.5 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${completionRate}%`,
                    background: completionRate === 100
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                  }}
                />
              </div>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{completionRate}%</span>
            </div>
          )}
        </div>

        {/* Habit list */}
        <div className="flex-1 px-4 lg:px-8 py-4 lg:py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin" />
                <p className="text-sm text-zinc-400">Loading habits...</p>
              </div>
            </div>
          ) : habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="text-6xl">🌱</div>
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No habits yet</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Add your first habit to start building consistency.</p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
              >
                Add First Habit
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 lg:gap-4 lg:items-start" key={tab}>
              {tab === 'today' && pendingToday.length === 0 && doneToday.length > 0 && (
                <div className="lg:col-span-full bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-100 dark:border-green-900 rounded-2xl p-4 text-center">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-semibold text-green-800 dark:text-green-300 text-sm">All done for today!</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Great job keeping your streak alive.</p>
                </div>
              )}

              {tab === 'today' && pendingToday.length > 0 && (
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide px-1 lg:col-span-full">Pending</p>
              )}

              {(tab === 'today' ? pendingToday : displayedHabits).map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  logs={logsMap[habit.id] ?? []}
                  onLogsChanged={handleLogsChanged}
                  onArchived={handleArchived}
                  onUpdated={handleUpdated}
                />
              ))}

              {tab === 'today' && doneToday.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide px-1 mt-1 lg:col-span-full">Completed</p>
                  {doneToday.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      logs={logsMap[habit.id] ?? []}
                      onLogsChanged={handleLogsChanged}
                      onArchived={handleArchived}
                      onUpdated={handleUpdated}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddHabitModal onCreated={handleCreated} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
