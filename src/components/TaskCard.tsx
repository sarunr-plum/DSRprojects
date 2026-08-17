import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { JiraIssue } from "../lib/jira"
import { STATUS_TO_COLUMN } from "../lib/constants"

interface Props {
  issue: JiraIssue
  onEdit: (issue: JiraIssue) => void
  isNew?: boolean
  isJustDone?: boolean
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

export default function TaskCard({ issue, onEdit, isNew, isJustDone }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: issue.key,
      data: { issue },
    })

  const isDone = (STATUS_TO_COLUMN[issue.fields.status.name] ?? "todo") === "done"
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
        opacity: isDragging ? 0.4 : isDone ? 0.62 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      className={`card card-interactive group px-4 py-3.5 select-none relative${
        isNew ? " task-card-enter" : ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onEdit(issue)}
    >
      {isJustDone && <span className="done-spark-icon" aria-hidden>✦</span>}

      {/* Summary */}
      <div className="relative mb-3">
        <p
          className="text-[15px] font-semibold leading-snug"
          style={{
            color: isDone ? "var(--ink-faint)" : "var(--ink)",
            letterSpacing: "-0.01em",
            textDecoration: isDone && !isJustDone ? "line-through" : "none",
            textDecorationColor: "var(--ink-ghost)",
            textDecorationThickness: "1px",
          }}
        >
          {issue.fields.summary}
        </p>
        {isJustDone && (
          <span
            className="done-line-draw"
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: "100%",
              height: "1.5px",
              background: "var(--ink-ghost)",
              display: "block",
              marginTop: "-0.75px",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Key + Epic */}
      <p className="t-key text-[11px] truncate" style={{ color: "var(--ink-faint)" }}>
        <a
          href={`https://plumhq.atlassian.net/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
          style={{ color: isDone ? "var(--ink-ghost)" : "var(--ink)" }}
        >
          {issue.key}
        </a>
        {epicName && <span> | {epicName}</span>}
      </p>

      {/* Due date */}
      {due && !isDone && (
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
