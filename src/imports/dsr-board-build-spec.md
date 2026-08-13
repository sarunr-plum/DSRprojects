# Build prompt: Design & Research task board (native Jira integration)

> Paste this whole document into a coding agent (e.g. Claude Code) or hand it to a developer as the project brief. It specifies a real, multi-user web app that replaces the current Claude-Artifact prototype with direct Jira REST API calls and proper Jira OAuth login — no LLM in the request path, no per-action latency.

---

## 1. One-paragraph brief

Build a small internal web app for the Design & Research (DSR) team that shows each person's Jira tasks as a Kanban board, scoped to whichever epics the team has manually marked visible (not automatically filtered by epic status). Team members log in with their own Atlassian account via Jira OAuth 2.0 (3LO) — no shared API tokens, no per-user setup. The app reads and writes Jira directly through the REST API. Visual language should feel like an internal, minimal, calm tool — informed by Plum's brand (https://www.plumhq.com/) without importing its marketing-site bombast.

---

## 2. Why rebuild (context for the agent/developer)

There's an existing working prototype — a single-file HTML artifact that proxies every Jira read/write through a Claude API call with an MCP connector attached. It works, but every action (load, move, create, edit) takes several seconds because it's routing through an LLM reasoning loop instead of calling Jira directly. This rebuild removes that hop entirely: a real backend holds OAuth tokens and calls `api.atlassian.com` directly, so actions should feel close to instant.

---

## 3. Scope

**Carry over as-is from the prototype** (these are already validated and liked):
- Board tabs = one per team member (assignee), not per-epic. Include an "Unassigned" tab if applicable.
- Kanban columns: To Do, In Progress, On Hold, Done, Blocked — Blocked sits right after Done.
- Card shows: task name (primary line), then one ellipsis-truncated line at the bottom in grey: `DSR-81 | Epic name` (task id is a live link to Jira, epic name is plain text).
- Drag-and-drop between columns to change status (implement with a library or custom logic that also supports touch — the prototype only supported mouse drag; fix that here).
- Each column header has a small "+" (not a count) that opens a "New task" modal pre-filled with that column's status and the active tab's person as assignee — both editable. Modal fields: Epic, Name, Description, Assignee, Status, Type (Task/Story).
- Tapping a card opens an "Edit task" modal: Name, Description, Epic, Assignee (dropdown), Type — saves back to Jira on submit. Show the task's key as a small tag in the top-right of that modal, linking to the issue in Jira.
- Background: dot-grid texture, not a ruled/square grid.
- No priority dot, no "Task" type badge, no "Move to" dropdown on cards — keep cards minimal.

**The one functional change from the prototype:**

Today the board *automatically* only pulls in epics whose Jira status is "In Progress" — that's a system-level filter nobody can adjust. Replace it with manual, human control:

- Add a top-level nav CTA (e.g. a button in the header next to Refresh) labeled **"Epics"**.
- It opens a new page/view: a plain list of **every** epic in the DSR project (regardless of status), showing per row: epic name, key, Jira status, owner (epic assignee), and a **visibility toggle** (on/off switch).
- Toggling an epic **on** means its child tasks show up on the main board; toggling it **off** hides them — independent of whatever status the epic actually has in Jira.
- This toggle state doesn't exist in Jira, so it needs to be stored by this app (see §6 persistence). It's shared, team-wide state — if one teammate toggles an epic on, everyone sees its tasks.
- The main board's task-loading query changes from `status = "In Progress"` to `epic key IN (whatever's currently toggled on)`.
- Reasonable default: when an epic is first seen (never toggled before), default it to **off** — nothing shows up until someone deliberately turns it on. Note this default as a decision to confirm with the team; the alternative (default epics whose Jira status is "In Progress" to on) may be friendlier for the first run and is worth offering as a config flag.

---

## 4. Tech stack (recommendation, not a hard requirement)

- **Frontend:** React (Next.js is a reasonable default — gives you API routes for the OAuth callback and Jira proxy in the same project).
- **Backend:** Next.js API routes, or a small Node/Express service if you'd rather keep frontend and backend separate.
- **Database:** Postgres (Supabase/Neon/RDS — anything managed is fine) or even SQLite if this is staying small and single-instance. Needed for: OAuth tokens per user, session data, and epic visibility toggles.
- **Hosting:** Anything that can hold server-side secrets (Vercel, Fly.io, Render, your own infra). This cannot be a client-only static site — OAuth token exchange requires a server holding a client secret.

---

## 5. Authentication: Jira OAuth 2.0 (3LO)

This is the part that makes login "hassle-free" for teammates — each person authorizes with their own Atlassian account, once, and the app stores their token.

**One-time setup (you do this, not each user):**
1. Register an OAuth 2.0 (3LO) app in the [Atlassian developer console](https://developer.atlassian.com/console/myapps/).
2. Enable Jira platform REST API access on it.
3. Add scopes (classic scopes recommended): `read:jira-work`, `write:jira-work`, `read:jira-user`, `offline_access` (required to get a refresh token — without it, users would need to re-auth constantly).
4. Set the callback URL to your app's OAuth callback route, e.g. `https://your-app.com/api/auth/callback`.
5. Note the Client ID and Client Secret — store both server-side only, never ship the secret to the browser.

