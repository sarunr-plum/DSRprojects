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
}

export default function KanbanColumn({ id, label, color, issues, onNewTask, onEditTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col flex-shrink-0 w-72 sm:w-80">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: "Outfit, sans-serif", color: "#1F2430" }}
          >
            {label}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "#F0EFE9", color: "#6B7280" }}
          >
            {issues.length}
          </span>
        </div>
        <button
          onClick={onNewTask}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-white text-lg leading-none"
          style={{ color: "#6B7280" }}
          title={`New task in ${label}`}
        >
          +
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2.5 flex-1 min-h-24 p-2 rounded-2xl transition-colors"
        style={{
          background: isOver ? "rgba(67,56,202,0.06)" : "transparent",
          border: `1.5px dashed ${isOver ? "#4338CA" : "transparent"}`,
        }}
      >
        {issues.map((issue) => (
          <TaskCard key={issue.key} issue={issue} onEdit={onEditTask} />
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
