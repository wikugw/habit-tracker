import { supabase, Habit, HabitLog } from './supabase'

export type JournalEntry = {
  id: string
  entry_date: string
  content: string
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible' | null
  created_at: string
  updated_at: string
}

export async function getJournalEntries(fromDate: string, toDate: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .gte('entry_date', fromDate)
    .lte('entry_date', toDate)
    .order('entry_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getJournalEntry(date: string): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('entry_date', date)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function upsertJournalEntry(entry: { entry_date: string; content: string; mood: JournalEntry['mood'] }): Promise<JournalEntry> {
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert(entry, { onConflict: 'entry_date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteJournalEntry(date: string): Promise<void> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('entry_date', date)
  if (error) throw error
}

export async function getHabits(): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createHabit(habit: Omit<Habit, 'id' | 'created_at' | 'archived_at'>): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .insert(habit)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateHabit(id: string, updates: Partial<Pick<Habit, 'name' | 'description' | 'color' | 'icon' | 'frequency' | 'target_days'>>): Promise<Habit> {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clearHabitLogs(habitId: string): Promise<void> {
  const { error } = await supabase
    .from('habit_logs')
    .delete()
    .eq('habit_id', habitId)
  if (error) throw error
}

export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw error
}

export async function archiveHabit(id: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function getHabitLogs(habitId: string, fromDate: string, toDate: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .gte('completed_date', fromDate)
    .lte('completed_date', toDate)
    .order('completed_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getAllLogs(fromDate: string, toDate: string): Promise<HabitLog[]> {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .gte('completed_date', fromDate)
    .lte('completed_date', toDate)
  if (error) throw error
  return data ?? []
}

export async function toggleHabitLog(habitId: string, date: string, currentlyDone: boolean): Promise<void> {
  if (currentlyDone) {
    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_date', date)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('habit_logs')
      .upsert({ habit_id: habitId, completed_date: date })
    if (error) throw error
  }
}

export function formatDate(date: Date): string {
  // Use local date parts to avoid UTC offset shifting the day
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getDateRange(weeks: number = 26): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - weeks * 7)
  return { from: formatDate(from), to: formatDate(to) }
}

export function getStreak(logs: Set<string>): number {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (logs.has(formatDate(d))) {
      streak++
    } else {
      break
    }
  }
  return streak
}
