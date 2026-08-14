import { useRef, useState, useMemo, useEffect } from "react"
import type { JiraEpic } from "../lib/jira"

type Zoom = "days" | "weeks" | "months"

interface Props {
  projects: JiraEpic[]
  statusStyle: (name: string) => { bg: string; text: string }
  onSelect: (epic: JiraEpic) => void
}

const PX_PER_DAY: Record<Zoom, number> = { days: 36, weeks: 14, months: 4.6 }
const ZOOMS: Zoom[] = ["days", "weeks", "months"]
const ROW_HEIGHT = 48
const UNIT_ROW_HEIGHT = 44
const GROUP_ROW_HEIGHT = 24

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000,
  )
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // Monday = 0
  return addDays(x, -dow)
}

export default function ProjectTimeline({
  projects,
  statusStyle,
  onSelect,
}: Props) {
  const [zoom, setZoom] = useState<Zoom>("weeks")
  const scrollRef = useRef<HTMLDivElement>(null)
  const pxPerDay = PX_PER_DAY[zoom]
  const today = useMemo(() => startOfDay(new Date()), [])

  const { rangeStart, rangeEnd } = useMemo(() => {
    const dates: Date[] = []
    projects.forEach((p) => {
      const s = p.fields.startDate
      const d = p.fields.duedate
      if (s) dates.push(new Date(s))
      if (d) dates.push(new Date(d))
    })
    let start = dates.length
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : addDays(today, -14)
    let end = dates.length
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : addDays(today, 60)
    start = addDays(start, -14)
    end = addDays(end, 14)
    if (today < start) start = addDays(today, -14)
    if (today > end) end = addDays(today, 14)
    return { rangeStart: startOfDay(start), rangeEnd: startOfDay(end) }
  }, [projects, today])

  const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1)
  const totalWidth = totalDays * pxPerDay

  const columns = useMemo(() => {
    const cols: { date: Date; label: string; widthDays: number }[] = []
    if (zoom === "days") {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(rangeStart, i)
        cols.push({ date: d, label: String(d.getDate()), widthDays: 1 })
      }
    } else if (zoom === "weeks") {
      let cursor = startOfWeek(rangeStart)
      while (cursor < rangeEnd) {
        cols.push({
          date: cursor,
          label: cursor.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          widthDays: 7,
        })
        cursor = addDays(cursor, 7)
      }
    } else {
      let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
      while (cursor < rangeEnd) {
        const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        cols.push({
          date: cursor,
          label: cursor.toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric",
          }),
          widthDays: daysBetween(cursor, next),
        })
        cursor = next
      }
    }
    return cols
  }, [zoom, rangeStart, rangeEnd, totalDays])

  // Grouping row above the unit labels (month names) — only useful when the
  // unit itself is finer than a month.
  const groupHeader = useMemo(() => {
    if (zoom === "months") return null
    const groups: { label: string; widthDays: number }[] = []
    columns.forEach((c) => {
      const label = c.date.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.widthDays += c.widthDays
      else groups.push({ label, widthDays: c.widthDays })
    })
    return groups
  }, [columns, zoom])

  const todayLeft = daysBetween(rangeStart, today) * pxPerDay

  function jumpToToday(behavior: ScrollBehavior = "smooth") {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: Math.max(todayLeft - el.clientWidth / 2, 0), behavior })
  }

  useEffect(() => {
    jumpToToday("auto")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  const headerHeight = groupHeader ? GROUP_ROW_HEIGHT + UNIT_ROW_HEIGHT : UNIT_ROW_HEIGHT

  return (
    <div
      className="rise-in overflow-hidden"
      style={{
        borderRadius: "var(--r-lg)",
        background: "var(--surface)",
        boxShadow: "0 1px 2px rgb(var(--ink-rgb) / 0.05)",
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--line-soft)" }}
      >
        <button
          onClick={() => jumpToToday()}
          className="t-meta px-3.5 py-1.5 rounded-full transition-all active:scale-95"
          style={{
            color: "var(--surface)",
            background: "var(--ink)",
          }}
        >
          Today
        </button>
        <div className="seg">
          {ZOOMS.map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`seg-item t-meta px-3 py-1.5 ${zoom === z ? "is-on" : ""}`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
          No projects to show.
        </div>
      ) : (
        <div className="flex">
          {/* Project name column — wide enough for most names, scrolls horizontally for the rest */}
          <div
            className="flex-shrink-0 w-56 sm:w-72"
            style={{ borderRight: "1px solid var(--line-soft)" }}
          >
            <div
              style={{
                height: headerHeight,
                borderBottom: "1px solid var(--line-soft)",
              }}
            />
            {projects.map((p) => (
              <button
                key={p.key}
                onClick={() => onSelect(p)}
                className="w-full px-3 flex items-center text-left transition-colors hover:bg-[var(--surface-sunk)]"
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: "1px solid var(--line-soft)",
                }}
              >
                <span
                  className="text-xs font-medium block overflow-x-auto whitespace-nowrap"
                  style={{ color: "var(--ink)" }}
                >
                  {p.fields.summary}
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto no-bar">
            <div style={{ width: totalWidth, position: "relative" }}>
              {groupHeader && (
                <div
                  className="flex"
                  style={{
                    borderBottom: "1px solid var(--line-soft)",
                    height: GROUP_ROW_HEIGHT,
                  }}
                >
                  {groupHeader.map((g, i) => (
                    <div
                      key={i}
                      className="text-xs font-medium flex items-center justify-center px-2 truncate flex-shrink-0"
                      style={{
                        width: g.widthDays * pxPerDay,
                        color: "var(--ink-soft)",
                        borderRight: "1px solid var(--line-soft)",
                      }}
                    >
                      {g.label}
                    </div>
                  ))}
                </div>
              )}

              <div
                className="flex"
                style={{
                  borderBottom: "1px solid var(--line-soft)",
                  height: UNIT_ROW_HEIGHT,
                }}
              >
                {columns.map((c, i) => (
                  <div
                    key={i}
                    className="text-xs flex items-center justify-center flex-shrink-0"
                    style={{
                      width: c.widthDays * pxPerDay,
                      color: "var(--ink-faint)",
                      borderRight: "1px solid var(--line-soft)",
                    }}
                  >
                    {c.label}
                  </div>
                ))}
              </div>

              {/* Today marker */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: todayLeft,
                  width: 0,
                  borderLeft: "2.5px dotted var(--danger)",
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              />

              {/* Rows */}
              {projects.map((p) => {
                const s = p.fields.startDate
                  ? new Date(p.fields.startDate)
                  : null
                const d = p.fields.duedate ? new Date(p.fields.duedate) : null
                const st = statusStyle(p.fields.status.name)
                return (
                  <button
                    key={p.key}
                    onClick={() => onSelect(p)}
                    className="relative block w-full text-left transition-colors hover:bg-[var(--surface-sunk)]"
                    style={{
                      height: ROW_HEIGHT,
                      borderBottom: "1px solid var(--line-soft)",
                    }}
                  >
                    {s && d ? (
                      <span
                        className="absolute top-3.5 rounded-full flex items-center px-2.5 text-xs font-medium truncate"
                        style={{
                          left: daysBetween(rangeStart, s) * pxPerDay,
                          width: Math.max(daysBetween(s, d), 1) * pxPerDay,
                          minWidth: "18px",
                          height: "20px",
                          background: st.bg,
                          color: st.text,
                        }}
                      >
                        {p.key}
                      </span>
                    ) : (
                      <span
                        className="absolute top-3.5 text-xs px-2"
                        style={{
                          left: Math.max(todayLeft - 80, 0),
                          color: "var(--ink-ghost)",
                        }}
                      >
                        No dates set — tap to add
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
