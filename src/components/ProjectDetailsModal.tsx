import { useState, useEffect, useRef } from "react"
import NewTaskModal, { ModalShell } from "./NewTaskModal"
import EditTaskModal from "./EditTaskModal"
import SearchableSelect, { type SelectOption } from "./SearchableSelect"
import {
  getTasksForEpics,
  updateEpicDates,
  updateEpicAssignee,
  getAssignableUsers,
  getTransitions,
  applyTransition,
  type JiraEpic,
  type JiraIssue,
  type JiraTransition,
  type JiraUser,
} from "../lib/jira"

interface Props {
  epic: JiraEpic
  onClose: () => void
  onDatesChanged: (
    epicKey: string,
    fields: { startDate?: string; dueDate?: string },
  ) => void
  onStatusChanged: (epicKey: string, status: { id: string; name: string }) => void
  onAssigneeChanged: (epicKey: string, assignee: JiraUser | null) => void
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

export default function ProjectDetailsModal({
  epic,
  onClose,
  onDatesChanged,
  onStatusChanged,
  onAssigneeChanged,
}: Props) {
  const [startDate, setStartDate] = useState(epic.fields.startDate ?? "")
  const [dueDate, setDueDate] = useState(epic.fields.duedate ?? "")
  const [savingField, setSavingField] =
    useState<"startDate" | "dueDate" | null>(null)
  const [dateError, setDateError] = useState("")

  const [currentStatus, setCurrentStatus] = useState(epic.fields.status.name)
  const [transitions, setTransitions] = useState<JiraTransition[]>([])
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState("")

  const [currentAssignee, setCurrentAssignee] = useState<JiraUser | undefined>(
    epic.fields.assignee,
  )
  const [assignableUsers, setAssignableUsers] = useState<JiraUser[]>([])
  const [assigneeSaving, setAssigneeSaving] = useState(false)
  const [assigneeError, setAssigneeError] = useState("")

  const [tasks, setTasks] = useState<JiraIssue[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState("")
  const [addingTask, setAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<JiraIssue | null>(null)

  function refetchTasks() {
    getTasksForEpics([epic.key])
      .then(setTasks)
      .catch(() => {})
  }

  useEffect(() => {
    getTasksForEpics([epic.key])
      .then(setTasks)
      .catch((err) =>
        setTasksError(
          err instanceof Error ? err.message : "Failed to load tasks",
        ),
      )
      .finally(() => setTasksLoading(false))
  }, [epic.key])

  useEffect(() => {
    getTransitions(epic.key)
      .then(setTransitions)
      .catch(() => setTransitions([]))
  }, [epic.key])

  useEffect(() => {
    getAssignableUsers().then((u) => {
      const current = epic.fields.assignee
      if (current && !u.find((x) => x.accountId === current.accountId)) {
        setAssignableUsers([current, ...u])
      } else {
        setAssignableUsers(u)
      }
    }).catch(() => {})
  }, [])

  async function handleStatusChange(transitionId: string) {
    const transition = transitions.find((t) => t.id === transitionId)
    if (!transition) return
    const prevStatus = currentStatus
    setCurrentStatus(transition.to.name)
    setStatusSaving(true)
    setStatusError("")
    try {
      await applyTransition(epic.key, transition.id)
      onStatusChanged(epic.key, { id: transition.to.id, name: transition.to.name })
      getTransitions(epic.key)
        .then(setTransitions)
        .catch(() => setTransitions([]))
    } catch (err) {
      setCurrentStatus(prevStatus)
      const message =
        err instanceof Error && err.message.includes("403")
          ? "You don't have permission to change this project's status in Jira."
          : "Failed to update status — please try again."
      setStatusError(message)
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleDateChange(
    field: "startDate" | "dueDate",
    value: string,
  ) {
    const prevStart = startDate
    const prevDue = dueDate
    if (field === "startDate") setStartDate(value)
    else setDueDate(value)
    setSavingField(field)
    setDateError("")
    try {
      await updateEpicDates(
        epic.key,
        field === "startDate"
          ? { startDate: value || null }
          : { dueDate: value || null },
      )
      onDatesChanged(
        epic.key,
        field === "startDate" ? { startDate: value } : { dueDate: value },
      )
    } catch (err) {
      if (field === "startDate") setStartDate(prevStart)
      else setDueDate(prevDue)
      const message =
        err instanceof Error && err.message.includes("403")
          ? "You don't have permission to change this project's dates in Jira."
          : err instanceof Error
            ? err.message
            : "Failed to save — please try again."
      setDateError(message)
    } finally {
      setSavingField(null)
    }
  }

  async function handleAssigneeChange(accountId: string) {
    const prevAssignee = currentAssignee
    const newUser = accountId ? assignableUsers.find((u) => u.accountId === accountId) ?? null : null
    setCurrentAssignee(newUser ?? undefined)
    setAssigneeSaving(true)
    setAssigneeError("")
    try {
      await updateEpicAssignee(epic.key, accountId || null)
      onAssigneeChanged(epic.key, newUser)
    } catch (err) {
      setCurrentAssignee(prevAssignee)
      const message =
        err instanceof Error && err.message.includes("403")
          ? "You don't have permission to change the assignee."
          : "Failed to update assignee — please try again."
      setAssigneeError(message)
    } finally {
      setAssigneeSaving(false)
    }
  }

  function searchAssignees(query: string) {
    getAssignableUsers(query).then(setAssignableUsers).catch(() => {})
  }

  const s = statusStyle(currentStatus)

  const assigneeOptions: SelectOption[] = assignableUsers.map((u) => ({
    value: u.accountId,
    label: u.displayName,
  }))

  const keyTag = (
    <a
      href={`https://plumhq.atlassian.net/browse/${epic.key}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-[var(--accent-wash)]"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        color: "var(--accent)",
        background: "var(--accent-wash)",
        textDecoration: "none",
      }}
    >
      {epic.key} ↗
    </a>
  )

  return (
    <ModalShell title={epic.fields.summary} onClose={onClose} topRight={keyTag} wide>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 flex-wrap">
          {transitions.length > 0 ? (
            <StatusDropdown
              currentStatus={currentStatus}
              style={s}
              transitions={transitions}
              disabled={statusSaving}
              onSelect={(t) => handleStatusChange(t.id)}
            />
          ) : (
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: s.bg, color: s.text }}
            >
              {currentStatus}
            </span>
          )}
        </div>

        {statusError && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--danger-wash)", color: "var(--danger)" }}
          >
            {statusError}
          </p>
        )}

        {dateError && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--danger-wash)", color: "var(--danger)" }}
          >
            {dateError}
          </p>
        )}

        {assigneeError && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--danger-wash)", color: "var(--danger)" }}
          >
            {assigneeError}
          </p>
        )}

        {/* Assignee + dates */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <div style={{ opacity: assigneeSaving ? 0.6 : 1, pointerEvents: assigneeSaving ? "none" : undefined }}>
              <SearchableSelect
                options={assigneeOptions}
                value={currentAssignee?.accountId ?? ""}
                onChange={handleAssigneeChange}
                onSearch={searchAssignees}
                placeholder="Search people…"
                emptyLabel="Unassigned"
              />
            </div>
          </Field>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              disabled={savingField === "startDate"}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="field-input"
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              disabled={savingField === "dueDate"}
              onChange={(e) => handleDateChange("dueDate", e.target.value)}
              className="field-input"
            />
          </Field>
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
              Tasks{!tasksLoading && !tasksError ? ` (${tasks.length})` : ""}
            </p>
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
              style={{
                color: "var(--accent)",
                background: "var(--accent-wash)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + Add
            </button>
          </div>

          {tasksLoading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl animate-pulse"
                  style={{ background: "var(--bg)" }}
                />
              ))}
            </div>
          )}

          {tasksError && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {tasksError}
            </p>
          )}

          {!tasksLoading && !tasksError && tasks.length === 0 && (
            <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
              No tasks under this project yet.
            </p>
          )}

          {!tasksLoading && tasks.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {tasks.map((t) => {
                const ts = statusStyle(t.fields.status.name)
                return (
                  <div
                    key={t.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingTask(t)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingTask(t)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors hover:bg-[var(--surface-sunk)] group"
                    style={{ border: "1px solid var(--line-soft)" }}
                  >
                    {/* Summary */}
                    <span
                      className="text-[15px] font-semibold flex-1 truncate"
                      style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
                    >
                      {t.fields.summary}
                    </span>

                    {/* Assignee — always visible */}
                    {t.fields.assignee && (
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {t.fields.assignee.displayName}
                      </span>
                    )}

                    {/* Status badge */}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={{ background: ts.bg, color: ts.text }}
                    >
                      {t.fields.status.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {addingTask && (
        <NewTaskModal
          defaultColumnId="todo"
          defaultAssigneeName={currentAssignee?.displayName}
          epics={[epic]}
          onClose={() => setAddingTask(false)}
          onCreated={(issue) => {
            setAddingTask(false)
            setTasks((prev) => [issue, ...prev])
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          issue={editingTask}
          epics={[epic]}
          onClose={() => setEditingTask(null)}
          onUpdated={() => {
            setEditingTask(null)
            refetchTasks()
          }}
          onDeleted={() => {
            setEditingTask(null)
            refetchTasks()
          }}
        />
      )}
    </ModalShell>
  )
}

function StatusDropdown({
  currentStatus,
  style,
  transitions,
  disabled,
  onSelect,
}: {
  currentStatus: string
  style: { bg: string; text: string }
  transitions: JiraTransition[]
  disabled: boolean
  onSelect: (transition: JiraTransition) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs pl-2.5 pr-2 py-1 rounded-full font-medium transition-opacity"
        style={{
          background: style.bg,
          color: style.text,
          fontFamily: "'DM Sans', sans-serif",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {currentStatus}
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className="flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 rounded-xl overflow-hidden pop-panel"
          style={{ minWidth: "170px" }}
        >
          {transitions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setOpen(false)
                onSelect(t)
              }}
              className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-sunk)]"
              style={{ color: "var(--ink)" }}
            >
              {t.to.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="t-meta" style={{ color: "var(--ink-soft)" }}>
        {label}
      </label>
      {children}
    </div>
  )
}
