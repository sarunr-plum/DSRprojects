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
  if (diffDays < 0) return { label, color: "#DC2626", bg: "#FEF2F2" }
  if (diffDays <= 3) return { label, color: "#D97706", bg: "#FFFBEB" }
  return { label, color: "#78716C", bg: "#F5F3F0" }
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
      className={`group bg-white rounded-xl px-4 py-3 shadow-sm select-none transition-shadow hover:shadow-md${
        isNew ? " task-card-enter" : ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onEdit(issue)}
    >
      {/* Summary */}
      <p
        className="text-sm font-medium leading-snug mb-2.5"
        style={{ color: "#2B211D" }}
      >
        {issue.fields.summary}
      </p>

      {/* Key + Epic */}
      <p
        className="text-xs truncate mb-1.5"
        style={{ color: "#A8A29E", fontFamily: "'DM Sans', sans-serif" }}
      >
        <a
          href={`https://plumhq.atlassian.net/browse/${issue.key}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
          style={{ color: "#78716C" }}
        >
          {issue.key}
        </a>
        {epicName && (
          <span
            style={{ color: "#A8A29E", fontFamily: "'DM Sans', sans-serif" }}
          >
            {" "}
            | {epicName}
          </span>
        )}
      </p>

      {/* Due date */}
      {due && (
        <span
          className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: due.bg, color: due.color }}
        >
          Due {due.label}
        </span>
      )}
    </div>
  )
}
