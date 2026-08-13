import {
  ATLASSIAN_CLIENT_ID,
  ATLASSIAN_CLIENT_SECRET,
  ATLASSIAN_REDIRECT_URI,
} from "./constants"
import { getStoredTokens, setStoredTokens, clearStoredTokens } from "./storage"

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ""
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(48)
  crypto.getRandomValues(array)
  return base64url(array.buffer)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return base64url(digest)
}

export async function initiateOAuth(): Promise<void> {
  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const stateArr = new Uint8Array(32)
  crypto.getRandomValues(stateArr)
  const state = base64url(stateArr.buffer)

  sessionStorage.setItem("pkce_verifier", verifier)
  sessionStorage.setItem("oauth_state", state)

  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: ATLASSIAN_CLIENT_ID,
    scope: "read:jira-work write:jira-work read:jira-user offline_access",
    redirect_uri: ATLASSIAN_REDIRECT_URI,
    state,
    response_type: "code",
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256",
  })

  const url = `https://auth.atlassian.com/authorize?${params}`
  // If running inside an iframe (e.g. Figma Make preview), open in a new tab
  if (window.self !== window.top) {
    window.open(url, "_blank")
  } else {
    window.location.href = url
  }
}

export async function handleCallback(
  code: string,
  returnedState: string | null,
): Promise<void> {
  const verifier = sessionStorage.getItem("pkce_verifier")
  const savedState = sessionStorage.getItem("oauth_state")

  if (!verifier)
    throw new Error("No PKCE verifier found — please try logging in again.")
  if (!savedState || returnedState !== savedState)
    throw new Error(
      "Invalid OAuth state — possible CSRF. Please try logging in again.",
    )

  const tokenRes = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: ATLASSIAN_CLIENT_ID,
      client_secret: ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: ATLASSIAN_REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const tokenData = await tokenRes.json()

  const resourcesRes = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    },
  )

  if (!resourcesRes.ok) throw new Error("Failed to fetch Jira resources")

  const resources = await resourcesRes.json()
  const cloudId = resources[0]?.id
  if (!cloudId) throw new Error("No Jira site found for this account")

  setStoredTokens({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
    cloud_id: cloudId,
  })

  // Wipe one-time secrets immediately after use
  sessionStorage.removeItem("pkce_verifier")
  sessionStorage.removeItem("oauth_state")
}

async function silentRefresh(): Promise<string> {
  const stored = getStoredTokens()
  if (!stored?.refresh_token) throw new Error("No refresh token available")

  const res = await fetch("https://auth.atlassian.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: ATLASSIAN_CLIENT_ID,
      client_secret: ATLASSIAN_CLIENT_SECRET,
      refresh_token: stored.refresh_token,
    }),
  })

  if (!res.ok) {
    clearStoredTokens()
    throw new Error("Session expired — please log in again")
  }

  const data = await res.json()
  setStoredTokens({
    ...stored,
    access_token: data.access_token,
    refresh_token: data.refresh_token || stored.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  })

  return data.access_token
}

export async function getValidToken(): Promise<{
  token: string
  cloudId: string
}> {
  const stored = getStoredTokens()
  if (!stored) throw new Error("Not authenticated")

  if (Date.now() > stored.expires_at - 5 * 60 * 1000) {
    const token = await silentRefresh()
    return { token, cloudId: stored.cloud_id }
  }

  return { token: stored.access_token, cloudId: stored.cloud_id }
}

export function isAuthenticated(): boolean {
  return !!getStoredTokens()
}

export function logout(): void {
  clearStoredTokens()
}
