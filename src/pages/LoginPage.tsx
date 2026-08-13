import { useState } from "react"
import { initiateOAuth } from "../lib/auth"
import { ATLASSIAN_CLIENT_ID } from "../lib/constants"
import DotGrid from "../components/DotGrid"

function DevTokenInjector({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const [accessToken, setAccessToken] = useState("")
  const [refreshToken, setRefreshToken] = useState("")
  const [error, setError] = useState("")
  const CLOUD_ID = "e7488003-8823-45b1-9c62-954513b33845"

  function inject() {
    setError("")
    if (!accessToken.trim()) { setError("Access token is required"); return }
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
    fontFamily: "JetBrains Mono, monospace",
    border: "1.5px solid #C7D2FE",
    background: "white",
    color: "#1F2430",
    outline: "none",
    fontSize: "11px",
    padding: "6px 8px",
    borderRadius: "8px",
    width: "100%",
  }

  return (
    <div
      className="mt-6 rounded-2xl p-4 space-y-3"
      style={{ border: "1.5px dashed #C7D2FE", background: "#EEF2FF" }}
    >
      <p className="text-xs font-semibold" style={{ color: "#4338CA" }}>
        Dev shortcut — paste tokens from live site
      </p>
      <p className="text-xs" style={{ color: "#6B7280" }}>
        roastroom.figma.site → DevTools → Application → Local Storage → <code className="font-mono-key">dsr_tokens</code> → copy each field separately.
      </p>

      <div className="space-y-1.5">
        <label className="text-xs font-medium block" style={{ color: "#6B7280" }}>access_token</label>
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
        <label className="text-xs font-medium block" style={{ color: "#6B7280" }}>refresh_token</label>
        <textarea
          rows={2}
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
          placeholder="eyJraWQi..."
          style={inputStyle}
          className="resize-none"
        />
      </div>

      {error && <p className="text-xs" style={{ color: "#DC2626" }}>{error}</p>}

      <button
        onClick={inject}
        disabled={!accessToken.trim()}
        className="w-full py-2 rounded-full text-xs font-medium text-white"
        style={{
          background: "#4338CA",
          opacity: accessToken.trim() ? 1 : 0.4,
          cursor: accessToken.trim() ? "pointer" : "not-allowed",
        }}
      >
        Inject &amp; enter board
      </button>
    </div>
  )
}

export default function LoginPage({ error, onLoggedIn }: { error?: string; onLoggedIn?: () => void }) {
  const [loading, setLoading] = useState(false)
  const missingConfig = !ATLASSIAN_CLIENT_ID
  const isDev = import.meta.env.DEV

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
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <DotGrid />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "#4338CA" }}
          >
            <svg viewBox="0 0 40 40" fill="none" className="w-7 h-7">
              <rect x="4" y="10" width="7" height="20" rx="2" fill="white" opacity="0.9" />
              <rect x="16.5" y="6" width="7" height="24" rx="2" fill="white" opacity="0.7" />
              <rect x="29" y="13" width="7" height="17" rx="2" fill="white" opacity="0.5" />
            </svg>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-8 shadow-sm"
          style={{ border: "1px solid #E5E3DC" }}
        >
          <h1
            className="text-2xl font-semibold mb-1 text-center"
            style={{ fontFamily: "Outfit, sans-serif", color: "#1F2430" }}
          >
            DSR Board
          </h1>
          <p className="text-center text-sm mb-8" style={{ color: "#6B7280" }}>
            Your team&#39;s Jira board, faster.
          </p>

          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              {error}
            </div>
          )}

          {missingConfig ? (
            <div className="space-y-4">
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE" }}
              >
                <p className="font-medium mb-1">Setup required</p>
                <p style={{ color: "#6B7280" }}>
                  Add <code className="font-mono-key text-xs bg-white px-1 py-0.5 rounded">VITE_ATLASSIAN_CLIENT_ID</code> to your{" "}
                  <code className="font-mono-key text-xs bg-white px-1 py-0.5 rounded">.env</code> file.
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-xs space-y-1"
                style={{ background: "#F6F5F0", fontFamily: "JetBrains Mono, monospace", color: "#6B7280" }}
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
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full text-white font-medium text-sm transition-all"
              style={{
                background: loading ? "#6366F1" : "#4338CA",
                opacity: loading ? 0.8 : 1,
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Redirecting…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M12.006 2c-5.522 0-9.994 4.478-9.994 10s4.472 10 9.994 10c5.523 0 9.994-4.478 9.994-10S17.529 2 12.006 2zm0 18c-4.419 0-8-3.581-8-8s3.581-8 8-8 8 3.581 8 8-3.581 8-8 8zm3.546-11.561l-4.8 4.8-1.8-1.8a.999.999 0 10-1.414 1.414l2.507 2.507a1 1 0 001.414 0l5.507-5.507a1 1 0 00-1.414-1.414z" />
                  </svg>
                  Log in with Jira
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#9CA3AF" }}>
          Each person logs in with their own Atlassian account.
          <br />
          No shared tokens.
        </p>

        {isDev && <DevTokenInjector onLoggedIn={onLoggedIn} />}
      </div>
    </div>
  )
}
