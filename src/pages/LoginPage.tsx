import { useState } from "react"
import { initiateOAuth } from "../lib/auth"
import { ATLASSIAN_CLIENT_ID } from "../lib/constants"
import GridPaper from "../components/GridPaper"
import Logo from "../components/Logo"

function DevTokenInjector({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const [open, setOpen] = useState(false)
  const [accessToken, setAccessToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [error, setError] = useState("")
  const CLOUD_ID = "e7488003-8823-45b1-9c62-954513b33845"

  function inject() {
    setError("")
    if (!accessToken.trim()) {
      setError("Access token is required")
      return
    }
    const tokens = {
      access_token: accessToken.trim(),
      refresh_token: refreshToken.trim(),
      expires_at: Date.now() + 3600 * 1000,
      cloud_id: CLOUD_ID,
    }
    localStorage.setItem("dsr_tokens", JSON.stringify(tokens))
    onLoggedIn?.()
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    border: "1.5px solid var(--accent-line)",
    background: "var(--surface)",
    color: "var(--ink)",
    outline: "none",
    fontSize: "11px",
    padding: "6px 8px",
    borderRadius: "8px",
    width: "100%",
  }

  return (
    <div
      className="mt-6 rounded-2xl overflow-hidden"
      style={{ border: "1.5px dashed var(--accent-line)" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-4"
      >
        <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
          Dev shortcut — paste tokens from live site
        </p>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            color: "var(--accent)",
          }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
            roastroom.figma.site → DevTools → Application → Local Storage →{" "}
            <code className="font-mono-key">dsr_tokens</code> → copy each field
            separately.
          </p>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium block"
              style={{ color: "var(--ink-soft)" }}
            >
              access_token
            </label>
            <textarea
              rows={3}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="eyJraWQi..."
              style={inputStyle}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-xs font-medium block"
              style={{ color: "var(--ink-soft)" }}
            >
              refresh_token
            </label>
            <textarea
              rows={2}
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="eyJraWQi..."
              style={inputStyle}
              className="resize-none"
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            onClick={inject}
            disabled={!accessToken.trim()}
            className="w-full py-2 rounded-full text-xs font-medium text-white"
            style={{
              background: "var(--accent)",
              opacity: accessToken.trim() ? 1 : 0.4,
              cursor: accessToken.trim() ? "pointer" : "not-allowed",
            }}
          >
            Inject &amp; enter board
          </button>
        </div>
      )}
    </div>
  )
}

export default function LoginPage({
  error,
  onLoggedIn,
}: {
  error?: string
  onLoggedIn?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const missingConfig = !ATLASSIAN_CLIENT_ID

  async function handleLogin() {
    setLoading(true)
    try {
      await initiateOAuth()
    } catch (err) {
      console.error("OAuth init failed:", err)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <GridPaper />

      <div className="relative z-10 w-full max-w-md rise-in">
        <div className="flex justify-center mb-7">
          <Logo size={92} />
        </div>

        <h1
          className="t-display normal-case text-center text-[clamp(1.75rem,6vw,3.25rem)] mb-3 whitespace-nowrap"
          style={{ color: "var(--ink)" }}
        >
          Design &amp; Research
        </h1>
        <p
          className="text-center text-base mb-9 mx-auto max-w-xs"
          style={{ color: "var(--ink-soft)" }}
        >
          Your team&#39;s Jira board — without the wait.
        </p>

        <div>
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "var(--danger-wash)",
                color: "var(--danger)",
                border: "1px solid var(--danger-line)",
              }}
            >
              {error}
            </div>
          )}

          {missingConfig ? (
            <div className="space-y-4">
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "var(--accent-wash)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-line)",
                }}
              >
                <p className="font-medium mb-1">Setup required</p>
                <p style={{ color: "var(--ink-soft)" }}>
                  Add{" "}
                  <code className="font-mono-key text-xs bg-[var(--surface)] px-1 py-0.5 rounded">
                    VITE_ATLASSIAN_CLIENT_ID
                  </code>{" "}
                  to your{" "}
                  <code className="font-mono-key text-xs bg-[var(--surface)] px-1 py-0.5 rounded">
                    .env
                  </code>{" "}
                  file.
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-xs space-y-1"
                style={{
                  background: "var(--bg)",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "var(--ink-soft)",
                }}
              >
                <p>VITE_ATLASSIAN_CLIENT_ID=your_client_id</p>
                <p>VITE_ATLASSIAN_REDIRECT_URI=https://roastroom.figma.site</p>
                <p>VITE_JIRA_PROJECT_KEY=DSR</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-3 py-7 text-lg"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Redirecting…
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="currentColor"
                  >
                    <path d="M12.006 2c-5.522 0-9.994 4.478-9.994 10s4.472 10 9.994 10c5.523 0 9.994-4.478 9.994-10S17.529 2 12.006 2zm0 18c-4.419 0-8-3.581-8-8s3.581-8 8-8 8 3.581 8 8-3.581 8-8 8zm3.546-11.561l-4.8 4.8-1.8-1.8a.999.999 0 10-1.414 1.414l2.507 2.507a1 1 0 001.414 0l5.507-5.507a1 1 0 00-1.414-1.414z" />
                  </svg>
                  Log in with Jira
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--ink-faint)" }}>
          Each person logs in with their own Atlassian account.
          <br />
          No shared tokens.
        </p>

        <DevTokenInjector onLoggedIn={onLoggedIn} />
      </div>
    </div>
  )
}
