import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Habit = {
  id: string
  name: string
  description: string | null
  color: string
  icon: string
  frequency: 'daily' | 'weekly'
  target_days: number
  created_at: string
  archived_at: string | null
}

export type HabitLog = {
  id: string
  habit_id: string
  completed_date: string
  created_at: string
}
