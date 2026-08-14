import { useState, useRef, useEffect } from "react"

interface Props {
  label: string
  allLabel: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

export default function MultiSelectFilter({
  label,
  allLabel,
  options,
  selected,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  function toggleOption(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((o) => o !== opt)
        : [...selected, opt],
    )
  }

  const displayLabel =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? selected[0]
        : `${label} (${selected.length})`

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
        style={{
          background: selected.length > 0 ? "var(--accent-wash)" : "var(--track)",
          color: selected.length > 0 ? "var(--accent)" : "var(--ink)",
        }}
      >
        <span className="truncate max-w-[10rem]">{displayLabel}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 rounded-xl overflow-hidden pop-panel"
          style={{ minWidth: "210px", maxHeight: "260px", overflowY: "auto" }}
        >
          {options.length === 0 ? (
            <div
              className="px-3 py-3 text-sm text-center"
              style={{ color: "var(--ink-faint)" }}
            >
              No options
            </div>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-[var(--surface-sunk)]"
                  style={{ color: "var(--ink)" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(opt)}
                    className="sr-only"
                  />
                  <span
                    className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors"
                    style={{
                      border: `1.5px solid ${checked ? "var(--accent)" : "var(--line)"}`,
                      background: checked ? "var(--accent)" : "var(--surface)",
                    }}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="var(--surface)"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{opt}</span>
                </label>
              )
            })
          )}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left text-xs px-3 py-2 transition-colors hover:bg-[var(--surface-sunk)]"
              style={{ color: "var(--accent)", borderTop: "1px solid var(--line-soft)" }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
