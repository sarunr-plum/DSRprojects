import { useState, useEffect } from "react"
import type { ColumnId } from "../lib/constants"
import { COLUMNS } from "../lib/constants"
import { createIssue, getAssignableUsers, type JiraUser, type JiraEpic } from "../lib/jira"
import SearchableSelect, { type SelectOption } from "./SearchableSelect"

interface Props {
  defaultColumnId: ColumnId
  defaultAssigneeName?: string
  epics: JiraEpic[]
  onClose: () => void
  onCreated: () => void
}

export default function NewTaskModal({ defaultColumnId, defaultAssigneeName, epics, onClose, onCreated }: Props) {
  const [users, setUsers] = useState<JiraUser[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const defaultCol = COLUMNS.find((c) => c.id === defaultColumnId) ?? COLUMNS[0]

  const [form, setForm] = useState({
    summary: "",
    description: "",
    epicKey: epics[0]?.key ?? "",
    assigneeAccountId: "",
    status: defaultCol.label,
    issuetype: "Task",
    dueDate: "",
  })

  useEffect(() => {
    getAssignableUsers().then((u) => {
      setUsers(u)
      if (defaultAssigneeName) {
        const match = u.find((x) => x.displayName === defaultAssigneeName)
        if (match) setForm((f) => ({ ...f, assigneeAccountId: match.accountId }))
      }
    })
  }, [defaultAssigneeName])

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.summary.trim()) return
    setSaving(true)
    setError("")
    try {
      await createIssue({
        summary: form.summary.trim(),
        description: form.description.trim() || undefined,
        issuetype: form.issuetype,
        assigneeAccountId: form.assigneeAccountId || undefined,
        epicKey: form.epicKey || undefined,
        dueDate: form.dueDate || undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task")
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

  return (
    <ModalShell title="New task" onClose={onClose}>
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
            placeholder="What needs to be done?"
            className="field-input"
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={3}
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

          <Field label="Type">
            <select value={form.issuetype} onChange={(e) => set("issuetype", e.target.value)} className="field-input">
              <option>Task</option>
              <option>Story</option>
              <option>Bug</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee">
            <SearchableSelect
              options={assigneeOptions}
              value={form.assigneeAccountId}
              onChange={(v) => set("assigneeAccountId", v)}
              placeholder="Search people…"
              emptyLabel="Unassigned"
            />
          </Field>

          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field-input">
              {COLUMNS.map((c) => (
                <option key={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Due Date">
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            className="field-input"
          />
        </Field>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving || !form.summary.trim()} className="btn-primary flex-1">
            {saving ? "Creating…" : "Create task"}
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

export function ModalShell({
  title,
  onClose,
  children,
  topRight,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  topRight?: React.ReactNode
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(31,36,48,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl overflow-y-auto"
        style={{ maxHeight: "90vh", border: "1px solid #E5E3DC" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #F0EFE9" }}>
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-base" style={{ fontFamily: "Outfit, sans-serif", color: "#1F2430" }}>
              {title}
            </h2>
            {topRight}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            style={{ color: "#6B7280" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>

        {/* iOS safe area */}
        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      </div>
    </div>
  )
}

/* Shared field styles injected via className */
const fieldStyles = `
  .field-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.625rem;
    border: 1.5px solid #E5E3DC;
    background: #FAFAF8;
    font-size: 0.875rem;
    color: #1F2430;
    outline: none;
    font-family: Inter, sans-serif;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .field-input:focus {
    border-color: #4338CA;
    background: white;
  }
  .btn-primary {
    padding: 0.625rem 1.25rem;
    border-radius: 9999px;
    background: #4338CA;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: Outfit, sans-serif;
    transition: background 0.15s;
    cursor: pointer;
  }
  .btn-primary:hover:not(:disabled) { background: #3730A3; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost {
    padding: 0.625rem 1.25rem;
    border-radius: 9999px;
    border: 1.5px solid #E5E3DC;
    background: transparent;
    color: #6B7280;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: Outfit, sans-serif;
    transition: background 0.15s;
    cursor: pointer;
  }
  .btn-ghost:hover { background: #F6F5F0; }
`

if (typeof document !== "undefined" && !document.getElementById("dsr-modal-styles")) {
  const style = document.createElement("style")
  style.id = "dsr-modal-styles"
  style.textContent = fieldStyles
  document.head.appendChild(style)
}
