import { useState, useEffect, useCallback } from "react"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core"
import { getTasksForEpics, transitionToStatus, type JiraIssue, type JiraEpic } from "../lib/jira"
import { getVisibleEpicKeys } from "../lib/storage"
import { logout } from "../lib/auth"
import { COLUMNS, STATUS_TO_COLUMN, COLUMN_STATUS_NAMES, type ColumnId } from "../lib/constants"
import KanbanColumn from "../components/KanbanColumn"
import TaskCard from "../components/TaskCard"
import NewTaskModal from "../components/NewTaskModal"
import EditTaskModal from "../components/EditTaskModal"
import DotGrid from "../components/DotGrid"

interface Props {
  onNavigateEpics: () => void
  epics: JiraEpic[]
}

type NewTaskConfig = { columnId: ColumnId; assigneeName?: string }

export default function BoardPage({ onNavigateEpics, epics }: Props) {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<string>("")
  const [newTaskConfig, setNewTaskConfig] = useState<NewTaskConfig | null>(null)
  const [editingIssue, setEditingIssue] = useState<JiraIssue | null>(null)
  const [draggingIssue, setDraggingIssue] = useState<JiraIssue | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const epicKeys = getVisibleEpicKeys()
      if (epicKeys.length === 0) {
        setIssues([])
        setLoading(false)
        return
      }
      const tasks = await getTasksForEpics(epicKeys)
      setIssues(tasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Derive people tabs from loaded issues
  const people = Array.from(
    new Set(issues.map((i) => i.fields.assignee?.displayName ?? "Unassigned"))
  ).sort((a, b) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)))

  useEffect(() => {
    if (people.length > 0 && !people.includes(activeTab)) setActiveTab(people[0])
  }, [people, activeTab])

  // Issues for the active person tab
  const tabIssues = issues.filter((i) =>
    activeTab === "Unassigned" ? !i.fields.assignee : i.fields.assignee?.displayName === activeTab
  )

  // Only render columns that have tasks, but always show todo + inprogress
  const activeColumnIds = new Set([
    "todo" as ColumnId,
    "inprogress" as ColumnId,
    ...tabIssues.map((i) => STATUS_TO_COLUMN[i.fields.status.name] ?? ("todo" as ColumnId)),
  ])
  const visibleColumns = COLUMNS.filter((c) => activeColumnIds.has(c.id))

  function issuesForColumn(colId: ColumnId) {
    return tabIssues.filter((i) => {
      const mapped = STATUS_TO_COLUMN[i.fields.status.name]
      return mapped === colId || (!mapped && colId === "todo")
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingIssue(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const issueKey = String(active.id)
    const targetColId = String(over.id) as ColumnId
    const targetStatusNames = COLUMN_STATUS_NAMES[targetColId]
    if (!targetStatusNames) return

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) =>
        i.key === issueKey
          ? { ...i, fields: { ...i.fields, status: { id: "", name: targetStatusNames[0] } } }
          : i
      )
    )

    try {
      await transitionToStatus(issueKey, targetStatusNames)
    } catch {
      loadTasks()
    }
  }

  const visibleEpicKeys = getVisibleEpicKeys()
  const visibleEpics = epics.filter((e) => visibleEpicKeys.includes(e.key))

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#F6F5F0" }}>
      <DotGrid />

      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 gap-3"
        style={{
          background: "rgba(246,245,240,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E5E3DC",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#4338CA" }}
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
              <rect x="2" y="5" width="3.5" height="10" rx="1" fill="white" opacity="0.9" />
              <rect x="8.25" y="3" width="3.5" height="14" rx="1" fill="white" opacity="0.7" />
              <rect x="14.5" y="7" width="3.5" height="8" rx="1" fill="white" opacity="0.5" />
            </svg>
          </div>
          <h1
            className="text-base font-semibold hidden sm:block"
            style={{ fontFamily: "Outfit, sans-serif", color: "#1F2430" }}
          >
            DSR Board
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateEpics}
            className="text-sm px-3.5 py-1.5 rounded-full font-medium transition-colors"
            style={{
              fontFamily: "Outfit, sans-serif",
              color: "#4338CA",
              background: "#EEF2FF",
              border: "1px solid #C7D2FE",
            }}
          >
            Epics
          </button>
          <button
            onClick={loadTasks}
            disabled={loading}
            className="text-sm px-3.5 py-1.5 rounded-full font-medium transition-colors"
            style={{
              fontFamily: "Outfit, sans-serif",
              color: "#6B7280",
              background: "white",
              border: "1px solid #E5E3DC",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={() => { logout(); window.location.reload() }}
            className="text-sm px-3.5 py-1.5 rounded-full font-medium transition-colors hover:bg-white"
            style={{
              fontFamily: "Outfit, sans-serif",
              color: "#6B7280",
              border: "1px solid #E5E3DC",
            }}
          >
            Log out
          </button>
        </div>
      </header>

      {/* Person tabs */}
      {people.length > 0 && (
        <div
          className="sticky z-20 flex gap-1 px-4 sm:px-6 py-2 overflow-x-auto"
          style={{
            top: "57px",
            background: "rgba(246,245,240,0.9)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #E5E3DC",
            scrollbarWidth: "none",
          }}
        >
          {people.map((person) => (
            <button
              key={person}
              onClick={() => setActiveTab(person)}
              className="flex-shrink-0 text-sm px-4 py-1.5 rounded-full transition-all"
              style={{
                fontFamily: "Outfit, sans-serif",
                fontWeight: activeTab === person ? 600 : 400,
                background: activeTab === person ? "#1F2430" : "transparent",
                color: activeTab === person ? "white" : "#6B7280",
              }}
            >
              {person}
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      <main
        className="relative z-10 flex-1 overflow-auto px-4 sm:px-6 py-5"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
      >
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
          >
            {error}{" "}
            <button onClick={loadTasks} className="underline">Try again</button>
          </div>
        )}

        {/* No epics enabled */}
        {!loading && visibleEpicKeys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2" style={{ background: "#EEF2FF" }}>
              <span className="text-2xl">🗂️</span>
            </div>
            <p className="text-base font-semibold" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2430" }}>
              No epics enabled
            </p>
            <p className="text-sm max-w-xs" style={{ color: "#6B7280" }}>
              Head to Epics and toggle on the ones you want to track.
            </p>
            <button
              onClick={onNavigateEpics}
              className="mt-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ background: "#4338CA", fontFamily: "Outfit, sans-serif" }}
            >
              Manage Epics
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="flex gap-4 overflow-hidden">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-shrink-0 w-72 sm:w-80">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="flex flex-col gap-2.5">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-20 bg-white rounded-xl animate-pulse" style={{ border: "1px solid #E5E3DC" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kanban board */}
        {!loading && visibleEpicKeys.length > 0 && (
          <DndContext
            sensors={sensors}
            onDragStart={(e) => {
              const issue = issues.find((i) => i.key === String(e.active.id))
              setDraggingIssue(issue ?? null)
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDraggingIssue(null)}
          >
            <div className="flex gap-4 pb-4" style={{ minWidth: "min-content" }}>
              {visibleColumns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  color={col.color}
                  issues={issuesForColumn(col.id)}
                  onNewTask={() => setNewTaskConfig({
                    columnId: col.id,
                    assigneeName: activeTab !== "Unassigned" ? activeTab : undefined,
                  })}
                  onEditTask={setEditingIssue}
                />
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {draggingIssue && (
                <div className="rotate-1 scale-105 opacity-95 pointer-events-none">
                  <TaskCard issue={draggingIssue} onEdit={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      {/* Modals */}
      {newTaskConfig && (
        <NewTaskModal
          defaultColumnId={newTaskConfig.columnId}
          defaultAssigneeName={newTaskConfig.assigneeName}
          epics={visibleEpics.length > 0 ? visibleEpics : epics}
          onClose={() => setNewTaskConfig(null)}
          onCreated={() => { setNewTaskConfig(null); loadTasks() }}
        />
      )}

      {editingIssue && (
        <EditTaskModal
          issue={editingIssue}
          epics={epics}
          onClose={() => setEditingIssue(null)}
          onUpdated={() => { setEditingIssue(null); loadTasks() }}
        />
      )}
    </div>
  )
}
