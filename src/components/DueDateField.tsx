import { useState } from "react"

// Local calendar date as "YYYY-MM-DD" — matches <input type="date">'s value
// format. Avoids toISOString(), which converts to UTC and can shift the day.
function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  return next
}

// Friday of the calendar week containing `d` (Mon–Sun week) — always "this
// week's Friday", even if that's earlier than `d` (e.g. d is a Saturday).
function fridayOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getDay() + 6) % 7 // Mon = 0 ... Sun = 6
  return addDays(d, 4 - daysSinceMonday)
}

function quickDueDates() {
  const today = new Date()
  const thisFriday = fridayOfWeek(today)
  return {
    today: toDateInputValue(today),
    tomorrow: toDateInputValue(addDays(today, 1)),
    thisWeek: toDateInputValue(thisFriday),
    nextWeek: toDateInputValue(addDays(thisFriday, 7)),
  }
}

export function formatDueDatePreview(value: string): string {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

interface Props {
  value: string
  onChange: (value: string) => void
}

export default function DueDateField({ value, onChange }: Props) {
  // Tracks which chip was actually clicked, independent of the date value —
  // two chips can land on the same date (e.g. "Today"/"This week" when today
  // is a Friday), and only the one the user picked should look selected.
  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const quickDates = quickDueDates()

  function selectQuick(label: string, dateValue: string) {
    setActiveLabel(label)
    onChange(dateValue)
  }

  function handleManualChange(newValue: string) {
    setActiveLabel(null)
    onChange(newValue)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        type="date"
        value={value}
        onChange={(e) => handleManualChange(e.target.value)}
        className="t-meta rounded-full flex-shrink-0"
        style={{
          background: "var(--track)",
          color: value ? "var(--ink)" : "var(--ink-soft)",
          border: "none",
          outline: "none",
          paddingTop: "0.375rem",
          paddingBottom: "0.375rem",
          paddingLeft: "0.75rem",
          paddingRight: "0.4rem",
        }}
      />
      {(
        [
          ["Today", quickDates.today],
          ["Tomo", quickDates.tomorrow],
          ["This week", quickDates.thisWeek],
          ["Next week", quickDates.nextWeek],
        ] as const
      ).map(([label, dateValue]) => (
        <button
          key={label}
          type="button"
          onClick={() => selectQuick(label, dateValue)}
          className="t-meta px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
          style={{
            background: activeLabel === label ? "var(--accent)" : "var(--track)",
            color: activeLabel === label ? "#fff" : "var(--ink-soft)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
