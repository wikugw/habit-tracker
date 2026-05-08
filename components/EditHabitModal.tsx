'use client'

import { useState } from 'react'
import { Habit } from '@/lib/supabase'
import { updateHabit } from '@/lib/api'

type Props = {
  habit: Habit
  onUpdated: (habit: Habit) => void
  onClose: () => void
}

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

const ICONS = ['✅', '💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🍎', '😴', '🧹', '💊']

export default function EditHabitModal({ habit, onUpdated, onClose }: Props) {
  const [name, setName] = useState(habit.name)
  const [description, setDescription] = useState(habit.description ?? '')
  const [color, setColor] = useState(habit.color)
  const [icon, setIcon] = useState(habit.icon)
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(habit.frequency)
  const [targetDays, setTargetDays] = useState(habit.target_days)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const updated = await updateHabit(habit.id, {
        name: name.trim(),
        description: description.trim() || null,
        color,
        icon,
        frequency,
        target_days: frequency === 'daily' ? 7 : targetDays,
      })
      onUpdated(updated)
    } catch {
      setError('Failed to update habit. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="animate-backdrop absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-slide-in-sheet sm:animate-scale-in relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-10 sm:pb-6 z-10 border border-transparent dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Habit</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  type="button"
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-all ${
                    icon === ic ? 'ring-2 ring-offset-1 scale-110 dark:ring-offset-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  style={icon === ic ? { background: color + '22' } : {}}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any notes..."
              className="w-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Color</label>
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 dark:ring-offset-zinc-900' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2 block">Frequency</label>
            <div className="flex gap-2">
              {(['daily', 'weekly'] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    frequency === f ? 'text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  style={frequency === f ? { backgroundColor: color } : {}}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {frequency === 'weekly' && (
              <div className="mt-3">
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Target days per week: <strong className="text-zinc-800 dark:text-zinc-200">{targetDays}</strong>
                </label>
                <input type="range" min={1} max={7} value={targetDays} onChange={(e) => setTargetDays(Number(e.target.value))} className="w-full" style={{ accentColor: color }} />
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
