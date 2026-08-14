import type { JiraEpic } from "./jira"

export interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  cloud_id: string
}

export function getStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem("dsr_tokens")
    if (!raw) return null
    return JSON.parse(raw) as StoredTokens
  } catch {
    return null
  }
}

export function setStoredTokens(tokens: StoredTokens): void {
  localStorage.setItem("dsr_tokens", JSON.stringify(tokens))
}

export function clearStoredTokens(): void {
  localStorage.removeItem("dsr_tokens")
}

export function getEpicVisibility(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("dsr_epic_visibility")
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function setEpicVisible(epicKey: string, visible: boolean): void {
  const current = getEpicVisibility()
  current[epicKey] = visible
  localStorage.setItem("dsr_epic_visibility", JSON.stringify(current))
}

export function getVisibleEpicKeys(): string[] {
  const visibility = getEpicVisibility()
  return Object.entries(visibility)
    .filter(([, v]) => v)
    .map(([k]) => k)
}

export function initDefaultVisibility(epics: JiraEpic[]): void {
  const existing = localStorage.getItem("dsr_epic_visibility")
  if (existing) return // already initialised — don't overwrite user choices
  const visibility: Record<string, boolean> = {}
  epics.forEach((e) => {
    visibility[e.key] = e.fields.status.name === "In Progress"
  })
  localStorage.setItem("dsr_epic_visibility", JSON.stringify(visibility))
}

export interface EpicFilters {
  status: string[]
  assignee: string[]
}

const EPIC_FILTERS_KEY = "dsr_epic_filters"

// Whether filters have ever been saved before — used to decide whether it's
// safe to apply a first-run default (e.g. defaulting assignee to the current
// user) without clobbering something the user already chose or cleared.
export function hasStoredEpicFilters(): boolean {
  return localStorage.getItem(EPIC_FILTERS_KEY) !== null
}

export function getEpicFilters(): EpicFilters {
  try {
    const raw = localStorage.getItem(EPIC_FILTERS_KEY)
    if (!raw) return { status: [], assignee: [] }
    const parsed = JSON.parse(raw) as Partial<EpicFilters>
    return {
      status: Array.isArray(parsed.status) ? parsed.status : [],
      assignee: Array.isArray(parsed.assignee) ? parsed.assignee : [],
    }
  } catch {
    return { status: [], assignee: [] }
  }
}

export function setEpicFilters(filters: EpicFilters): void {
  localStorage.setItem(EPIC_FILTERS_KEY, JSON.stringify(filters))
}
