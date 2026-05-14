'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { JournalEntry, getJournalEntries, upsertJournalEntry, deleteJournalEntry, getDateRange, formatDate } from '@/lib/api'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const MOODS = [
  { value: 'great',    emoji: '😄', label: 'Great',    color: '#22c55e' },
  { value: 'good',     emoji: '🙂', label: 'Good',     color: '#84cc16' },
  { value: 'okay',     emoji: '😐', label: 'Okay',     color: '#f59e0b' },
  { value: 'bad',      emoji: '😕', label: 'Bad',      color: '#f97316' },
  { value: 'terrible', emoji: '😞', label: 'Terrible', color: '#ef4444' },
] as const

type Mood = typeof MOODS[number]['value']

function getMood(value: string | null) {
  return MOODS.find(m => m.value === value) ?? null
}

// ── Editor for one day ────────────────────────────────────────
function DayEditor({
  date,
  entry,
  onSaved,
  onDeleted,
  onClose,
}: {
  date: string
  entry: JournalEntry | null
  onSaved: (e: JournalEntry) => void
  onDeleted: (date: string) => void
  onClose: () => void
}) {
  const [content, setContent] = useState(entry?.content ?? '')
  const [mood, setMood] = useState<Mood | null>((entry?.mood as Mood) ?? null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  // Autosave 800ms after last change
  useEffect(() => {
    if (!content && mood === null) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!content.trim() && mood === null) return
      setSaving(true)
      try {
        const result = await upsertJournalEntry({ entry_date: date, content, mood })
        onSaved(result)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } finally {
        setSaving(false)
      }
    }, 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [content, mood, date, onSaved])

  async function handleDelete() {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteJournalEntry(date)
      onDeleted(date)
      handleClose()
    } finally {
      setDeleting(false)
    }
  }

  function handleClose() {
    setDismissing(true)
    setTimeout(onClose, 300)
  }

  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${dismissing ? 'opacity-0' : 'animate-backdrop'}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 border border-transparent dark:border-zinc-800 flex flex-col transition-all duration-300
          ${dismissing ? 'opacity-0 translate-y-4 sm:scale-95' : 'animate-slide-in-sheet sm:animate-scale-in'}`}
        style={{ maxHeight: '90vh' }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Journal</p>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-all duration-300 ${saved ? 'opacity-100 text-green-500' : saving ? 'opacity-60 text-zinc-400' : 'opacity-0'}`}>
              {saving ? 'Saving…' : '✓ Saved'}
            </span>
            {entry && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mood picker */}
        <div className="px-5 pb-3 flex-shrink-0">
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mb-2">How are you feeling?</p>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? null : m.value as Mood)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border-2 transition-all duration-150 active:scale-95
                  ${mood === m.value
                    ? 'border-transparent scale-110'
                    : 'border-zinc-100 dark:border-zinc-700 hover:border-zinc-200 dark:hover:border-zinc-600'
                  }`}
                style={mood === m.value ? { backgroundColor: m.color + '20', borderColor: m.color + '60' } : {}}
                title={m.label}
              >
                <span className="text-xl leading-none">{m.emoji}</span>
                <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="px-5 pb-2 flex-1 overflow-hidden flex flex-col min-h-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write anything — what happened today, how you're feeling, what you're grateful for…"
            className="w-full flex-1 min-h-[200px] resize-none bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 pb-8 sm:pb-5 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Entry card ────────────────────────────────────────────────
function EntryCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const mood = getMood(entry.mood)
  const label = new Date(entry.entry_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
  const preview = entry.content.trim().slice(0, 120) + (entry.content.length > 120 ? '…' : '')
  const wordCount = entry.content.trim().split(/\s+/).filter(Boolean).length

  return (
    <button
      onClick={onClick}
      className="card-enter w-full text-left bg-white dark:bg-zinc-800 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-700 hover:shadow-md transition-all duration-200 hover:border-zinc-200 dark:hover:border-zinc-600 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {mood && <span className="text-xl leading-none">{mood.emoji}</span>}
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{label}</span>
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">{wordCount}w</span>
      </div>
      {preview
        ? <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{preview}</p>
        : <p className="text-sm text-zinc-300 dark:text-zinc-600 italic">No content yet…</p>
      }
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [moodFilter, setMoodFilter] = useState<Mood | null>(null)

  const today = formatDate(new Date())

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { from } = getDateRange(52)
        const data = await getJournalEntries(from, today)
        setEntries(data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaved = useCallback((saved: JournalEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex(e => e.entry_date === saved.entry_date)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }, [])

  const handleDeleted = useCallback((date: string) => {
    setEntries((prev) => prev.filter(e => e.entry_date !== date))
  }, [])

  const editingEntry = entries.find(e => e.entry_date === editingDate) ?? null

  const filtered = entries.filter(e => {
    const matchesMood = moodFilter ? e.mood === moodFilter : true
    const matchesSearch = search ? e.content.toLowerCase().includes(search.toLowerCase()) : true
    return matchesMood && matchesSearch
  })

  const moodCounts = MOODS.map(m => ({
    ...m,
    count: entries.filter(e => e.mood === m.value).length,
  }))
  const totalEntries = entries.length
  const totalWords = entries.reduce((sum, e) => sum + e.content.trim().split(/\s+/).filter(Boolean).length, 0)
  const todayEntry = entries.find(e => e.entry_date === today)

  const grouped = filtered.reduce((acc, entry) => {
    const month = entry.entry_date.slice(0, 7)
    if (!acc[month]) acc[month] = []
    acc[month].push(entry)
    return acc
  }, {} as Record<string, JournalEntry[]>)

  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 max-w-2xl mx-auto px-4 pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-950 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Journal</h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{totalEntries} entries · {totalWords.toLocaleString()} words</p>
            </div>
          </div>
          <button
            onClick={() => setEditingDate(today)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-all active:scale-95 hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {todayEntry ? 'Edit today' : 'Write today'}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Mood filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setMoodFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              moodFilter === null
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-700'
            }`}
          >
            All
          </button>
          {MOODS.map(m => {
            const count = moodCounts.find(c => c.value === m.value)!.count
            return (
              <button
                key={m.value}
                onClick={() => setMoodFilter(moodFilter === m.value ? null : m.value as Mood)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  moodFilter === m.value
                    ? 'border-transparent text-white'
                    : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-100 dark:border-zinc-700'
                }`}
                style={moodFilter === m.value ? { backgroundColor: m.color } : {}}
              >
                {m.emoji} {m.label}
                {count > 0 && (
                  <span className={moodFilter === m.value ? 'text-white/70' : 'text-zinc-300 dark:text-zinc-600'}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-700 dark:border-t-zinc-300 rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Loading journal…</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 animate-fade-in">
          <div className="text-6xl">📔</div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">Start your journal</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">Write about your day, capture your thoughts, and track how you feel over time.</p>
          </div>
          <button
            onClick={() => setEditingDate(today)}
            className="mt-2 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            Write your first entry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
          <div className="text-4xl">🔍</div>
          <p className="text-sm text-zinc-400">No entries match your search.</p>
          <button onClick={() => { setSearch(''); setMoodFilter(null) }} className="text-sm text-zinc-500 underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {months.map(month => {
            const label = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            return (
              <div key={month}>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 px-1">{label}</p>
                <div className="flex flex-col gap-2">
                  {grouped[month].map(entry => (
                    <EntryCard
                      key={entry.entry_date}
                      entry={entry}
                      onClick={() => setEditingDate(entry.entry_date)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center px-2">
        <Link href="/" className="flex-1 flex flex-col items-center py-3 gap-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          <span className="text-lg leading-none">📅</span>
          <span className="text-[10px] font-semibold">Habits</span>
        </Link>
        <div className="flex-1 flex flex-col items-center py-3 gap-0.5 text-zinc-900 dark:text-zinc-100">
          <span className="text-lg leading-none">📔</span>
          <span className="text-[10px] font-semibold">Journal</span>
        </div>
      </div>

      {editingDate && (
        <DayEditor
          date={editingDate}
          entry={editingEntry}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onClose={() => setEditingDate(null)}
        />
      )}
    </div>
  )
}
