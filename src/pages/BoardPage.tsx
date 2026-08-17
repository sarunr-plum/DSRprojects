import { useState, useEffect, useCallback, useMemo } from "react"
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
  type JiraUser,
} from "../lib/jira"
import { getVisibleEpicKeys, getCachedTasks, setCachedTasks } from "../lib/storage"
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
import Logo from "../components/Logo"

interface Props {
  onGoToProjects: () => void
  onRegisterRefresh: (fn: () => void) => void
  epics: JiraEpic[]
}

type NewTaskConfig = { columnId: ColumnId; assigneeName?: string }

const UNASSIGNED_ID = "__unassigned__"

export default function BoardPage({
  onGoToProjects,
  onRegisterRefresh,
  epics,
}: Props) {
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<string>("")
  const [currentUser, setCurrentUser] = useState<JiraUser | null>(null)
  const [userResolved, setUserResolved] = useState(false)
  const [newTaskConfig, setNewTaskConfig] = useState<NewTaskConfig | null>(null)
  const [editingIssue, setEditingIssue] = useState<JiraIssue | null>(null)
  const [draggingIssue, setDraggingIssue] = useState<JiraIssue | null>(null)
  const [newIssueKeys, setNewIssueKeys] = useState<Set<string>>(new Set())
  const [justDoneKeys, setJustDoneKeys] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const loadTasks = useCallback(
    async (opts?: { silent?: boolean; keepKeys?: string[] }) => {
      const epicKeys = getVisibleEpicKeys()
      if (epicKeys.length === 0) {
        setIssues([])
        setLoading(false)
        return
      }

      // On non-silent loads, serve from cache immediately then refresh in background
      if (!opts?.silent) {
        const cached = getCachedTasks()
        if (cached) {
          setIssues(cached)
          setLoading(false)
          // Background refresh
          getTasksForEpics(epicKeys)
            .then((tasks) => {
              setCachedTasks(tasks)
              setIssues(tasks)
            })
            .catch(() => {})
          return
        }
        setLoading(true)
        setError("")
      }

      try {
        const tasks = await getTasksForEpics(epicKeys)
        setCachedTasks(tasks)
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
    setTimeout(() => loadTasks({ silent: true, keepKeys: [issue.key] }), 1500)
    setTimeout(() => loadTasks({ silent: true, keepKeys: [issue.key] }), 4000)
  }

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u))
      .catch(() => setCurrentUser(null))
      .finally(() => setUserResolved(true))
  }, [])

  // Build a stable map: accountId → displayName (using accountId as tab key
  // avoids displayName mismatch bugs, e.g. when a user's name changed in Jira).
  const peopleById = useMemo(() => {
    const map = new Map<string, string>()
    issues.forEach((i) => {
      if (i.fields.assignee) {
        map.set(i.fields.assignee.accountId, i.fields.assignee.displayName)
      } else {
        map.set(UNASSIGNED_ID, "Unassigned")
      }
    })
    return map
  }, [issues])

  // Sorted list of accountIds, current user pinned first
  const people = useMemo(() => {
    const ids = Array.from(peopleById.keys()).sort((a, b) => {
      if (a === UNASSIGNED_ID) return 1
      if (b === UNASSIGNED_ID) return -1
      return (peopleById.get(a) ?? "").localeCompare(peopleById.get(b) ?? "")
    })
    const currentId = currentUser?.accountId
    if (currentId && peopleById.has(currentId)) {
      return [currentId, ...ids.filter((id) => id !== currentId)]
    }
    return ids
  }, [peopleById, currentUser])

  useEffect(() => {
    if (!userResolved || people.length === 0) return
    if (activeTab && people.includes(activeTab)) return
    const currentId = currentUser?.accountId
    setActiveTab(
      currentId && people.includes(currentId) ? currentId : people[0],
    )
  }, [people, activeTab, currentUser, userResolved])

  // Filter issues by accountId — immune to displayName inconsistencies
  const tabIssues = issues.filter((i) =>
    activeTab === UNASSIGNED_ID
      ? !i.fields.assignee
      : i.fields.assignee?.accountId === activeTab,
  )

  // Always show todo + inprogress; add any other columns that have tasks
  const activeColumnIds = new Set([
    "todo" as ColumnId,
    "inprogress" as ColumnId,
    ...tabIssues.map(
      (i) => (STATUS_TO_COLUMN[i.fields.status.name] ?? "todo") as ColumnId,
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

    const currentIssue = issues.find((i) => i.key === issueKey)
    const wasInDone =
      (STATUS_TO_COLUMN[currentIssue?.fields.status.name ?? ""] ?? "todo") === "done"

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

    // Animate spark when moving into Done
    if (targetColId === "done" && !wasInDone) {
      setJustDoneKeys((prev) => new Set(prev).add(issueKey))
      setTimeout(() => {
        setJustDoneKeys((prev) => {
          const next = new Set(prev)
          next.delete(issueKey)
          return next
        })
      }, 850)
    }

    try {
      await transitionToStatus(issueKey, targetStatusNames)
    } catch {
      loadTasks()
    }
  }

  const visibleEpicKeys = getVisibleEpicKeys()
  const visibleEpics = epics.filter((e) => visibleEpicKeys.includes(e.key))

  // The skeleton width mirrors the typical 2-column initial view (todo + inprogress)
  // to avoid a jarring layout shift when content loads.
  const skeletonCols = COLUMNS.slice(0, 2)

  return (
    <>
      {/* Person tabs */}
      {people.length > 0 && (
        <div
          className="flex px-4 sm:px-8 lg:px-12 py-3 overflow-x-auto no-bar"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex gap-2 mx-auto">
            {people.map((accountId, i) => (
              <button
                key={accountId}
                onClick={() => setActiveTab(accountId)}
                className="t-meta flex-shrink-0 px-4 py-2 rounded-full whitespace-nowrap rise-in"
                style={{
                  animationDelay: `${Math.min(i, 10) * 25}ms`,
                  background:
                    activeTab === accountId ? "var(--ink)" : "transparent",
                  color:
                    activeTab === accountId ? "var(--bg)" : "var(--ink-soft)",
                  transition:
                    "background var(--t) var(--ease), color var(--t) var(--ease)",
                }}
              >
                {peopleById.get(accountId) ?? accountId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Board */}
      <main
        className="relative z-10 flex-1 overflow-auto px-4 sm:px-8 lg:px-12 py-8"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 32px)" }}
      >
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "var(--danger-wash)",
              color: "var(--danger)",
              border: "1px solid var(--danger-line)",
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
          <div className="flex flex-col items-center justify-center py-28 text-center gap-4 rise-in">
            <Logo size={72} />
            <p
              className="t-display text-3xl mt-2"
              style={{ color: "var(--ink)" }}
            >
              Nothing here yet
            </p>
            <p className="text-sm max-w-xs" style={{ color: "var(--ink-soft)" }}>
              Head to Projects and switch on the ones you want to track.
            </p>
            <button onClick={onGoToProjects} className="btn-primary mt-2">
              Manage Projects
            </button>
          </div>
        )}

        {/* Loading skeletons — width matches typical 2-column board to avoid jarring shift */}
        {loading && (
          <div className="flex gap-7 overflow-hidden w-fit mx-auto">
            {skeletonCols.map((col) => (
              <div key={col.id} className="flex-shrink-0 w-[19.8rem] sm:w-[22rem]">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2 h-2 rounded-full bg-[var(--track)] animate-pulse" />
                  <div className="h-4 w-20 rounded bg-[var(--track)] animate-pulse" />
                </div>
                <div className="flex flex-col gap-2.5">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 bg-[var(--surface)] rounded-xl animate-pulse"
                      style={{ border: "1px solid var(--line)" }}
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
              className="flex gap-7 pb-4 w-fit mx-auto"
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
                        activeTab !== UNASSIGNED_ID && activeTab
                          ? peopleById.get(activeTab)
                          : undefined,
                    })
                  }
                  onEditTask={setEditingIssue}
                  newIssueKeys={newIssueKeys}
                  justDoneKeys={justDoneKeys}
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

      {/* Floating add-task CTA */}
      {!loading && visibleEpicKeys.length > 0 && (
        <button
          onClick={() =>
            setNewTaskConfig({
              columnId: "todo",
              assigneeName:
                activeTab !== UNASSIGNED_ID && activeTab
                  ? peopleById.get(activeTab)
                  : undefined,
            })
          }
          className="btn-primary fixed z-40 left-1/2 -translate-x-1/2 shadow-lg"
          style={{
            bottom: "env(safe-area-inset-bottom, 24px)",
            marginBottom: "24px",
            padding: "1rem 2rem",
            fontSize: "1rem",
            boxShadow: "0 10px 24px -6px rgb(var(--ink-rgb) / 0.35)",
          }}
        >
          + ADD
        </button>
      )}

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
          onDeleted={() => {
            setEditingIssue(null)
            loadTasks()
          }}
        />
      )}
    </>
  )
}
