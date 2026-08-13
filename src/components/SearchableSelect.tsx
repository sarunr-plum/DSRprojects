import { useState, useEffect, useRef } from "react"

export interface SelectOption {
  value: string
  label: string
  isDivider?: boolean
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  onSearch?: (query: string) => void
  placeholder?: string
  emptyLabel?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  onSearch,
  placeholder = "Search…",
  emptyLabel = "None",
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value && !o.isDivider)
  // When onSearch is provided, `options` already reflects server-side matches for `query`.
  // Dividers are grouping labels, not real options — they never participate in search.
  const filtered =
    !onSearch && query
      ? options.filter(
          (o) =>
            !o.isDivider && o.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options

  useEffect(() => {
    if (!onSearch) return
    const timer = setTimeout(() => onSearch(query), 250)
    return () => clearTimeout(timer)
  }, [query, onSearch])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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
    if (e.key === "Escape") {
      setOpen(false)
      setQuery("")
    }
    if (e.key === "Enter") {
      const first = filtered.find((o) => !o.isDivider)
      if (first) handleSelect(first.value)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
        style={{
          border: `1.5px solid ${open ? "#571541" : "#E5E3DC"}`,
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
            style={{ color: "#2B211D", fontFamily: "'DM Sans', sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm flex-1 truncate"
            style={{ color: selected ? "#2B211D" : "#A8A29E" }}
          >
            {selected ? selected.label : emptyLabel}
          </span>
        )}
        <svg
          className="flex-shrink-0 ml-2 transition-transform"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: "#A8A29E",
          }}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3 5l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
          style={{
            border: "1.5px solid #E5E3DC",
            background: "white",
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          <div
            className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
            style={{ color: "#78716C", borderBottom: "1px solid #F0EFE9" }}
            onClick={() => handleSelect("")}
          >
            {emptyLabel}
          </div>
          {filtered.length === 0 ? (
            <div
              className="px-3 py-3 text-sm text-center"
              style={{ color: "#A8A29E" }}
            >
              No results
            </div>
          ) : (
            filtered.map((opt) =>
              opt.isDivider ? (
                <div
                  key={opt.value}
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color: "#A8A29E",
                    background: "#FAFAF8",
                    borderTop: "1px solid #F0EFE9",
                    borderBottom: "1px solid #F0EFE9",
                  }}
                >
                  {opt.label}
                </div>
              ) : (
                <div
                  key={opt.value}
                  className="px-3 py-2 cursor-pointer text-sm"
                  style={{
                    background: opt.value === value ? "#F5E9EF" : "transparent",
                    color: opt.value === value ? "#571541" : "#2B211D",
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== value)
                      (e.currentTarget as HTMLElement).style.background =
                        "#FAF9F7"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
                      opt.value === value ? "#F5E9EF" : "transparent"
                  }}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </div>
              ),
            )
          )}
        </div>
      )}
    </div>
  )
}
