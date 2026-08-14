import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import type { JiraIssue } from "../lib/jira"
import TaskCard from "./TaskCard"

interface Props {
  id: string
  label: string
  color: string
  issues: JiraIssue[]
  onNewTask: () => void
  onEditTask: (issue: JiraIssue) => void
  newIssueKeys?: Set<string>
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 8L4 12L8 16" />
      <path d="M16 8L20 12L16 16" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  )
}

export default function KanbanColumn({
  id,
  label,
  color,
  issues,
  onNewTask,
  onEditTask,
  newIssueKeys,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <div className="flex flex-col flex-shrink-0 w-16 self-start">
        <div
          ref={setNodeRef}
          role="button"
          tabIndex={0}
          onClick={() => setCollapsed(false)}
          onKeyDown={(e) => e.key === "Enter" && setCollapsed(false)}
          className="card card-interactive flex flex-col items-center gap-3 py-4"
          style={{
            background: isOver ? "rgb(var(--accent-rgb) / 0.07)" : "var(--surface)",
            boxShadow: isOver ? "0 0 0 2px var(--accent)" : undefined,
          }}
          title={`Expand ${label}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span
            className="t-meta"
            style={{ color: "var(--ink)", writingMode: "vertical-rl" }}
          >
            {label}
          </span>
          <span
            className="t-key text-[11px] px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--track)", color: "var(--ink-soft)" }}
          >
            {issues.length}
          </span>
          <span
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full"
            style={{ background: "var(--track)", color: "var(--ink-soft)" }}
          >
            <SwapIcon className="w-4 h-4" />
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-shrink-0 w-[19.8rem] sm:w-[22rem]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-4 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span className="t-meta truncate" style={{ color: "var(--ink)" }}>
            {label}
          </span>
          <span
            className="t-key text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "var(--track)", color: "var(--ink-soft)" }}
          >
            {issues.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-[var(--surface)] active:scale-90"
            style={{ color: "var(--ink-soft)" }}
            title={`Collapse ${label}`}
          >
            <SwapIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNewTask}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-[var(--surface)] hover:text-[var(--accent)] active:scale-90 text-lg leading-none"
            style={{ color: "var(--ink-soft)" }}
            title={`New task in ${label}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-3 flex-1 min-h-24 p-2 rounded-2xl transition-colors"
        style={{
          background: isOver ? "rgb(var(--accent-rgb) / 0.07)" : "transparent",
          border: `1.5px dashed ${isOver ? "var(--accent)" : "transparent"}`,
        }}
      >
        {issues.map((issue, i) => (
          <div
            key={issue.key}
            className="rise-in"
            style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
          >
            <TaskCard
              issue={issue}
              onEdit={onEditTask}
              isNew={newIssueKeys?.has(issue.key)}
            />
          </div>
        ))}
        {issues.length === 0 && !isOver && (
          <div
            className="flex-1 flex items-center justify-center rounded-xl py-10 t-meta"
            style={{ color: "var(--ink-ghost)", border: "1.5px dashed var(--line)" }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
