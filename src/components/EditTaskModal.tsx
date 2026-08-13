import { useState, useEffect } from "react"
import { ModalShell } from "./NewTaskModal"
import {
  updateIssue,
  deleteIssue,
  getAssignableUsers,
  extractDescription,
  type JiraIssue,
  type JiraUser,
  type JiraEpic,
} from "../lib/jira"
import { STATUS_TO_COLUMN, type ColumnId, COLUMNS } from "../lib/constants"
import SearchableSelect, { type SelectOption } from "./SearchableSelect"

interface Props {
  issue: JiraIssue
  epics: JiraEpic[]
  onClose: () => void
  onUpdated: () => void
  onDeleted?: () => void
}

export default function EditTaskModal({
  issue,
  epics,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [users, setUsers] = useState<JiraUser[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    summary: issue.fields.summary,
    description: extractDescription(issue.fields.description),
    epicKey: issue.fields.parent?.key ?? "",
    assigneeAccountId: issue.fields.assignee?.accountId ?? "",
    issuetype: issue.fields.issuetype.name,
    status:
      STATUS_TO_COLUMN[issue.fields.status.name] as ColumnId ??
      "todo" as ColumnId,
    dueDate: issue.fields.duedate ?? "",
  })

  useEffect(() => {
    getAssignableUsers().then(setUsers)
  }, [])

  function searchAssignees(query: string) {
    getAssignableUsers(query).then(setUsers)
  }

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleDelete() {
    setDeleting(true)
    setError("")
    try {
      await deleteIssue(issue.key)
      onDeleted ? onDeleted() : onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task")
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      await updateIssue(issue.key, {
        summary: form.summary.trim(),
        description: form.description.trim() || undefined,
        epicKey: form.epicKey || undefined,
        assigneeAccountId: form.assigneeAccountId || null,
        issuetype: form.issuetype,
        dueDate: form.dueDate || null,
      })
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task")
      setSaving(false)
    }
  }

  const epicOptions: SelectOption[] = epics.map((e) => ({
    value: e.key,
    label: `${e.key} – ${e.fields.summary}`,
  }))
  const assigneeOptions: SelectOption[] = users.map((u) => ({
    value: u.accountId,
    label: u.displayName,
  }))

  const keyTag = (
    <a
      href={`https://plumhq.atlassian.net/browse/${issue.key}`}
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
      {issue.key} ↗
    </a>
  )

  return (
    <ModalShell title="Edit task" onClose={onClose} topRight={keyTag}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "#FEF2F2", color: "#DC2626" }}
          >
            {error}
          </p>
        )}

        <Field label="Name" required>
          <input
            autoFocus
            required
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            className="field-input"
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="More detail, optional"
            className="field-input resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Epic">
            <SearchableSelect
              options={epicOptions}
              value={form.epicKey}
              onChange={(v) => set("epicKey", v)}
              placeholder="Search epics…"
              emptyLabel="No epic"
            />
          </Field>

          <Field label="Assignee">
            <SearchableSelect
              options={assigneeOptions}
              value={form.assigneeAccountId}
              onChange={(v) => set("assigneeAccountId", v)}
              onSearch={searchAssignees}
              placeholder="Search people…"
              emptyLabel="Unassigned"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="field-input"
            >
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Due Date">
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className="field-input"
            />
          </Field>
        </div>

        <div className="flex items-center gap-2 pt-2">
          {/* Delete button */}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-colors hover:bg-red-50"
            style={{ border: "1.5px solid #FECACA", color: "#DC2626" }}
            title="Delete task"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M5.5 1.5h4M2 3.5h11M4 3.5l.7 8.5a1 1 0 001 .9h3.6a1 1 0 001-.9L11 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.summary.trim()}
            className="btn-primary flex-1"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            style={{ background: "rgba(31,36,48,0.55)", backdropFilter: "blur(4px)" }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full"
              style={{ border: "1px solid #E5E3DC" }}
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-full mx-auto mb-4" style={{ background: "#FEF2F2" }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 7v4M10 13h.01M9 2.5l-7 12A1 1 0 003 16h14a1 1 0 00.87-1.5l-7-12a1 1 0 00-1.74 0z" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-base font-semibold text-center mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#2B211D" }}>
                Delete this task?
              </h3>
              <p className="text-sm text-center mb-5" style={{ color: "#78716C" }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{issue.key}</span> will be permanently deleted from Jira. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="btn-ghost flex-1"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ background: "#DC2626", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </ModalShell>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "#78716C" }}>
        {label}
        {required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
    </div>
  )
}
