'use client'

import { useState, useCallback } from 'react'
import { Habit, HabitLog } from '@/lib/supabase'
import { toggleHabitLog, getStreak, formatDate, archiveHabit, clearHabitLogs } from '@/lib/api'
import HabitHeatmap from './HabitHeatmap'
import EditHabitModal from './EditHabitModal'

type Props = {
  habit: Habit
  logs: HabitLog[]
  onLogsChanged: (habitId: string, newLogs: HabitLog[]) => void
  onArchived: (habitId: string) => void
  onUpdated: (habit: Habit) => void
}

export default function HabitCard({ habit, logs, onLogsChanged, onArchived, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [clearing, setClearing] = useState(false)

  const logSet = new Set(logs.map((l) => l.completed_date))
  const todayLocal = formatDate(new Date())
  const isDoneToday = logSet.has(todayLocal)
  const streak = getStreak(logSet)

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return formatDate(d)
  })

  const handleToggleToday = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      await toggleHabitLog(habit.id, todayLocal, isDoneToday)
      const updated = isDoneToday
        ? logs.filter((l) => l.completed_date !== todayLocal)
        : [...logs, { id: '', habit_id: habit.id, completed_date: todayLocal, created_at: new Date().toISOString() }]
      onLogsChanged(habit.id, updated)
    } finally {
      setLoading(false)
    }
  }, [loading, habit.id, todayLocal, isDoneToday, logs, onLogsChanged])

  const handleToggleDay = useCallback(async (date: string) => {
    if (loading) return
    const done = logSet.has(date)
    setLoading(true)
    try {
      await toggleHabitLog(habit.id, date, done)
      const updated = done
        ? logs.filter((l) => l.completed_date !== date)
        : [...logs, { id: '', habit_id: habit.id, completed_date: date, created_at: new Date().toISOString() }]
      onLogsChanged(habit.id, updated)
    } finally {
      setLoading(false)
    }
  }, [loading, habit.id, logSet, logs, onLogsChanged])

  const handleArchive = async () => {
    if (!confirm(`Archive "${habit.name}"? It will be hidden from your list.`)) return
    await archiveHabit(habit.id)
    onArchived(habit.id)
  }

  const handleClearRecords = async () => {
    if (!confirm(`Clear all tracking records for "${habit.name}"? This cannot be undone. The habit itself will remain.`)) return
    setClearing(true)
    try {
      await clearHabitLogs(habit.id)
      onLogsChanged(habit.id, [])
    } finally {
      setClearing(false)
    }
  }

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const thisMonth = new Date().toISOString().slice(0, 7)

  return (
    <>
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}

      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 overflow-visible">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: habit.color + '22' }}
          >
            {habit.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-tight truncate">{habit.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">{habit.frequency}</span>
              {streak > 0 && (
                <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: habit.color }}>
                  🔥 {streak}d
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Check today */}
            <button
              onClick={handleToggleToday}
              disabled={loading || clearing}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isDoneToday
                  ? 'text-white shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
              }`}
              style={isDoneToday ? { backgroundColor: habit.color } : {}}
              title={isDoneToday ? 'Mark undone' : 'Mark done for today'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            {/* Expand */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            >
              <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* Three-dot menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-10 z-50 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 py-1 min-w-[160px]">
                  <button
                    onClick={() => { setShowMenu(false); setShowEdit(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-2"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleClearRecords() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2"
                  >
                    🗑️ Clear Records
                  </button>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />
                  <button
                    onClick={() => { setShowMenu(false); handleArchive() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                  >
                    🗃️ Archive
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded section */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700 pt-3 flex flex-col gap-4">
            {habit.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{habit.description}</p>
            )}

            {/* Last 7 days */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">Last 7 days</p>
              <div className="flex gap-1.5 justify-between">
                {last7.map((date) => {
                  const done = logSet.has(date)
                  const d = new Date(date + 'T00:00:00')
                  const isToday = date === todayLocal
                  return (
                    <button
                      key={date}
                      onClick={() => handleToggleDay(date)}
                      disabled={loading || clearing}
                      className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all active:scale-95 ${
                        done ? 'text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                      } ${isToday ? 'ring-2 ring-offset-1 dark:ring-offset-zinc-800' : ''}`}
                      style={{
                        backgroundColor: done ? habit.color : undefined,
                        ...(isToday ? { '--tw-ring-color': habit.color } as React.CSSProperties : {}),
                      }}
                    >
                      <span className="text-[10px] font-medium">{weekDays[d.getDay()]}</span>
                      <span className="text-xs font-bold">{d.getDate()}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Heatmap */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">History</p>
              {clearing ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
                  <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                  Clearing records...
                </div>
              ) : (
                <HabitHeatmap logs={logSet} color={habit.color} weeks={18} />
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Streak', value: `${streak}d` },
                { label: 'Total', value: `${logs.length}` },
                { label: 'This month', value: `${logs.filter(l => l.completed_date.startsWith(thisMonth)).length}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl py-2 px-3" style={{ backgroundColor: habit.color + '18' }}>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
                  <p className="text-lg font-bold" style={{ color: habit.color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <EditHabitModal
          habit={habit}
          onUpdated={(updated) => { onUpdated(updated); setShowEdit(false) }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
