import { getValidToken } from "./auth"
import { clearStoredTokens } from "./storage"
import { JIRA_PROJECT_KEY } from "./constants"

export interface JiraUser {
  accountId: string
  displayName: string
  avatarUrls?: { "48x48": string }
}

export interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description?: unknown
    status: { id: string; name: string }
    issuetype: { id: string; name: string }
    assignee?: JiraUser
    parent?: { key: string; fields: { summary: string } }
    priority?: { name: string }
    duedate?: string
  }
}

export interface JiraEpic {
  id: string
  key: string
  fields: {
    summary: string
    status: { name: string }
    assignee?: JiraUser
    priority?: { name: string }
    duedate?: string
    startDate?: string
    created?: string
  }
}

export interface JiraTransition {
  id: string
  name: string
  to: { id: string; name: string }
}

function extractDescription(adf: unknown): string {
  if (!adf) return ""
  if (typeof adf === "string") return adf
  const node = adf as { text?: string; content?: unknown[] }
  if (node.text) return node.text
  if (Array.isArray(node.content)) {
    return node.content.map(extractDescription).filter(Boolean).join("\n")
  }
  return ""
}

export { extractDescription }

async function jiraFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const { token, cloudId } = await getValidToken()
  const base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  })

  if (res.status === 401) {
    clearStoredTokens()
    window.location.reload()
  }

  return res
}

function toAdf(text: string) {
  return {
    type: "doc",
    version: 1,
    content: text.split("\n\n").map((para) => ({
      type: "paragraph",
      content: para ? [{ type: "text", text: para }] : [],
    })),
  }
}

// Jira's "Start date" lives on a custom field whose ID varies per site
// (e.g. customfield_10015) — resolve it once by name and cache it.
let startDateFieldIdPromise: Promise<string | null> | null = null

export async function getStartDateFieldId(): Promise<string | null> {
  if (!startDateFieldIdPromise) {
    startDateFieldIdPromise = (async () => {
      const res = await jiraFetch("/field")
      if (!res.ok) return null
      const fields = (await res.json()) as { id: string; name: string }[]
      return (
        fields.find((f) => f.name.toLowerCase() === "start date")?.id ?? null
      )
    })()
  }
  return startDateFieldIdPromise
}

