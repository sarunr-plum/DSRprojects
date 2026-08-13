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
import {
  getTasksForEpics,
  transitionToStatus,
  getCurrentUser,
  type JiraIssue,
  type JiraEpic,
} from "../lib/jira"
import { getVisibleEpicKeys } from "../lib/storage"
import {
  COLUMNS,
  STATUS_TO_COLUMN,
  COLUMN_STATUS_NAMES,
  type ColumnId,
} from "../lib/constants"
import KanbanColumn from "../components/KanbanColumn"
import TaskCard from "../components/TaskCard"
import NewTaskModal from "../components/NewTaskModal"
import EditTaskModal from "../components/EditTaskModal"

interface Props {
  onGoToProjects: () => void
  onRegisterRefresh: (fn: () => void) => void
  epics: JiraEpic[]
}

type NewTaskConfig = { columnId: ColumnId; assigneeName?: string }

export default function BoardPage({
  onGoToProjects,
  onRegisterRefresh,
  epics,
}: Props) {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<string>("")
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [userResolved, setUserResolved] = useState(false)
  const [newTaskConfig, setNewTaskConfig] = useState<NewTaskConfig | null>(null)
  const [editingIssue, setEditingIssue] = useState<JiraIssue | null>(null)
  const [draggingIssue, setDraggingIssue] = useState<JiraIssue | null>(null)
  const [newIssueKeys, setNewIssueKeys] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  // `opts.silent` skips the loading skeleton/error UI for background refreshes.
  // `opts.keepKeys` preserves those issues locally if the server response doesn't
  // include them yet — Jira's search index can lag a moment behind a fresh write.
  const loadTasks = useCallback(
    async (opts?: { silent?: boolean; keepKeys?: string[] }) => {
      if (!opts?.silent) {
        setLoading(true)
        setError("")
      }
      try {
        const epicKeys = getVisibleEpicKeys()
        if (epicKeys.length === 0) {
          setIssues([])
          return
        }
        const tasks = await getTasksForEpics(epicKeys)
        setIssues((prev) => {
          if (!opts?.keepKeys?.length) return tasks
          const stillMissing = prev.filter(
            (p) =>
              opts.keepKeys!.includes(p.key) &&
              !tasks.some((t) => t.key === p.key),
          )
          return stillMissing.length ? [...stillMissing, ...tasks] : tasks
        })
      } catch (err) {
        if (!opts?.silent)
          setError(err instanceof Error ? err.message : "Failed to load tasks")
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    onRegisterRefresh(() => loadTasks())
  }, [loadTasks, onRegisterRefresh])

  function handleTaskCreated(issue: JiraIssue) {
    setNewTaskConfig(null)
    setIssues((prev) => [issue, ...prev])
    setNewIssueKeys((prev) => new Set(prev).add(issue.key))
    setTimeout(() => {
      setNewIssueKeys((prev) => {
        const next = new Set(prev)
        next.delete(issue.key)
        return next
      })
    }, 600)
    // Reconcile with Jira in the background, without dropping the card if the
    // search index hasn't caught up yet.
    setTimeout(() => loadTasks({ silent: true, keepKeys: [issue.key] }), 1500)
    setTimeout(() => loadTasks({ silent: true, keepKeys: [issue.key] }), 4000)
  }

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUserName(u?.displayName ?? null))
      .catch(() => setCurrentUserName(null))
      .finally(() => setUserResolved(true))
  }, [])

  // Derive people tabs from loaded issues, then pin the logged-in user's tab first.
  const sortedPeople = Array.from(
    new Set(issues.map((i) => i.fields.assignee?.displayName ?? "Unassigned")),
  ).sort((a, b) =>
    a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
  )
  const people =
    currentUserName && sortedPeople.includes(currentUserName)
      ? [currentUserName, ...sortedPeople.filter((p) => p !== currentUserName)]
      : sortedPeople

  useEffect(() => {
    if (!userResolved || people.length === 0) return
    if (activeTab && people.includes(activeTab)) return
    setActiveTab(
      currentUserName && people.includes(currentUserName)
        ? currentUserName
        : people[0],
    )
  }, [people, activeTab, currentUserName, userResolved])

  // Issues for the active person tab
  const tabIssues = issues.filter((i) =>
    activeTab === "Unassigned"
      ? !i.fields.assignee
      : i.fields.assignee?.displayName === activeTab,
  )

  // Only render columns that have tasks, but always show todo + inprogress
  const activeColumnIds = new Set([
    "todo" as ColumnId,
    "inprogress" as ColumnId,
    ...tabIssues.map(
      (i) => STATUS_TO_COLUMN[i.fields.status.name] ?? "todo" as ColumnId,
    ),
  ])
  const visibleColumns = COLUMNS.filter((c) => activeColumnIds.has(c.id))

  function issuesForColumn(colId: ColumnId) {
    return tabIssues
      .filter((i) => {
        const mapped = STATUS_TO_COLUMN[i.fields.status.name]
        return mapped === colId || (!mapped && colId === "todo")
      })
      .sort((a, b) => {
        if (!a.fields.duedate && !b.fields.duedate) return 0
        if (!a.fields.duedate) return 1
        if (!b.fields.duedate) return -1
        return a.fields.duedate.localeCompare(b.fields.duedate)
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
          ? {
              ...i,
              fields: {
                ...i.fields,
                status: { id: "", name: targetStatusNames[0] },
              },
            }
          : i,
      ),
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
    <>
      {/* Person tabs */}
      {people.length > 0 && (
        <div
          className="flex gap-1 px-4 sm:px-6 py-2 overflow-x-auto"
          style={{ borderBottom: "1px solid #E5E3DC", scrollbarWidth: "none" }}
        >
          {people.map((person) => (
            <button
              key={person}
              onClick={() => setActiveTab(person)}
              className="flex-shrink-0 text-sm px-4 py-1.5 rounded-full transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: activeTab === person ? 600 : 400,
                background: activeTab === person ? "#2B211D" : "transparent",
                color: activeTab === person ? "white" : "#78716C",
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
            style={{
              background: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FECACA",
            }}
          >
            {error}{" "}
            <button onClick={() => loadTasks()} className="underline">
              Try again
            </button>
          </div>
        )}

        {/* No epics enabled */}
        {!loading && visibleEpicKeys.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: "#F5E9EF" }}
            >
              <span className="text-2xl">🗂️</span>
            </div>
            <p
              className="text-base font-semibold"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#2B211D" }}
            >
              No projects enabled
            </p>
            <p className="text-sm max-w-xs" style={{ color: "#78716C" }}>
              Head to Projects and toggle on the ones you want to track.
            </p>
            <button
              onClick={onGoToProjects}
              className="mt-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
              style={{
                background: "#571541",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Manage Projects
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
                    <div
                      key={i}
                      className="h-20 bg-white rounded-xl animate-pulse"
                      style={{ border: "1px solid #E5E3DC" }}
                    />
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
            <div
              className="flex gap-4 pb-4"
              style={{ minWidth: "min-content" }}
            >
              {visibleColumns.map((col) => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  color={col.color}
                  issues={issuesForColumn(col.id)}
                  onNewTask={() =>
                    setNewTaskConfig({
                      columnId: col.id,
                      assigneeName:
                        activeTab !== "Unassigned" ? activeTab : undefined,
                    })
                  }
                  onEditTask={setEditingIssue}
                  newIssueKeys={newIssueKeys}
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
          onCreated={handleTaskCreated}
        />
      )}

      {editingIssue && (
        <EditTaskModal
          issue={editingIssue}
          epics={epics}
          onClose={() => setEditingIssue(null)}
          onUpdated={() => {
            setEditingIssue(null)
            loadTasks()
          }}
        />
      )}
    </>
  )
}
