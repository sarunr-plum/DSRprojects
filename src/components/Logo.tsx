import { useState, useEffect, useRef } from "react"
import { onCheer, cheer, DEFAULT_MOOD, type Mood } from "../lib/mood"

/* ------------------------------------------------------------------
   Each mood is a 7x7 pixel glyph. "X" = dot on.
   All 49 dots are always rendered — moods just toggle opacity/scale,
   so every change morphs instead of cutting.
   ------------------------------------------------------------------ */
const GLYPHS: Record<Mood, string[]> = {
  crossed: [
    ".X...X.",
    "..X.X..",
    "...X...",
    "..XXX..",
    ".XXXXX.",
    ".XXXXX.",
    "..XXX..",
  ],
  heart: [
    ".XX.XX.",
    "XXXXXXX",
    "XXXXXXX",
    ".XXXXX.",
    "..XXX..",
    "...X...",
    ".......",
  ],
  sparkle: [
    "...X...",
    "...X...",
    "..XXX..",
    "XXXXXXX",
    "..XXX..",
    "...X...",
    "...X...",
  ],
  thumbsup: [
    "....X..",
    "...X...",
    "..XX...",
    "XXXXXX.",
    "XXXXXX.",
    "XXXXXX.",
    ".XXXX..",
  ],
  rocket: [
    "...X...",
    "..XXX..",
    "..XXX..",
    ".XXXXX.",
    ".XXXXX.",
    "X.XXX.X",
    "..X.X..",
  ],
  wave: [
    ".X.X.X.",
    ".XXXXX.",
    "XXXXXX.",
    "XXXXXX.",
    ".XXXXX.",
    "..XXXX.",
    "..XXX..",
  ],
  confetti: [
    "X..X..X",
    "..X..X.",
    ".X..X..",
    "X..X..X",
    "..XXX..",
    ".XXXXX.",
    "XXXXXXX",
  ],
  eyes: [
    ".......",
    ".......",
    "XXX.XXX",
    "X.X.X.X",
    "XXX.XXX",
    ".......",
    ".......",
  ],
  oops: [
    ".......",
    ".XX.XX.",
    ".XX.XX.",
    ".......",
    "..XXX..",
    ".X...X.",
    ".......",
  ],
}

/* ------------------------------------------------------------------
   Time of day drives the palette and which dots catch the light.
   `sparkEvery`/`sparkOffset` shift which dots are accented, so the
   mark reads differently at 8am than it does at midnight.
   ------------------------------------------------------------------ */
type Phase = {
  id: string
  label: string
  base: string
  spark: string
  sparkEvery: number
  sparkOffset: number
}

const PHASES: Phase[] = [
  {
    id: "dawn",
    label: "Morning",
    base: "var(--ink)",
    spark: "var(--warn)",
    sparkEvery: 4,
    sparkOffset: 0,
  },
  {
    id: "day",
    label: "Afternoon",
    base: "var(--ink)",
    spark: "var(--accent)",
    sparkEvery: 5,
    sparkOffset: 2,
  },
  {
    id: "dusk",
    label: "Evening",
    base: "var(--ink-soft)",
    spark: "var(--accent)",
    sparkEvery: 3,
    sparkOffset: 1,
  },
  {
    id: "night",
    label: "Late night",
    base: "var(--ink-soft)",
    spark: "var(--col-blocked)",
    sparkEvery: 3,
    sparkOffset: 0,
  },
]

function phaseForHour(hour: number): Phase {
  if (hour >= 5 && hour < 10) return PHASES[0]
  if (hour >= 10 && hour < 17) return PHASES[1]
  if (hour >= 17 && hour < 21) return PHASES[2]
  return PHASES[3]
}

const CELL = 10
const GAP = 3
const STEP = CELL + GAP
const SPAN = 7 * CELL + 6 * GAP // 88

interface Props {
  size?: number
  /** Reacts to board activity + time of day. Off for static marks. */
  live?: boolean
  className?: string
}

export default function Logo({ size = 30, live = true, className }: Props) {
  const [mood, setMood] = useState<Mood>(DEFAULT_MOOD)
  const [phase, setPhase] = useState<Phase>(() => phaseForHour(new Date().getHours()))
  const [pulsing, setPulsing] = useState(false)
  const revertTimer = useRef<number | undefined>(undefined)

  // React to board activity
  useEffect(() => {
    if (!live) return
    return onCheer((next) => {
      window.clearTimeout(revertTimer.current)
      setMood(next)
      revertTimer.current = window.setTimeout(
        () => setMood(DEFAULT_MOOD),
        next === "oops" ? 2600 : 1900,
      )
    })
  }, [live])

  useEffect(() => () => window.clearTimeout(revertTimer.current), [])

  // Re-check the time-of-day palette every few minutes
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(
      () => setPhase(phaseForHour(new Date().getHours())),
      4 * 60 * 1000,
    )
    return () => window.clearInterval(id)
  }, [live])

  // Occasional idle breath so the mark never feels dead
  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => {
      setPulsing(true)
      window.setTimeout(() => setPulsing(false), 700)
    }, 13000)
    return () => window.clearInterval(id)
  }, [live])

  const glyph = GLYPHS[mood]

  const cells: React.ReactNode[] = []
  let onIndex = 0
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const on = glyph[r][c] === "X"
      // Diagonal sweep so a morph ripples rather than snapping
      const delay = (r + c) * 11
      let fill = phase.base
      if (on) {
        if ((onIndex + phase.sparkOffset) % phase.sparkEvery === 0) fill = phase.spark
        onIndex++
      }
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * STEP}
          y={r * STEP}
          width={CELL}
          height={CELL}
          rx={3.2}
          style={{
            // `fill` lives in style, not the attribute — var() in SVG
            // presentation attributes isn't reliable across browsers.
            fill,
            opacity: on ? 1 : 0,
            transform: on ? "scale(1)" : "scale(0.2)",
            transformBox: "fill-box",
            transformOrigin: "center",
            transition: `opacity var(--t) var(--ease) ${delay}ms, transform var(--t-slow) var(--ease-out) ${delay}ms, fill var(--t-slow) var(--ease)`,
          }}
        />,
      )
    }
  }

  const interactive = live
  const hour = new Date().getHours()

  return (
    <svg
      viewBox={`0 0 ${SPAN} ${SPAN}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Design & Research — ${phase.label}`}
      onClick={interactive ? () => cheer("sparkle") : undefined}
      style={{
        cursor: interactive ? "pointer" : "default",
        overflow: "visible",
        transform: pulsing ? "scale(1.08)" : "scale(1)",
        transition: "transform 700ms var(--ease-out)",
      }}
    >
      <title>{`${phase.label} · ${String(hour).padStart(2, "0")}:00`}</title>
      {cells}
    </svg>
  )
}
