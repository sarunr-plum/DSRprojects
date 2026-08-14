import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { JiraIssue } from "../lib/jira"

interface Props {
  issue: JiraIssue
  onEdit: (issue: JiraIssue) => void
  isNew?: boolean
}

function dueDateStyle(
  duedate: string,
): { label: string; color: string; bg: string } {
  const due = new Date(duedate)
  const now = new Date()
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  const label = due.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
  if (diffDays < 0) return { label, color: "var(--danger)", bg: "var(--danger-wash)" }
  if (diffDays <= 3) return { label, color: "var(--warn)", bg: "var(--warn-wash)" }
  return { label, color: "var(--ink-soft)", bg: "var(--surface-sunk)" }
}

export default function TaskCard({ issue, onEdit, isNew }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: issue.key,
      data: { issue },
    })

  const epicName = issue.fields.parent?.fields.summary ?? ""
  const duedate = issue.fields.duedate
  const due = duedate ? dueDateStyle(duedate) : null

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onEdit(issue)}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      className={`card card-interactive group px-4 py-3.5 select-none${
        isNew ? " task-card-enter" : ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onEdit(issue)}
    >
      {/* Summary */}
      <p
        className="text-[15px] font-semibold leading-snug mb-3"
        style={{ color: "var(--ink)", letterSpacing: "-0.01em" }}
      >
        {issue.fields.summary}
      </p>

      {/* Key + Epic */}
      <p className="t-key text-[11px] truncate" style={{ color: "var(--ink-faint)" }}>
        <a
          href={`https://plumhq.atlassian.net/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
          style={{ color: "var(--ink)" }}
        >
          {issue.key}
        </a>
        {epicName && <span> | {epicName}</span>}
      </p>

      {/* Due date */}
      {due && (
        <span
          className="t-meta inline-block mt-2.5 px-2 py-1 rounded-full"
          style={{ background: due.bg, color: due.color }}
        >
          Due {due.label}
        </span>
      )}
    </div>
  )
}
