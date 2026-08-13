import { useState, useEffect } from "react"
import NewTaskModal, { ModalShell } from "./NewTaskModal"
import {
  getTasksForEpics,
  updateEpicDates,
  type JiraEpic,
  type JiraIssue,
} from "../lib/jira"

interface Props {
  epic: JiraEpic
  onClose: () => void
  onDatesChanged: (
    epicKey: string,
    fields: { startDate?: string; dueDate?: string },
  ) => void
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "In Progress": { bg: "#F5E9EF", text: "#571541" },
  "To Do": { bg: "#F5F3F0", text: "#78716C" },
  Done: { bg: "#ECFDF5", text: "#059669" },
  Blocked: { bg: "#FEF2F2", text: "#DC2626" },
}

function statusStyle(name: string) {
  return STATUS_COLORS[name] ?? { bg: "#F5F3F0", text: "#78716C" }
}

export default function ProjectDetailsModal({
  epic,
  onClose,
  onDatesChanged,
}: Props) {
  const [startDate, setStartDate] = useState(epic.fields.startDate ?? "")
  const [dueDate, setDueDate] = useState(epic.fields.duedate ?? "")
  const [savingField, setSavingField] =
    useState<"startDate" | "dueDate" | null>(null)
  const [dateError, setDateError] = useState("")

  const [tasks, setTasks] = useState<JiraIssue[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState("")
  const [addingTask, setAddingTask] = useState(false)

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

  const s = statusStyle(epic.fields.status.name)

  const keyTag = (
    <a
      href={`https://plumhq.atlassian.net/browse/${epic.key}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-indigo-100"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        color: "#571541",
        background: "#F5E9EF",
        border: "1px solid #E3C4D3",
        textDecoration: "none",
      }}
    >
      {epic.key} ↗
    </a>
  )

  return (
    <ModalShell title={epic.fields.summary} onClose={onClose} topRight={keyTag}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: s.bg, color: s.text }}
          >
            {epic.fields.status.name}
          </span>
          {epic.fields.assignee && (
            <span className="text-xs" style={{ color: "#78716C" }}>
              Owner: {epic.fields.assignee.displayName}
            </span>
          )}
        </div>

        {dateError && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "#FEF2F2", color: "#DC2626" }}
          >
            {dateError}
          </p>
        )}

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

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: "#78716C" }}>
              Tasks{!tasksLoading && !tasksError ? ` (${tasks.length})` : ""}
            </p>
            <button
              type="button"
              onClick={() => setAddingTask(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
              style={{
                color: "#571541",
                background: "#F5E9EF",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              + Add
            </button>
          </div>

          {tasksLoading && (
            <div className="space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg animate-pulse"
                  style={{ background: "#FAF6F0" }}
                />
              ))}
            </div>
          )}

          {tasksError && (
            <p className="text-xs" style={{ color: "#DC2626" }}>
              {tasksError}
            </p>
          )}

          {!tasksLoading && !tasksError && tasks.length === 0 && (
            <p className="text-xs" style={{ color: "#A8A29E" }}>
              No tasks under this project yet.
            </p>
          )}

          {!tasksLoading && tasks.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {tasks.map((t) => {
                const ts = statusStyle(t.fields.status.name)
                return (
                  <a
                    key={t.key}
                    href={`https://plumhq.atlassian.net/browse/${t.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-50"
                    style={{ border: "1px solid #F0EFE9" }}
                  >
                    <span
                      className="text-xs flex-shrink-0"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        color: "#A8A29E",
                      }}
                    >
                      {t.key}
                    </span>
                    <span
                      className="text-xs flex-1 truncate"
                      style={{ color: "#2B211D" }}
                    >
                      {t.fields.summary}
                    </span>
                    {t.fields.assignee && (
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: "#A8A29E" }}
                      >
                        {t.fields.assignee.displayName}
                      </span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                      style={{ background: ts.bg, color: ts.text }}
                    >
                      {t.fields.status.name}
                    </span>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {addingTask && (
        <NewTaskModal
          defaultColumnId="todo"
          defaultAssigneeName={epic.fields.assignee?.displayName}
          epics={[epic]}
          onClose={() => setAddingTask(false)}
          onCreated={(issue) => {
            setAddingTask(false)
            setTasks((prev) => [issue, ...prev])
          }}
        />
      )}
    </ModalShell>
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
      <label className="text-xs font-medium" style={{ color: "#78716C" }}>
        {label}
      </label>
      {children}
    </div>
  )
}
