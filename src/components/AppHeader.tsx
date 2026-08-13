import { useState } from "react"

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
    setTimeout(() => setSpinning(false), 1000)
  }

  return (
    <header
      className="sticky top-0 z-30 px-4 sm:px-6 py-3"
      style={{
        background: "rgba(250,246,240,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E5E3DC",
      }}
    >
      <div
        className="grid items-center"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <div />

        <div className="flex items-center gap-2 justify-self-center">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#571541" }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <rect
                x="2"
                y="5"
                width="3.5"
                height="10"
                rx="1"
                fill="white"
                opacity="0.9"
              />
              <rect
                x="8.25"
                y="3"
                width="3.5"
                height="14"
                rx="1"
                fill="white"
                opacity="0.7"
              />
              <rect
                x="14.5"
                y="7"
                width="3.5"
                height="8"
                rx="1"
                fill="white"
                opacity="0.5"
              />
            </svg>
          </div>
          <h1
            className="text-base font-semibold hidden sm:block"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#2B211D" }}
          >
            Design & Research
          </h1>
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          <button
            onClick={handleRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-white"
            style={{ color: "#78716C", border: "1px solid #E5E3DC" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-[18px] h-[18px]${spinning ? " animate-spin" : ""}`}
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
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-white"
            style={{ color: "#DC2626", border: "1px solid #E5E3DC" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-[18px] h-[18px]"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-3">
        <div
          className="flex items-center gap-0.5 rounded-full p-0.5"
          style={{ background: "#EFEDE6" }}
        >
          {(["tasks", "projects"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className="text-sm px-5 py-1.5 rounded-full capitalize transition-colors"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: activeTab === tab ? "white" : "transparent",
                color: activeTab === tab ? "#2B211D" : "#78716C",
                fontWeight: activeTab === tab ? 600 : 400,
                boxShadow:
                  activeTab === tab ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
