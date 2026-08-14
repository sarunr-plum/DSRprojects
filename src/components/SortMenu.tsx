import { useState, useRef, useEffect } from "react"

export interface SortOption<T extends string> {
  key: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: SortOption<T>[]
  onChange: (key: T) => void
}

export default function SortMenu<T extends string>({ value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  const current = options.find((o) => o.key === value)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
        style={{ background: "var(--track)", color: "var(--ink)" }}
      >
        <span className="truncate max-w-[9rem]">Sort: {current?.label ?? ""}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 rounded-xl overflow-hidden pop-panel" style={{ minWidth: "180px" }}>
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                onChange(opt.key)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-sunk)]"
              style={{
                color: opt.key === value ? "var(--accent)" : "var(--ink)",
                fontWeight: opt.key === value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
