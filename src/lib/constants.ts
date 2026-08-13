export const JIRA_PROJECT_KEY = import.meta.env.VITE_JIRA_PROJECT_KEY || "DSR"
export const ATLASSIAN_CLIENT_ID =
  import.meta.env.VITE_ATLASSIAN_CLIENT_ID || "c1xdjQT50661oOVece2l4GhSRf92nNss"
export const ATLASSIAN_CLIENT_SECRET =
  import.meta.env.VITE_ATLASSIAN_CLIENT_SECRET ||
  "ATOA6UN-h2SC5jFSe2glZCMxlM-UXwFdzOvdsY47xN9gHCaADCBo3z7WFiAhUP1LRvV07E1E475C"
export const ATLASSIAN_REDIRECT_URI =
  import.meta.env.VITE_ATLASSIAN_REDIRECT_URI || "https://roastroom.figma.site"

export const COLUMNS = [
  { id: "todo", label: "To Do", color: "#78716C" },
  { id: "inprogress", label: "In Progress", color: "#571541" },
  { id: "done", label: "Done", color: "#059669" },
  { id: "blocked", label: "Blocked", color: "#DC2626" },
] as const

export type ColumnId = typeof COLUMNS[number]["id"]

export const STATUS_TO_COLUMN: Record<string, ColumnId> = {
  "To Do": "todo",
  Open: "todo",
  Backlog: "todo",
  "Selected for Development": "todo",
  Reopened: "todo",
  "In Progress": "inprogress",
  "In Development": "inprogress",
  "In Review": "inprogress",
  "On Hold": "todo",
  Paused: "todo",
  Waiting: "todo",
  Done: "done",
  Resolved: "done",
  Closed: "done",
  Completed: "done",
  Blocked: "blocked",
  Impediment: "blocked",
}

export const COLUMN_STATUS_NAMES: Record<ColumnId, string[]> = {
  todo: ["To Do", "Open", "Backlog"],
  inprogress: ["In Progress"],
  done: ["Done"],
  blocked: ["Blocked"],
}
