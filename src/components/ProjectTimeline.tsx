import { useRef, useState, useMemo, useEffect, useCallback } from "react"
import type { JiraEpic } from "../lib/jira"

type Zoom = "days" | "weeks" | "months"

interface Props {
  projects: JiraEpic[]
  statusStyle: (name: string) => { bg: string; text: string }
  onSelect: (epic: JiraEpic) => void
  onDragDatesChange: (
    epicKey: string,
    fields: { startDate?: string; dueDate?: string },
  ) => void
}

const PX_PER_DAY: Record<Zoom, number> = { days: 36, weeks: 14, months: 4.6 }
const ZOOMS: Zoom[] = ["days", "weeks", "months"]
const ROW_HEIGHT = 52
const UNIT_ROW_HEIGHT = 44
const GROUP_ROW_HEIGHT = 24
const HANDLE_W = 10

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
  const dow = (x.getDay() + 6) % 7
  return addDays(x, -dow)
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

type DragInfo = {
  key: string
  handle: "start" | "end"
  startClientX: number
  origStartDay: number
  origEndDay: number
  lastStartDay: number
  lastEndDay: number
}

export default function ProjectTimeline({
  projects,
  onSelect,
  onDragDatesChange,
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
          label: cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
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
          label: cursor.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
          widthDays: daysBetween(cursor, next),
        })
        cursor = next
      }
    }
    return cols
  }, [zoom, rangeStart, rangeEnd, totalDays])

  const groupHeader = useMemo(() => {
    if (zoom === "months") return null
    const groups: { label: string; widthDays: number }[] = []
    columns.forEach((c) => {
      const label = c.date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
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

  // ── Drag handles ─────────────────────────────────────────────────────────
  const dragRef = useRef<DragInfo | null>(null)
  const didDragRef = useRef(false) // true if mouse moved during a drag; blocks the click event
  const [activeDrag, setActiveDrag] = useState<{
    key: string
    startDay: number
    endDay: number
  } | null>(null)

  const stableDragDatesChange = useCallback(onDragDatesChange, [onDragDatesChange])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      didDragRef.current = true
      const deltaDays = Math.round((e.clientX - d.startClientX) / pxPerDay)
      let startDay = d.origStartDay
      let endDay = d.origEndDay
      if (d.handle === "start") {
        startDay = Math.min(d.origStartDay + deltaDays, d.origEndDay - 1)
      } else {
        endDay = Math.max(d.origEndDay + deltaDays, d.origStartDay + 1)
      }
      d.lastStartDay = startDay
      d.lastEndDay = endDay
      setActiveDrag({ key: d.key, startDay, endDay })
    }

    function onMouseUp() {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      const fields: { startDate?: string; dueDate?: string } = {}
      if (d.handle === "start") {
        fields.startDate = toISODate(addDays(rangeStart, d.lastStartDay))
      } else {
        fields.dueDate = toISODate(addDays(rangeStart, d.lastEndDay))
      }
      setActiveDrag(null)
      stableDragDatesChange(d.key, fields)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
    return () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
  }, [pxPerDay, rangeStart, stableDragDatesChange])

  function startDrag(
    e: React.MouseEvent,
    key: string,
    handle: "start" | "end",
    origStartDay: number,
    origEndDay: number,
  ) {
    e.preventDefault()
    e.stopPropagation()
    didDragRef.current = false
    dragRef.current = {
      key,
      handle,
      startClientX: e.clientX,
      origStartDay,
      origEndDay,
      lastStartDay: origStartDay,
      lastEndDay: origEndDay,
    }
  }

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
          style={{ color: "var(--surface)", background: "var(--ink)" }}
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
          {/* Project name column */}
          <div
            className="flex-shrink-0 w-56 sm:w-72"
            style={{ borderRight: "1px solid var(--line-soft)" }}
          >
            <div style={{ height: headerHeight, borderBottom: "1px solid var(--line-soft)" }} />
            {projects.map((p) => (
              <button
                key={p.key}
                onClick={() => onSelect(p)}
                className="w-full px-3 flex items-center text-left transition-colors hover:bg-[var(--surface-sunk)]"
                style={{ height: ROW_HEIGHT, borderBottom: "1px solid var(--line-soft)" }}
              >
                <span
                  className="text-sm font-semibold block overflow-x-auto whitespace-nowrap"
                  style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                >
                  {p.fields.summary}
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto no-bar"
            style={{ cursor: activeDrag ? "ew-resize" : "default" }}
          >
            <div style={{ width: totalWidth, position: "relative" }}>
              {groupHeader && (
                <div
                  className="flex"
                  style={{ borderBottom: "1px solid var(--line-soft)", height: GROUP_ROW_HEIGHT }}
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
                style={{ borderBottom: "1px solid var(--line-soft)", height: UNIT_ROW_HEIGHT }}
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
                const isDragging = activeDrag?.key === p.key
                const rawStart = p.fields.startDate ? new Date(p.fields.startDate) : null
                const rawEnd = p.fields.duedate ? new Date(p.fields.duedate) : null

                const startDay = isDragging
                  ? activeDrag!.startDay
                  : rawStart
                    ? daysBetween(rangeStart, startOfDay(rawStart))
                    : null
                const endDay = isDragging
                  ? activeDrag!.endDay
                  : rawEnd
                    ? daysBetween(rangeStart, startOfDay(rawEnd))
                    : null

                const hasBar = startDay !== null && endDay !== null

                return (
                  <div
                    key={p.key}
                    role="button"
                    onClick={() => {
                      if (didDragRef.current) { didDragRef.current = false; return }
                      onSelect(p)
                    }}
                    className="relative block w-full text-left transition-colors hover:bg-[var(--surface-sunk)] group"
                    style={{
                      height: ROW_HEIGHT,
                      borderBottom: "1px solid var(--line-soft)",
                      cursor: isDragging ? "ew-resize" : "pointer",
                    }}
                  >
                    {hasBar ? (
                      <div
                        className="absolute flex items-center"
                        style={{
                          top: "50%",
                          transform: "translateY(-50%)",
                          left: startDay! * pxPerDay,
                          width: Math.max((endDay! - startDay!) * pxPerDay, HANDLE_W * 2 + 4),
                          height: "26px",
                          background: "var(--ink)",
                          borderRadius: "5px",
                          userSelect: "none",
                        }}
                      >
                        {/* Left handle */}
                        <div
                          onMouseDown={(e) =>
                            startDrag(e, p.key, "start", startDay!, endDay!)
                          }
                          className="flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            width: HANDLE_W,
                            height: "100%",
                            cursor: "ew-resize",
                            borderRadius: "5px 0 0 5px",
                          }}
                          title="Drag to change start date"
                        >
                          <span style={{ width: 2, height: 12, background: "rgba(255,255,255,0.45)", borderRadius: 1, display: "block" }} />
                        </div>

                        {/* Label */}
                        <span
                          className="flex-1 text-xs font-medium truncate text-center px-1"
                          style={{ color: "#fff", pointerEvents: "none" }}
                        >
                          {p.key}
                        </span>

                        {/* Right handle */}
                        <div
                          onMouseDown={(e) =>
                            startDrag(e, p.key, "end", startDay!, endDay!)
                          }
                          className="flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            width: HANDLE_W,
                            height: "100%",
                            cursor: "ew-resize",
                            borderRadius: "0 5px 5px 0",
                          }}
                          title="Drag to change end date"
                        >
                          <span style={{ width: 2, height: 12, background: "rgba(255,255,255,0.45)", borderRadius: 1, display: "block" }} />
                        </div>
                      </div>
                    ) : (
                      <span
                        className="absolute top-1/2 -translate-y-1/2 text-xs px-2"
                        style={{ left: Math.max(todayLeft - 80, 0), color: "var(--ink-ghost)" }}
                      >
                        No dates set — tap to add
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