**Per-user login flow (this is what you build):**

1. **Authorize** — "Log in with Jira" button sends the user to:
   ```
   https://auth.atlassian.com/authorize
     ?audience=api.atlassian.com
     &client_id={CLIENT_ID}
     &scope=read:jira-work write:jira-user offline_access
     &redirect_uri={YOUR_CALLBACK_URL}
     &state={random_csrf_value}
     &response_type=code
     &prompt=consent
   ```
2. **Callback** — Atlassian redirects back to your callback route with `?code=...&state=...`. Verify `state` matches what you sent (CSRF check), then exchange the code server-side:
   ```
   POST https://auth.atlassian.com/oauth/token
   Content-Type: application/json
   {
     "grant_type": "authorization_code",
     "client_id": "{CLIENT_ID}",
     "client_secret": "{CLIENT_SECRET}",
     "code": "{code_from_callback}",
     "redirect_uri": "{YOUR_CALLBACK_URL}"
   }
   ```
   Response includes `access_token`, `refresh_token`, `expires_in`.
3. **Resolve cloudId** — call `GET https://api.atlassian.com/oauth/token/accessible-resources` with `Authorization: Bearer {access_token}` to get the list of Jira sites the user granted access to, and their `id` (this is the `cloudId` used in every subsequent API call). Confirm it matches your team's site.
4. **Store** — save `access_token`, `refresh_token`, `expires_in`/expiry timestamp, and `cloudId` against that user's session/account row, encrypted at rest.
5. **Refresh** — when a stored access token is expired or about to expire, refresh silently server-side:
   ```
   POST https://auth.atlassian.com/oauth/token
   { "grant_type": "refresh_token", "client_id": "...", "client_secret": "...", "refresh_token": "..." }
   ```
6. **Every API call** goes through `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...` with `Authorization: Bearer {access_token}`, using that specific user's token — so every teammate's board respects their own Jira permissions automatically.

This means: no shared credentials, no manual token pasting, no per-user MCP connector setup. Each person clicks "Log in with Jira" once and stays logged in via the refresh token until they explicitly revoke access.

---

## 6. Persistence layer

Beyond OAuth tokens/sessions, you need one small table for epic visibility:

```sql
create table epic_visibility (
  epic_key text primary key,
  visible boolean not null default false,
  updated_by text,        -- Jira account id or display name of whoever last toggled it
  updated_at timestamptz not null default now()
);
```

Board load logic: fetch all epics in DSR (for the Epics page), fetch `epic_visibility` rows, join them, default missing rows to `visible = false`. Main board query filters to epic keys where `visible = true`.

---

## 7. Jira REST API endpoints you'll need

All under `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/`:

| Purpose | Endpoint |
|---|---|
| Search issues (JQL) | `POST /search` — body `{ "jql": "...", "fields": [...] }` |
| Get single issue | `GET /issue/{issueIdOrKey}` |
| Create issue | `POST /issue` |
| Update issue (fields) | `PUT /issue/{issueIdOrKey}` |
| Get available transitions | `GET /issue/{issueIdOrKey}/transitions` |
| Apply a transition | `POST /issue/{issueIdOrKey}/transitions` — body `{ "transition": { "id": "..." } }` |
| Assignable users for project | `GET /user/assignable/search?project=DSR` |
| Project roles / members (owner lookups) | `GET /project/{projectIdOrKey}/role` and the role detail endpoint it returns |

