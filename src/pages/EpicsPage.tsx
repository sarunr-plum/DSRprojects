import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { getEpics, getCurrentUser, type JiraEpic } from "../lib/jira"
import {
  getEpicVisibility,
  setEpicVisible,
  getEpicFilters,
  setEpicFilters,
  hasStoredEpicFilters,
} from "../lib/storage"
import ProjectTimeline from "../components/ProjectTimeline"
import ProjectDetailsModal from "../components/ProjectDetailsModal"
import MultiSelectFilter from "../components/MultiSelectFilter"
import SortMenu, { type SortOption } from "../components/SortMenu"

interface Props {
  onRegisterRefresh: (fn: () => void) => void
}

type ViewMode = "list" | "timeline"
type SortKey = "newest" | "oldest" | "dueDate" | "name"

const SORT_OPTIONS: SortOption<SortKey>[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "dueDate", label: "Due date" },
  { key: "name", label: "Name A–Z" },
]

function sortEpics(epics: JiraEpic[], sortKey: SortKey): JiraEpic[] {
  const arr = [...epics]
  switch (sortKey) {
    case "newest":
      arr.sort((a, b) => (b.fields.created ?? "").localeCompare(a.fields.created ?? ""))
      break
    case "oldest":
      arr.sort((a, b) => (a.fields.created ?? "").localeCompare(b.fields.created ?? ""))
      break
    case "dueDate":
      arr.sort((a, b) => {
        if (!a.fields.duedate && !b.fields.duedate) return 0
        if (!a.fields.duedate) return 1
        if (!b.fields.duedate) return -1
        return a.fields.duedate.localeCompare(b.fields.duedate)
      })
      break
    case "name":
      arr.sort((a, b) => a.fields.summary.localeCompare(b.fields.summary))
      break
  }
  return arr
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "In Progress": { bg: "var(--accent-wash)", text: "var(--accent)" },
  "To Do": { bg: "var(--surface-sunk)", text: "var(--ink-soft)" },
  Done: { bg: "var(--ok-wash)", text: "var(--ok)" },
  Blocked: { bg: "var(--danger-wash)", text: "var(--danger)" },
}

