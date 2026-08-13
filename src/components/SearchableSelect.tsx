import { useState, useEffect, useRef } from "react"

export interface SelectOption {
  value: string
  label: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Search…", emptyLabel = "None" }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery("")
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); setQuery("") }
    if (e.key === "Enter" && filtered.length > 0) handleSelect(filtered[0].value)
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
        style={{
          border: `1.5px solid ${open ? "#4338CA" : "#E5E3DC"}`,
          background: open ? "white" : "#FAFAF8",
          minHeight: "38px",
        }}
        onClick={() => {
          setOpen((o) => !o)
          setTimeout(() => inputRef.current?.focus(), 0)
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#1F2430", fontFamily: "Inter, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm flex-1 truncate" style={{ color: selected ? "#1F2430" : "#9CA3AF" }}>
            {selected ? selected.label : emptyLabel}
          </span>
        )}
        <svg
          className="flex-shrink-0 ml-2 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "#9CA3AF" }}
          width="14" height="14" viewBox="0 0 14 14" fill="none"
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
          style={{ border: "1.5px solid #E5E3DC", background: "white", maxHeight: "220px", overflowY: "auto" }}
        >
          <div
            className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
            style={{ color: "#6B7280", borderBottom: "1px solid #F0EFE9" }}
            onClick={() => handleSelect("")}
          >
            {emptyLabel}
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-center" style={{ color: "#9CA3AF" }}>No results</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className="px-3 py-2 cursor-pointer text-sm"
                style={{
                  background: opt.value === value ? "#EEF2FF" : "transparent",
                  color: opt.value === value ? "#4338CA" : "#1F2430",
                }}
                onMouseEnter={(e) => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = "#F9FAFB" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = opt.value === value ? "#EEF2FF" : "transparent" }}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
