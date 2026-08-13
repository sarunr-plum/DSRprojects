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
          className="flex flex-col items-center gap-3 py-3 rounded-2xl bg-white transition-colors cursor-pointer"
          style={{
            border: `1.5px dashed ${isOver ? "#571541" : "#E5E3DC"}`,
            background: isOver ? "rgba(87,21,65,0.06)" : "white",
          }}
          title={`Expand ${label}`}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "#2B211D",
              writingMode: "vertical-rl",
            }}
          >
            {label}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "#F0EFE9", color: "#78716C" }}
          >
            {issues.length}
          </span>
          <span
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full"
            style={{ background: "#EFEDE6", color: "#78716C" }}
          >
            <SwapIcon className="w-4 h-4" />
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-shrink-0 w-72 sm:w-80">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#2B211D" }}
          >
            {label}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "#F0EFE9", color: "#78716C" }}
          >
            {issues.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white"
            style={{ color: "#78716C" }}
            title={`Collapse ${label}`}
          >
            <SwapIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onNewTask}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white text-lg leading-none"
            style={{ color: "#78716C" }}
            title={`New task in ${label}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2.5 flex-1 min-h-24 p-2 rounded-2xl transition-colors"
        style={{
          background: isOver ? "rgba(87,21,65,0.06)" : "transparent",
          border: `1.5px dashed ${isOver ? "#571541" : "transparent"}`,
        }}
      >
        {issues.map((issue) => (
          <TaskCard
            key={issue.key}
            issue={issue}
            onEdit={onEditTask}
            isNew={newIssueKeys?.has(issue.key)}
          />
        ))}
        {issues.length === 0 && !isOver && (
          <div
            className="flex-1 flex items-center justify-center rounded-xl py-8 text-xs"
            style={{ color: "#C4C0B6" }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
