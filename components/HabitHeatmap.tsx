'use client'

import { useMemo } from 'react'
import { formatDate } from '@/lib/api'

type Props = {
  logs: Set<string>
  color: string
  weeks?: number
}

const DAYS = ['', 'M', '', 'W', '', 'F', '']

export default function HabitHeatmap({ logs, color, weeks = 18 }: Props) {
  const cells = useMemo(() => {
    const result: { date: string; active: boolean; isToday: boolean }[][] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Start from the Sunday of the week, `weeks` weeks ago
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - weeks * 7 - startDate.getDay())

    let current = new Date(startDate)
    for (let w = 0; w <= weeks; w++) {
      const week: { date: string; active: boolean; isToday: boolean }[] = []
      for (let d = 0; d < 7; d++) {
        const dateStr = formatDate(current)
        const isToday = formatDate(current) === formatDate(today)
        const isFuture = current > today
        week.push({
          date: dateStr,
          active: !isFuture && logs.has(dateStr),
          isToday,
        })
        current = new Date(current)
        current.setDate(current.getDate() + 1)
      }
      result.push(week)
    }
    return result
  }, [logs, weeks])

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    const seen = new Set<string>()
    cells.forEach((week, wIdx) => {
      week.forEach((day) => {
        if (!day.date) return
        const d = new Date(day.date)
        const label = d.toLocaleString('default', { month: 'short' })
        if (!seen.has(label)) {
          seen.add(label)
          labels.push({ label, col: wIdx })
        }
      })
    })
    return labels
  }, [cells])

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-0">
        {/* Month labels */}
        <div className="flex gap-[3px] ml-5">
          {cells.map((_, wIdx) => {
            const found = monthLabels.find((m) => m.col === wIdx)
            return (
              <div key={wIdx} className="w-[11px] text-[8px] text-zinc-400 font-medium leading-none truncate">
                {found ? found.label : ''}
              </div>
            )
          })}
        </div>
        {/* Grid */}
        <div className="flex gap-[3px]">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-1">
            {DAYS.map((label, i) => (
              <div key={i} className="h-[11px] w-3 text-[8px] text-zinc-400 font-medium leading-none flex items-center">
                {label}
              </div>
            ))}
          </div>
          {/* Cells */}
          {cells.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-[3px]">
              {week.map((day, dIdx) => (
                <div
                  key={dIdx}
                  title={day.date}
                  className="w-[11px] h-[11px] rounded-[2px] transition-transform hover:scale-110"
                  style={{
                    backgroundColor: day.active
                      ? color
                      : 'rgba(0,0,0,0.08)',
                    opacity: day.active ? 1 : 0.5,
                    outline: day.isToday ? `2px solid ${color}` : 'none',
                    outlineOffset: '1px',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