**Query patterns:**
- All epics in DSR (for the Epics page, any status): `project = DSR AND issuetype = Epic ORDER BY updated DESC`
- Children of the currently-visible epics: `project = DSR AND parent in ("DSR-1","DSR-4",...)`
- Setting an issue's epic parent on create/update: include `"parent": { "key": "DSR-1" }` in the `fields` object.
- Setting/clearing assignee: `"assignee": { "accountId": "..." }` or `"assignee": null` to unassign. You'll need to resolve a display name to an `accountId` via the assignable-users endpoint before setting it.

---

## 8. Pages

1. **Login** — "Log in with Jira" CTA, minimal, centered. Redirects into OAuth flow.
2. **Board** (default landing page after login) — header with page title, "Epics" CTA, Refresh button (top-right); person tabs; Kanban columns as specified in §3; New Task and Edit Task modals.
3. **Epics** (new) — reached via the header CTA. A simple table/list: Epic name, key (linked to Jira), status, owner, visibility toggle. Sortable by status or owner if easy to add; not required for v1. Changes save immediately (no separate "save" step) and should reflect on the Board page on next load or via a shared state refresh.

---

## 9. Design language

I fetched plumhq.com's homepage to ground this, but its compiled stylesheet (exact hex codes, font-family declarations) isn't retrievable from a text fetch — treat the tokens below as an inferred starting point, not verified brand values. Confirm exact colors/type against Plum's live site (browser inspector) or an internal brand guide before finalizing.

**What's observable from the site:** deep purple/near-black backgrounds in hero and brand moments, warm off-white/cream sections for contrast, soft purple-to-pink gradients used sparingly as decorative glow (not flat blocks), generous whitespace, rounded corners throughout (cards, buttons, images), confident sans-serif type with an occasional warm italic accent on emphasis words in headlines, big bold numerals for stat callouts, pill-shaped CTA buttons, a tone that's warm/human/reassuring rather than corporate.

**Translating that into a minimal work tool** (a dark cosmic marketing hero doesn't belong in a daily-use kanban board — the brief is "minimal and simple," so borrow the DNA, not the spectacle):

| Token | Suggested value | Notes |
|---|---|---|
| Background | Warm off-white (`#FAFAF8`–`#F6F5F0` range) | Light, calm, not stark white |
| Primary accent | Deep indigo/violet (`#4338CA`–`#4C3AA0` range) | Echoes Plum's purple identity; used for links, active states, primary buttons |
| Ink / text | Near-black with a warm cast (`#1F2430` range) | Avoid pure `#000` |
| Muted text | Soft grey (`#6B7280` range) | Secondary labels, meta lines |
| Accent gradient (sparing use only) | Indigo → soft pink/coral | Reserve for one hero/empty-state moment, not everywhere |
| Corners | Generously rounded (8–14px) | Cards, buttons, modals, chips |
| Type | A confident geometric sans for headings (Space Grotesk, General Sans, or similar), a clean readable sans for body/data (Inter) | Keep a monospace face for Jira keys/ids only |
| Buttons | Pill or soft-rounded, solid indigo primary, ghost/outline secondary | Matches Plum's CTA treatment |
| Tone of copy | Plain, warm, no jargon | Empty states and error messages should read like a helpful person, not a system log |

---

## 10. Non-functional requirements

- **Security:** client secret never reaches the browser; tokens encrypted at rest; CSRF-protected OAuth `state` param; HTTPS only; session cookies `httpOnly` + `secure`.
- **Team access:** each user's Jira permissions are enforced naturally since every call uses their own token — someone without access to an issue in Jira won't see it here either.
- **Performance target:** board load and card actions should complete in well under a second for the Jira calls themselves (excluding normal network latency) — this is the whole point of moving off the LLM-mediated prototype.
- **Resilience:** handle expired/revoked tokens gracefully (redirect back to login rather than showing a raw error); handle Jira API rate limits with basic backoff/retry.

---

## 11. Environment variables

```
ATLASSIAN_CLIENT_ID=
ATLASSIAN_CLIENT_SECRET=
ATLASSIAN_REDIRECT_URI=
ATLASSIAN_CLOUD_ID=            # optional pin, or resolve dynamically per user
DATABASE_URL=
SESSION_SECRET=
JIRA_PROJECT_KEY=DSR
```

---

## 12. Suggested build order

1. OAuth login + callback + token storage (get one real logged-in session working end to end).
2. Read-only board: epics, tasks, columns, tabs — no writes yet.
3. Epics page + visibility toggle table, wired into the board's query.
4. Writes: create task, edit task (incl. assignee reassignment), drag-to-transition status.
5. Design pass using §9 tokens.
6. Polish: touch-friendly drag-and-drop, loading/empty states, error handling.
