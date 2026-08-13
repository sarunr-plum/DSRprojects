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
          border: `1.5px solid ${selected.length > 0 ? "#571541" : "#E5E3DC"}`,
          background: selected.length > 0 ? "#F5E9EF" : "white",
          color: selected.length > 0 ? "#571541" : "#2B211D",
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
          className="absolute z-50 mt-1 rounded-xl overflow-hidden shadow-lg"
          style={{
            border: "1.5px solid #E5E3DC",
            background: "white",
            minWidth: "200px",
            maxHeight: "260px",
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div
              className="px-3 py-3 text-sm text-center"
              style={{ color: "#A8A29E" }}
            >
              No options
            </div>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt)
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-50"
                  style={{ color: "#2B211D" }}
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
                      border: `1.5px solid ${checked ? "#571541" : "#D6D2CC"}`,
                      background: checked ? "#571541" : "white",
                    }}
                  >
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="white"
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
              className="w-full text-left text-xs px-3 py-2 transition-colors hover:bg-gray-50"
              style={{ color: "#571541", borderTop: "1px solid #F0EFE9" }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
