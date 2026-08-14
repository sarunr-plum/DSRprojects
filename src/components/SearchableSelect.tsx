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
  const baseOptions =
    !onSearch && query
      ? options.filter(
          (o) =>
            !o.isDivider && o.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options
  // Outside of an active search, float the current selection to the top so
  // re-opening the list to change it doesn't require hunting for it.
  const filtered =
    !query && selected
      ? [selected, ...baseOptions.filter((o) => o.value !== selected.value)]
      : baseOptions

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
          border: `1.5px solid ${open ? "var(--accent)" : "var(--line)"}`,
          background: open ? "var(--surface)" : "var(--surface-sunk)",
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
            style={{ color: "var(--ink)", fontFamily: "'DM Sans', sans-serif", outline: "none" }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="text-sm flex-1 truncate"
            style={{ color: selected ? "var(--ink)" : "var(--ink-faint)" }}
          >
            {selected ? selected.label : emptyLabel}
          </span>
        )}
        <svg
          className="flex-shrink-0 ml-2 transition-transform"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: "var(--ink-faint)",
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
          className="absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden pop-panel"
          style={{ maxHeight: "230px", overflowY: "auto" }}
        >
          <div
            className="px-3 py-2 cursor-pointer hover:bg-[var(--surface-sunk)] text-sm"
            style={{ color: "var(--ink-soft)", borderBottom: "1px solid var(--line-soft)" }}
            onClick={() => handleSelect("")}
          >
            {emptyLabel}
          </div>
          {filtered.length === 0 ? (
            <div
              className="px-3 py-3 text-sm text-center"
              style={{ color: "var(--ink-faint)" }}
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
                    color: "var(--ink-faint)",
                    background: "var(--surface-sunk)",
                    borderTop: "1px solid var(--line-soft)",
                    borderBottom: "1px solid var(--line-soft)",
                  }}
                >
                  {opt.label}
                </div>
              ) : (
                <div
                  key={opt.value}
                  className="px-3 py-2 cursor-pointer text-sm"
                  style={{
                    background: opt.value === value ? "var(--accent-wash)" : "transparent",
                    color: opt.value === value ? "var(--accent)" : "var(--ink)",
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== value)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--surface-sunk)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
                      opt.value === value ? "var(--accent-wash)" : "transparent"
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
