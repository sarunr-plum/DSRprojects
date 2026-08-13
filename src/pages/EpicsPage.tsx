import { useState, useEffect, useCallback, useMemo } from "react"
import { getEpics, type JiraEpic } from "../lib/jira"
import { getEpicVisibility, setEpicVisible } from "../lib/storage"
import ProjectTimeline from "../components/ProjectTimeline"
import ProjectDetailsModal from "../components/ProjectDetailsModal"
import MultiSelectFilter from "../components/MultiSelectFilter"

interface Props {
  onRegisterRefresh: (fn: () => void) => void
}

type ViewMode = "list" | "timeline"

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "In Progress": { bg: "#F5E9EF", text: "#571541" },
  "To Do": { bg: "#F5F3F0", text: "#78716C" },
  Done: { bg: "#ECFDF5", text: "#059669" },
  Blocked: { bg: "#FEF2F2", text: "#DC2626" },
}

function statusStyle(name: string) {
  return STATUS_COLORS[name] ?? { bg: "#F5F3F0", text: "#78716C" }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

export default function EpicsPage({ onRegisterRefresh }: Props) {
  const [epics, setEpics] = useState<JiraEpic[]>([])
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterAssignee, setFilterAssignee] = useState<string[]>([])
  const [view, setView] = useState<ViewMode>("list")
  const [selectedEpic, setSelectedEpic] = useState<JiraEpic | null>(null)

  const loadEpics = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setVisibility(getEpicVisibility())
      const fetched = await getEpics()
      setEpics(fetched)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEpics()
  }, [loadEpics])

  useEffect(() => {
    onRegisterRefresh(() => loadEpics())
  }, [loadEpics, onRegisterRefresh])

  function toggle(epicKey: string, checked: boolean) {
    setEpicVisible(epicKey, checked)
    setVisibility((v) => ({ ...v, [epicKey]: checked }))
  }

  function handleDatesChanged(
    epicKey: string,
    fields: { startDate?: string; dueDate?: string },
  ) {
    setEpics((prev) =>
      prev.map((e) =>
        e.key === epicKey
          ? {
              ...e,
              fields: {
                ...e.fields,
                ...("startDate" in fields
                  ? { startDate: fields.startDate || undefined }
                  : {}),
                ...("dueDate" in fields
                  ? { duedate: fields.dueDate || undefined }
                  : {}),
              },
            }
          : e,
      ),
    )
    setSelectedEpic((prev) =>
      prev && prev.key === epicKey
        ? {
            ...prev,
            fields: {
              ...prev.fields,
              ...("startDate" in fields
                ? { startDate: fields.startDate || undefined }
                : {}),
              ...("dueDate" in fields
                ? { duedate: fields.dueDate || undefined }
                : {}),
            },
          }
        : prev,
    )
  }

  function handleStatusChanged(
    epicKey: string,
    status: { id: string; name: string },
  ) {
    setEpics((prev) =>
      prev.map((e) =>
        e.key === epicKey ? { ...e, fields: { ...e.fields, status } } : e,
      ),
    )
    setSelectedEpic((prev) =>
      prev && prev.key === epicKey
        ? { ...prev, fields: { ...prev.fields, status } }
        : prev,
    )
  }

  // Derive unique filter options
  const statusOptions = useMemo(
    () => Array.from(new Set(epics.map((e) => e.fields.status.name))).sort(),
    [epics],
  )
  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          epics
            .filter((e) => e.fields.assignee)
            .map((e) => e.fields.assignee!.displayName),
        ),
      ).sort(),
    [epics],
  )

  const filtered = epics.filter((e) => {
    if (filterStatus.length > 0 && !filterStatus.includes(e.fields.status.name))
      return false
    if (
      filterAssignee.length > 0 &&
      (!e.fields.assignee ||
        !filterAssignee.includes(e.fields.assignee.displayName))
    )
      return false
    return true
  })

  const enabledCount = Object.values(visibility).filter(Boolean).length

  return (
    <main
      className={`relative z-10 flex-1 px-4 sm:px-6 py-6 mx-auto w-full ${
        view === "timeline" ? "max-w-6xl" : "max-w-5xl"
      }`}
    >
      {!loading && epics.length > 0 && (
        <p className="text-xs mb-3" style={{ color: "#78716C" }}>
          {enabledCount} of {epics.length} visible on board
        </p>
      )}

      {/* Filters */}
      {!loading && epics.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <MultiSelectFilter
              label="Status"
              allLabel="All statuses"
              options={statusOptions}
              selected={filterStatus}
              onChange={setFilterStatus}
            />
            <MultiSelectFilter
              label="Assignee"
              allLabel="All assignees"
              options={assigneeOptions}
              selected={filterAssignee}
              onChange={setFilterAssignee}
            />
            {(filterStatus.length > 0 || filterAssignee.length > 0) && (
              <button
                onClick={() => {
                  setFilterStatus([])
                  setFilterAssignee([])
                }}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ color: "#571541", background: "#F5E9EF" }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-0.5 rounded-full p-0.5 flex-shrink-0"
            style={{ background: "#EFEDE6" }}
          >
            {(["list", "timeline"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="text-xs px-3.5 py-1.5 rounded-full capitalize transition-colors"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  background: view === v ? "white" : "transparent",
                  color: view === v ? "#2B211D" : "#78716C",
                  fontWeight: view === v ? 600 : 400,
                  boxShadow: view === v ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white rounded-2xl animate-pulse"
              style={{ border: "1px solid #E5E3DC" }}
            />
          ))}
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm mb-4"
          style={{
            background: "#FEF2F2",
            color: "#DC2626",
            border: "1px solid #FECACA",
          }}
        >
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="text-center py-16">
          <p
            className="text-base font-medium mb-1"
            style={{ color: "#2B211D", fontFamily: "'DM Sans', sans-serif" }}
          >
            {epics.length === 0
              ? "No projects found"
              : "No projects match your filters"}
          </p>
          <p className="text-sm" style={{ color: "#78716C" }}>
            {epics.length === 0
              ? "Make sure your Jira project has at least one Epic."
              : "Try adjusting the filters above."}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && view === "timeline" && (
        <ProjectTimeline
          projects={filtered}
          statusStyle={statusStyle}
          onSelect={setSelectedEpic}
        />
      )}

      {!loading && filtered.length > 0 && view === "list" && (
        <div className="space-y-2">
          <p
            className="text-xs font-medium px-1 mb-3"
            style={{ color: "#A8A29E" }}
          >
            Toggle projects on to show their tasks on the board. Tap a project
            for details. Sorted by newest first.
          </p>

          {filtered.map((epic) => {
            const isVisible = visibility[epic.key] ?? false
            const s = statusStyle(epic.fields.status.name)

            return (
              <div
                key={epic.key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEpic(epic)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedEpic(epic)}
                className="flex items-center gap-4 bg-white px-4 py-3.5 rounded-2xl transition-shadow hover:shadow-sm cursor-pointer"
                style={{ border: "1px solid #E5E3DC" }}
              >
                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={isVisible}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(epic.key, !isVisible)
                  }}
                  className="flex-shrink-0 w-10 h-6 rounded-full transition-colors relative"
                  style={{ background: isVisible ? "#571541" : "#E5E3DC" }}
                >
                  <span
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                    style={{
                      left: isVisible ? "calc(100% - 1.25rem)" : "0.25rem",
                    }}
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium block truncate"
                    style={{
                      color: "#2B211D",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {epic.fields.summary}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <a
                      href={`https://plumhq.atlassian.net/browse/${epic.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs hover:underline flex-shrink-0"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        color: "#78716C",
                      }}
                    >
                      {epic.key}
                    </a>
                    {epic.fields.assignee && (
                      <span className="text-xs" style={{ color: "#A8A29E" }}>
                        · {epic.fields.assignee.displayName}
                      </span>
                    )}
                    {epic.fields.startDate && (
                      <span className="text-xs" style={{ color: "#A8A29E" }}>
                        · Start {formatDate(epic.fields.startDate)}
                      </span>
                    )}
                    {epic.fields.duedate && (
                      <span className="text-xs" style={{ color: "#A8A29E" }}>
                        · Due {formatDate(epic.fields.duedate)}
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

      {selectedEpic && (
        <ProjectDetailsModal
          epic={selectedEpic}
          onClose={() => setSelectedEpic(null)}
          onDatesChanged={handleDatesChanged}
          onStatusChanged={handleStatusChanged}
        />
      )}
    </main>
  )
}
