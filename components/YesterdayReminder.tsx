'use client'

import { useState } from 'react'
import { Habit, HabitLog } from '@/lib/supabase'
import { toggleHabitLog, formatDate } from '@/lib/api'

type Props = {
  habits: Habit[]
  logsMap: Record<string, HabitLog[]>
  onLogsChanged: (habitId: string, newLogs: HabitLog[]) => void
  onDismiss: () => void
}

export default function YesterdayReminder({ habits, logsMap, onLogsChanged, onDismiss }: Props) {
  const yesterday = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - 1)
    return formatDate(d)
  })()

  const yesterdayLabel = new Date(yesterday + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  // Only show habits not tracked yesterday
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [dismissing, setDismissing] = useState(false)

  const untrackedHabits = habits.filter(
    (h) => !logsMap[h.id]?.some((l) => l.completed_date === yesterday)
  )

  async function handleToggle(habit: Habit) {
    const isChecked = !!checked[habit.id]
    setSaving((s) => ({ ...s, [habit.id]: true }))
    try {
      await toggleHabitLog(habit.id, yesterday, isChecked)
      if (isChecked) {
        // uncheck — remove from logsMap
        const updated = (logsMap[habit.id] ?? []).filter((l) => l.completed_date !== yesterday)
        onLogsChanged(habit.id, updated)
        setChecked((c) => ({ ...c, [habit.id]: false }))
      } else {
        // check — add to logsMap
        const updated = [
          ...(logsMap[habit.id] ?? []),
          { id: '', habit_id: habit.id, completed_date: yesterday, created_at: new Date().toISOString() },
        ]
        onLogsChanged(habit.id, updated)
        setChecked((c) => ({ ...c, [habit.id]: true }))
      }
    } finally {
      setSaving((s) => ({ ...s, [habit.id]: false }))
    }
  }

  function handleDismiss() {
    setDismissing(true)
    // Let the exit animation play before removing from DOM
    setTimeout(onDismiss, 320)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${dismissing ? 'opacity-0' : 'opacity-100 animate-backdrop'}`}
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div
        className={`relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 border border-transparent dark:border-zinc-800 transition-all duration-320
          ${dismissing
            ? 'opacity-0 translate-y-6 sm:scale-95'
            : 'animate-slide-in-sheet sm:animate-scale-in'
          }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          {/* Drag handle (mobile) */}
          <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mb-5 sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-2xl flex-shrink-0">
                ⏰
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">You forgot yesterday!</h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{yesterdayLabel}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
            {untrackedHabits.length} habit{untrackedHabits.length !== 1 ? 's were' : ' was'} not tracked. Did you do any of them?
          </p>
        </div>

        {/* Habit list */}
        <div className="px-4 pb-2 flex flex-col gap-2 max-h-64 overflow-y-auto">
          {untrackedHabits.map((habit, i) => {
            const isChecked = !!checked[habit.id]
            const isSaving = !!saving[habit.id]
            return (
              <button
                key={habit.id}
                onClick={() => handleToggle(habit)}
                disabled={isSaving}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl border-2 transition-all duration-200 text-left animate-slide-up-sm
                  ${isChecked
                    ? 'border-transparent'
                    : 'border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-600'
                  }`}
                style={{
                  animationDelay: `${i * 40}ms`,
                  ...(isChecked ? { backgroundColor: habit.color + '18', borderColor: habit.color + '60' } : {}),
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: habit.color + '22' }}
                >
                  {habit.icon}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate transition-colors ${isChecked ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {habit.name}
                  </p>
                  {isChecked && (
                    <p className="text-xs font-medium animate-fade-in" style={{ color: habit.color }}>
                      Logged for yesterday ✓
                    </p>
                  )}
                </div>

                {/* Checkbox */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${isChecked ? 'border-transparent scale-110' : 'border-zinc-300 dark:border-zinc-600'}
                    ${isSaving ? 'opacity-50' : ''}
                  `}
                  style={isChecked ? { backgroundColor: habit.color } : {}}
                >
                  {isSaving ? (
                    <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : isChecked ? (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pt-3 pb-8 sm:pb-5 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
