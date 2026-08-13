# DSR Board — Fix & Feature Plan (Round 2)

## Context

Eight fixes and features requested after first live testing. Changes span the board header, task cards, column config, modals, epics page, and default visibility behaviour.

---

## 1. Logout CTA (BoardPage.tsx)

Replace the `⏏` eject icon button with a plain text "Log out" button.

---

## 2. Default "In Progress" epics visible (storage.ts + App.tsx)

On first load, when `dsr_epic_visibility` has never been set, auto-enable any epics whose Jira status is `"In Progress"`.

- **`src/lib/storage.ts`** — add `initDefaultVisibility(epics)`: checks if the visibility key exists in localStorage; if not, sets every epic with status `"In Progress"` to `true`, all others to `false`.
- **`src/App.tsx`** — call `initDefaultVisibility(epics)` immediately after `getEpics()` resolves, before navigating to the board.

---

## 3. Remove "On Hold" column — reflect actual Jira statuses (constants.ts + BoardPage.tsx)

- **`src/lib/constants.ts`** — remove `onhold` from `COLUMNS`, `STATUS_TO_COLUMN`, and `COLUMN_STATUS_NAMES`. Final 4 columns: `To Do`, `In Progress`, `Done`, `Blocked`.
- **`src/pages/BoardPage.tsx`** — after loading tasks, only render columns that actually have at least one task OR are `todo`/`inprogress` (always show those two even when empty). Skip `done` and `blocked` columns when they have no tasks.

---

## 4. Task card — remove type badge and status dot (TaskCard.tsx)

Delete the entire status dot + issuetype label block. Card shows only: summary (primary) and key | epic name (secondary).

---

## 5. Due dates — fetch, display, and edit

**`src/lib/jira.ts`**
- Add `duedate?: string` to `JiraIssue.fields` interface.
- Add `"duedate"` to fields arrays in `getTasksForEpics()`, `createIssue()` body, and `updateIssue()`.
- Accept `dueDate?: string` param in `createIssue` and `updateIssue`; include `duedate` in Jira API payload when provided.

**`src/components/TaskCard.tsx`**
- Show due date below the key | epic line when present.
- Colour coding: red if overdue, amber if due within 3 days, grey otherwise.

**`src/components/NewTaskModal.tsx`** — add `dueDate` form field with `<input type="date">`.

**`src/components/EditTaskModal.tsx`** — initialise `dueDate` from `issue.fields.duedate`; add `<input type="date">`.

---

## 6. Epics page — filters, due date, newest-first sort (EpicsPage.tsx + jira.ts)

**`src/lib/jira.ts` — `getEpics()`**
- Add `"created"`, `"duedate"` to fetched fields.
- Change ORDER BY to `created DESC`.

**`src/pages/EpicsPage.tsx`**
- Add `filterStatus: string` and `filterAssignee: string` state (both `""`).
- Render two filter dropdowns above the list: Status (unique values from loaded epics) and Assignee.
- Display due date next to the epic key when present: `· Due Mar 12`.
- Apply filters before rendering the list.

---

## 7. New task modal — pre-select assignee & status from clicked context (BoardPage.tsx)

In `BoardPage.tsx`, always pass `activeTab` as `assigneeName` when `activeTab !== "Unassigned"`:

```tsx
onNewTask={() => setNewTaskConfig({
  columnId: col.id,
  assigneeName: activeTab !== "Unassigned" ? activeTab : undefined,
})}
```

This is already partially in place — verify the `useEffect` in `NewTaskModal` correctly pre-selects after users load. The status pre-fill from `defaultColumnId` is already wired.

---

## 8. Searchable dropdowns for Assignee & Epic

**New file: `src/components/SearchableSelect.tsx`**

A reusable combobox component:
- Props: `options: { value: string; label: string }[]`, `value: string`, `onChange: (value: string) => void`, `placeholder?: string`.
- State: `query` (filter string), `open` (boolean), `highlighted` index.
- Renders: a styled input showing selected label (editable as query when open), a dropdown list filtered by query.
- Click outside closes (document `mousedown` listener in `useEffect`).
- Keyboard: `Escape` closes, `ArrowDown`/`ArrowUp` navigate, `Enter` selects highlighted.

Replace the Assignee `<select>` and Epic `<select>` in both `NewTaskModal.tsx` and `EditTaskModal.tsx` with `<SearchableSelect>`.

---

## Files to modify

| File | Change |
|---|---|
| `src/lib/constants.ts` | Remove `onhold` from COLUMNS, STATUS_TO_COLUMN, COLUMN_STATUS_NAMES |
| `src/lib/storage.ts` | Add `initDefaultVisibility(epics)` |
| `src/lib/jira.ts` | Add duedate to interfaces, fetch fields, create/update params; getEpics fields + sort |
| `src/App.tsx` | Call `initDefaultVisibility` after epics load |
| `src/pages/BoardPage.tsx` | Logout text; dynamic column visibility; assigneeName pass-through |
| `src/pages/EpicsPage.tsx` | Status + assignee filters; due date display |
| `src/components/TaskCard.tsx` | Remove dot+badge; add due date pill |
| `src/components/NewTaskModal.tsx` | Add due date picker; use SearchableSelect |
| `src/components/EditTaskModal.tsx` | Add due date picker; use SearchableSelect |
| `src/components/SearchableSelect.tsx` | New component |

---

## Verification

1. Clear localStorage → open board → tasks from "In Progress" epics load by default
2. Board shows 4 columns (no "On Hold"); columns with no tasks are hidden (except To Do + In Progress)
3. Task cards: no dot or badge; due dates appear with correct colour coding
4. New task modal: assignee pre-filled from active tab, status pre-filled from column; due date picker present
5. Edit task modal: existing due date shown and editable
6. Epics page: filter dropdowns work; due dates visible; sorted newest first
7. Assignee and Epic dropdowns in both modals are searchable/filterable
8. Header shows "Log out" text instead of eject icon