export async function getEpics(): Promise<JiraEpic[]> {
  const startDateField = await getStartDateFieldId()
  const fields = [
    "summary",
    "status",
    "assignee",
    "priority",
    "duedate",
    "created",
  ]
  if (startDateField) fields.push(startDateField)

  const jql = `project = ${JIRA_PROJECT_KEY} AND issuetype = Epic ORDER BY created DESC`
  const res = await jiraFetch("/search/jql", {
    method: "POST",
    body: JSON.stringify({ jql, fields, maxResults: 200 }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Jira API ${res.status}: ${body}`)
  }
  const data = await res.json()
  const issues = data.issues as {
    id: string
    key: string
    fields: Record<string, unknown>
  }[]

  return issues.map((issue) => ({
    id: issue.id,
    key: issue.key,
    fields: {
      ...issue.fields,
      startDate: startDateField
        ? issue.fields[startDateField] as string | undefined
        : undefined,
    },
  })) as JiraEpic[]
}

export async function updateEpicDates(
  key: string,
  fields: { startDate?: string | null; dueDate?: string | null },
): Promise<void> {
  const updateFields: Record<string, unknown> = {}
  if ("dueDate" in fields) updateFields.duedate = fields.dueDate || null
  if ("startDate" in fields) {
    const startDateField = await getStartDateFieldId()
    if (!startDateField)
      throw new Error('This Jira site has no "Start date" field configured.')
    updateFields[startDateField] = fields.startDate || null
  }
  if (Object.keys(updateFields).length === 0) return

  const res = await jiraFetch(`/issue/${key}`, {
    method: "PUT",
    body: JSON.stringify({ fields: updateFields }),
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.text()
    throw new Error(`Jira API ${res.status}: ${err}`)
  }
}

export async function getTasksForEpics(
  epicKeys: string[],
): Promise<JiraIssue[]> {
  if (epicKeys.length === 0) return []
  const keyList = epicKeys.map((k) => `"${k}"`).join(",")
  const jql = `project = ${JIRA_PROJECT_KEY} AND parent in (${keyList}) ORDER BY updated DESC`
  const res = await jiraFetch("/search/jql", {
    method: "POST",
    body: JSON.stringify({
      jql,
      fields: [
        "summary",
        "description",
        "status",
        "issuetype",
        "assignee",
        "parent",
        "priority",
        "duedate",
      ],
      maxResults: 500,
    }),
  })
  if (!res.ok) throw new Error("Failed to fetch tasks")
  const data = await res.json()
  return data.issues as JiraIssue[]
}

export async function createIssue(fields: {
  summary: string
  description?: string
  issuetype: string
  assigneeAccountId?: string
  epicKey?: string
  dueDate?: string
}): Promise<JiraIssue> {
  const body: Record<string, unknown> = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: fields.summary,
      issuetype: { name: fields.issuetype },
      ...(fields.description ? { description: toAdf(fields.description) } : {}),
      ...(fields.assigneeAccountId
        ? { assignee: { accountId: fields.assigneeAccountId } }
        : {}),
      ...(fields.epicKey ? { parent: { key: fields.epicKey } } : {}),
      ...(fields.dueDate ? { duedate: fields.dueDate } : {}),
    },
  }

  const res = await jiraFetch("/issue", {
    method: "POST",
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create issue: ${err}`)
  }
  const created = await res.json()
  return created as JiraIssue
}

export async function updateIssue(
  key: string,
  fields: {
    summary?: string
    description?: string
    assigneeAccountId?: string | null
    epicKey?: string
    issuetype?: string
    dueDate?: string | null
  },
): Promise<void> {
  const updateFields: Record<string, unknown> = {}
  if (fields.summary !== undefined) updateFields.summary = fields.summary
  if (fields.description !== undefined)
    updateFields.description = toAdf(fields.description)
  if (fields.issuetype !== undefined)
    updateFields.issuetype = { name: fields.issuetype }
  if (fields.epicKey !== undefined)
    updateFields.parent = { key: fields.epicKey }
  if ("assigneeAccountId" in fields) {
    updateFields.assignee = fields.assigneeAccountId
      ? { accountId: fields.assigneeAccountId }
      : null
  }
  if ("dueDate" in fields) {
    updateFields.duedate = fields.dueDate || null
  }

  const res = await jiraFetch(`/issue/${key}`, {
    method: "PUT",
    body: JSON.stringify({ fields: updateFields }),
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.text()
    throw new Error(`Failed to update issue: ${err}`)
  }
}

export async function getTransitions(
  issueKey: string,
): Promise<JiraTransition[]> {
  const res = await jiraFetch(`/issue/${issueKey}/transitions`)
  if (!res.ok) throw new Error("Failed to get transitions")
  const data = await res.json()
  return data.transitions as JiraTransition[]
}

export async function applyTransition(
  issueKey: string,
  transitionId: string,
): Promise<void> {
  const res = await jiraFetch(`/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: transitionId } }),
  })
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to apply transition")
  }
}

export async function transitionToStatus(
  issueKey: string,
  targetStatusNames: string[],
): Promise<void> {
  const transitions = await getTransitions(issueKey)
  const match = transitions.find((t) =>
    targetStatusNames.some((s) => t.to.name.toLowerCase() === s.toLowerCase()),
  )
  if (!match)
    throw new Error(
      `No transition found for statuses: ${targetStatusNames.join(", ")}`,
    )
  await applyTransition(issueKey, match.id)
}

export async function getAssignableUsers(query?: string): Promise<JiraUser[]> {
  const params = new URLSearchParams({
    project: JIRA_PROJECT_KEY,
    maxResults: "50",
  })
  if (query) params.set("query", query)
  const res = await jiraFetch(`/user/assignable/search?${params}`)
  if (!res.ok) return []
  return res.json() as Promise<JiraUser[]>
}

export async function getCurrentUser(): Promise<JiraUser | null> {
  const res = await jiraFetch("/myself")
  if (!res.ok) return null
  return res.json() as Promise<JiraUser>
}
