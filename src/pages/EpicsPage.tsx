import { useState, useEffect, useMemo } from "react"
import { getEpics, type JiraEpic } from "../lib/jira"
import { getEpicVisibility, setEpicVisible } from "../lib/storage"
import DotGrid from "../components/DotGrid"

interface Props {
  onBack: () => void
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "In Progress": { bg: "#EEF2FF", text: "#4338CA" },
  "To Do": { bg: "#F3F4F6", text: "#6B7280" },
  "Done": { bg: "#ECFDF5", text: "#059669" },
  "Blocked": { bg: "#FEF2F2", text: "#DC2626" },
}

function statusStyle(name: string) {
  return STATUS_COLORS[name] ?? { bg: "#F3F4F6", text: "#6B7280" }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export default function EpicsPage({ onBack }: Props) {
  const [epics, setEpics] = useState<JiraEpic[]>([])
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterAssignee, setFilterAssignee] = useState("")

  useEffect(() => {
    setVisibility(getEpicVisibility())
    getEpics()
      .then(setEpics)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function toggle(epicKey: string, checked: boolean) {
    setEpicVisible(epicKey, checked)
    setVisibility((v) => ({ ...v, [epicKey]: checked }))
  }

  // Derive unique filter options
  const statusOptions = useMemo(
    () => Array.from(new Set(epics.map((e) => e.fields.status.name))).sort(),
    [epics]
  )
  const assigneeOptions = useMemo(
    () => Array.from(new Set(epics.filter((e) => e.fields.assignee).map((e) => e.fields.assignee!.displayName))).sort(),
    [epics]
  )

  const filtered = epics.filter((e) => {
    if (filterStatus && e.fields.status.name !== filterStatus) return false
    if (filterAssignee && e.fields.assignee?.displayName !== filterAssignee) return false
    return true
  })

  const enabledCount = Object.values(visibility).filter(Boolean).length

  const selectStyle: React.CSSProperties = {
    fontSize: "13px",
    padding: "6px 10px",
    borderRadius: "99px",
    border: "1.5px solid #E5E3DC",
    background: "white",
    color: "#1F2430",
    outline: "none",
    cursor: "pointer",
  }

  return (
    <div className="relative min-h-screen" style={{ background: "#F6F5F0" }}>
      <DotGrid />

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 py-4"
        style={{
          background: "rgba(246,245,240,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5E3DC",
        }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-white"
          style={{ color: "#6B7280", border: "1px solid #E5E3DC" }}
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2430" }}>
            Epics
          </h1>
          {!loading && (
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {enabledCount} of {epics.length} visible on board
            </p>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        {/* Filters */}
        {!loading && epics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="">All statuses</option>
              {statusOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              style={selectStyle}
            >
              <option value="">All assignees</option>
              {assigneeOptions.map((a) => <option key={a}>{a}</option>)}
            </select>
            {(filterStatus || filterAssignee) && (
              <button
                onClick={() => { setFilterStatus(""); setFilterAssignee("") }}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ color: "#4338CA", background: "#EEF2FF" }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" style={{ border: "1px solid #E5E3DC" }} />
            ))}
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="text-center py-16">
            <p className="text-base font-medium mb-1" style={{ color: "#1F2430", fontFamily: "Outfit, sans-serif" }}>
              {epics.length === 0 ? "No epics found" : "No epics match your filters"}
            </p>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {epics.length === 0
                ? "Make sure your Jira project has at least one Epic."
                : "Try adjusting the filters above."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium px-1 mb-3" style={{ color: "#9CA3AF" }}>
              Toggle epics on to show their tasks on the board. Sorted by newest first.
            </p>

            {filtered.map((epic) => {
              const isVisible = visibility[epic.key] ?? false
              const s = statusStyle(epic.fields.status.name)

              return (
                <div
                  key={epic.key}
                  className="flex items-center gap-4 bg-white px-4 py-3.5 rounded-2xl transition-shadow hover:shadow-sm"
                  style={{ border: "1px solid #E5E3DC" }}
                >
                  {/* Toggle */}
                  <button
                    role="switch"
                    aria-checked={isVisible}
                    onClick={() => toggle(epic.key, !isVisible)}
                    className="flex-shrink-0 w-10 h-6 rounded-full transition-colors relative"
                    style={{ background: isVisible ? "#4338CA" : "#E5E3DC" }}
                  >
                    <span
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                      style={{ left: isVisible ? "calc(100% - 1.25rem)" : "0.25rem" }}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm font-medium block truncate"
                      style={{ color: "#1F2430", fontFamily: "Outfit, sans-serif" }}
                    >
                      {epic.fields.summary}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <a
                        href={`https://plumhq.atlassian.net/browse/${epic.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline flex-shrink-0"
                        style={{ fontFamily: "JetBrains Mono, monospace", color: "#6B7280" }}
                      >
                        {epic.key}
                      </a>
                      {epic.fields.duedate && (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>
                          · Due {formatDate(epic.fields.duedate)}
                        </span>
                      )}
                      {epic.fields.assignee && (
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>
                          · {epic.fields.assignee.displayName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium"
                    style={{ background: s.bg, color: s.text }}
                  >
                    {epic.fields.status.name}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
