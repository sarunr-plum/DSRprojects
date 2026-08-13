import { useState } from "react"
import Logo from "./Logo"
import { cheer } from "../lib/mood"

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
    cheer("eyes")
    onRefresh()
    window.setTimeout(() => setSpinning(false), 900)
  }

  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-8 py-5"
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
        {/* Tabs — top left */}
        <div className="justify-self-start">
          <div className="seg">
            {(["tasks", "projects"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`seg-item t-meta px-4 sm:px-5 py-2 ${
                  activeTab === tab ? "is-on" : ""
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Brand — dead centre, boxed like a stamp */}
        <div
          className="flex items-center gap-2.5 justify-self-center px-3 py-2"
          style={{
            border: "1px solid var(--ink)",
            borderRadius: "var(--r)",
            background: "var(--surface)",
          }}
        >
          <Logo size={26} />
          <h1
            className="t-display text-[15px] hidden sm:block whitespace-nowrap"
            style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            Design &amp; Research
          </h1>
        </div>

        {/* Actions — top right */}
        <div className="flex items-center gap-2 justify-self-end">
          <button
            onClick={handleRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="btn-icon"
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
            style={{ color: "var(--danger)", borderColor: "var(--danger-line)" }}
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
