import { useState, useEffect } from "react"
import { ModalShell } from "./NewTaskModal"
import { updateIssue, getAssignableUsers, extractDescription, type JiraIssue, type JiraUser, type JiraEpic } from "../lib/jira"
import { STATUS_TO_COLUMN, type ColumnId, COLUMNS } from "../lib/constants"
import SearchableSelect, { type SelectOption } from "./SearchableSelect"

interface Props {
  issue: JiraIssue
  epics: JiraEpic[]
  onClose: () => void
  onUpdated: () => void
}

export default function EditTaskModal({ issue, epics, onClose, onUpdated }: Props) {
  const [users, setUsers] = useState<JiraUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    summary: issue.fields.summary,
    description: extractDescription(issue.fields.description),
    epicKey: issue.fields.parent?.key ?? "",
    assigneeAccountId: issue.fields.assignee?.accountId ?? "",
    issuetype: issue.fields.issuetype.name,
    status: (STATUS_TO_COLUMN[issue.fields.status.name] as ColumnId) ?? ("todo" as ColumnId),
    dueDate: issue.fields.duedate ?? "",
  })

  useEffect(() => {
    getAssignableUsers().then(setUsers)
  }, [])

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
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
        fontFamily: "JetBrains Mono, monospace",
        color: "#4338CA",
        background: "#EEF2FF",
        border: "1px solid #C7D2FE",
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
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "#FEF2F2", color: "#DC2626" }}>
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
              placeholder="Search people…"
              emptyLabel="Unassigned"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field-input">
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
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

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.summary.trim()} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "#6B7280" }}>
        {label}
        {required && <span style={{ color: "#DC2626" }}> *</span>}
      </label>
      {children}
    </div>
  )
}