function statusStyle(name: string) {
  return STATUS_COLORS[name] ?? { bg: "var(--surface-sunk)", text: "var(--ink-soft)" }
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
  const [filterStatus, setFilterStatus] = useState<string[]>(
    () => getEpicFilters().status,
  )
  const [filterAssignee, setFilterAssignee] = useState<string[]>(
    () => getEpicFilters().assignee,
  )
  const [view, setView] = useState<ViewMode>("list")
  const [sortKey, setSortKey] = useState<SortKey>("newest")
  const [onlyEnabled, setOnlyEnabled] = useState(true)
  const [selectedEpic, setSelectedEpic] = useState<JiraEpic | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [userResolved, setUserResolved] = useState(false)
  const defaultAssigneeApplied = useRef(false)
  // Captured once, before this session writes anything — tells the
  // first-run-default effect whether the user already has saved filters.
  const hadStoredFilters = useRef(hasStoredEpicFilters())

  // Persist on every change (including a manual "Clear filters") so filters
  // survive switching tabs and reloading, until the user changes them again.
  useEffect(() => {
    setEpicFilters({ status: filterStatus, assignee: filterAssignee })
  }, [filterStatus, filterAssignee])

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUserName(u?.displayName ?? null))
      .catch(() => setCurrentUserName(null))
      .finally(() => setUserResolved(true))
  }, [])

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

  // Default the assignee filter to the logged-in user, once, the first time
  // their name actually shows up among the loaded epics' assignees — but only
  // on a genuinely first-ever run. If filters were already saved (even
  // cleared to empty), respect them instead of overriding.
  useEffect(() => {
    if (defaultAssigneeApplied.current) return
    if (!userResolved || assigneeOptions.length === 0) return
    defaultAssigneeApplied.current = true
    if (hadStoredFilters.current) return
    if (currentUserName && assigneeOptions.includes(currentUserName)) {
      setFilterAssignee([currentUserName])
    }
  }, [userResolved, assigneeOptions, currentUserName])

  const filtered = epics.filter((e) => {
    if (filterStatus.length > 0 && !filterStatus.includes(e.fields.status.name))
      return false
    if (
      filterAssignee.length > 0 &&
      (!e.fields.assignee ||
        !filterAssignee.includes(e.fields.assignee.displayName))
    )
      return false
    if (onlyEnabled && !visibility[e.key]) return false
    return true
  })

  const sorted = sortEpics(filtered, sortKey)

  const enabledCount = Object.values(visibility).filter(Boolean).length

  return (
    <main className="relative z-10 flex-1 px-4 sm:px-8 lg:px-12 py-8 mx-auto w-full max-w-6xl">
      {!loading && epics.length > 0 && (
        <>
          <div className="flex items-end justify-between gap-4 mb-1 rise-in">
            <h2 className="t-display text-[clamp(1.75rem,5vw,2.75rem)]" style={{ color: "var(--ink)" }}>
              Projects
            </h2>
            <p className="t-meta pb-1.5" style={{ color: "var(--ink-soft)" }}>
              {enabledCount} / {epics.length} on board
            </p>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--ink-soft)" }}>
            Switch a project ON to show it in tasks view
          </p>
        </>
      )}

      {/* Filters */}
      {!loading && epics.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div className="flex flex-wrap items-center gap-2">
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
            <SortMenu value={sortKey} options={SORT_OPTIONS} onChange={setSortKey} />
            {(filterStatus.length > 0 || filterAssignee.length > 0) && (
              <button
                onClick={() => {
                  setFilterStatus([])
                  setFilterAssignee([])
                }}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ color: "var(--accent)", background: "var(--accent-wash)" }}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyEnabled}
                onChange={(e) => setOnlyEnabled(e.target.checked)}
                className="sr-only"
              />
              <span
                className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors"
                style={{
                  border: `1.5px solid ${onlyEnabled ? "var(--accent)" : "var(--line)"}`,
                  background: onlyEnabled ? "var(--accent)" : "transparent",
                }}
              >
                {onlyEnabled && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4l3 3 5-6"
                      stroke="#fff"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="t-meta" style={{ color: "var(--ink-soft)" }}>
                See only enabled
              </span>
            </label>

            <div className="seg">
              {(["list", "timeline"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`seg-item t-meta px-4 py-1.5 ${view === v ? "is-on" : ""}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-[var(--surface)] rounded-2xl animate-pulse"
              style={{ border: "1px solid var(--line)" }}
            />
          ))}
        </div>
      )}

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm mb-4"
          style={{
            background: "var(--danger-wash)",
            color: "var(--danger)",
            border: "1px solid var(--danger-line)",
          }}
        >
          {error}
        </div>
      )}

      {!loading && sorted.length === 0 && !error && (
        <div className="text-center py-16">
          <p
            className="text-base font-medium mb-1"
            style={{ color: "var(--ink)", fontFamily: "'DM Sans', sans-serif" }}
          >
            {epics.length === 0 ? "No projects found" : "No projects match your filters"}
          </p>
          <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
            {epics.length === 0
              ? "Make sure your Jira project has at least one Epic."
              : onlyEnabled
                ? "Toggle some projects on, or turn off “See only enabled”."
                : "Try adjusting the filters above."}
          </p>
        </div>
      )}

      {!loading && sorted.length > 0 && view === "timeline" && (
        <ProjectTimeline
          projects={sorted}
          statusStyle={statusStyle}
          onSelect={setSelectedEpic}
        />
      )}

      {!loading && sorted.length > 0 && view === "list" && (
        <div
          className="rounded-2xl overflow-hidden rise-in"
          style={{ background: "var(--surface)", boxShadow: "0 1px 2px rgb(var(--ink-rgb) / 0.05)" }}
        >
          {sorted.map((epic, i) => {
            const isVisible = visibility[epic.key] ?? false
            const s = statusStyle(epic.fields.status.name)

            return (
              <div
                key={epic.key}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEpic(epic)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedEpic(epic)}
                className="flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors hover:bg-[var(--surface-sunk)]"
                style={{
                  borderBottom: i < sorted.length - 1 ? "1px solid var(--line-soft)" : undefined,
                }}
              >
                {/* Toggle */}
                <button
                  role="switch"
                  aria-checked={isVisible}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(epic.key, !isVisible)
                  }}
                  className="flex-shrink-0 w-8 h-[18px] rounded-full transition-colors relative"
                  style={{ background: isVisible ? "var(--accent)" : "var(--line)" }}
                >
                  <span
                    className="absolute rounded-full bg-[var(--surface)] shadow-sm transition-all"
                    style={{
                      top: "2px",
                      width: "14px",
                      height: "14px",
                      left: isVisible ? "calc(100% - 16px)" : "2px",
                    }}
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[15px] font-semibold block truncate"
                    style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                  >
                    {epic.fields.summary}
                  </span>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <a
                      href={`https://plumhq.atlassian.net/browse/${epic.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="link t-key text-[11px] flex-shrink-0"
                    >
                      {epic.key}
                    </a>
                    {epic.fields.assignee && (
                      <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                        · {epic.fields.assignee.displayName}
                      </span>
                    )}
                    {epic.fields.startDate && (
                      <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                        · Start {formatDate(epic.fields.startDate)}
                      </span>
                    )}
                    {epic.fields.duedate && (
                      <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                        · Due {formatDate(epic.fields.duedate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span
                  className="t-meta px-2.5 py-1.5 rounded-full flex-shrink-0"
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
