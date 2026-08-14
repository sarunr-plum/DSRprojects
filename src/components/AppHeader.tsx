import { useState } from "react"
import Logo from "./Logo"

interface Props {
  activeTab: "tasks" | "projects"
  onTabChange: (tab: "tasks" | "projects") => void
  onRefresh: () => void
  onLogout: () => void
}

export default function AppHeader({
  activeTab,
  onTabChange,
  onRefresh,
  onLogout,
}: Props) {
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    onRefresh()
    window.setTimeout(() => setSpinning(false), 900)
  }

  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-8 lg:px-12 py-3"
      style={{
        background: "rgb(var(--bg-veil) / 0.86)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        className="grid items-center gap-4"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        {/* Brand — just the mark, far left */}
        <div className="flex items-center justify-self-start">
          <Logo size={32} />
        </div>

        {/* Tabs — dead centre */}
        <div className="justify-self-center flex items-center gap-1">
          {(["tasks", "projects"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="t-meta px-3 sm:px-4 py-2 rounded-full transition-colors"
              style={{
                color: activeTab === tab ? "var(--accent)" : "var(--ink-soft)",
                fontWeight: activeTab === tab ? 700 : 500,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Actions — top right */}
        <div className="flex items-center gap-2 justify-self-end">
          <button
            onClick={handleRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="btn-icon"
            style={{ border: "none" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[17px] h-[17px]"
              style={{
                animation: spinning ? "spin 900ms var(--ease) 1" : undefined,
              }}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="btn-icon"
            style={{ border: "none" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[17px] h-[17px]"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
