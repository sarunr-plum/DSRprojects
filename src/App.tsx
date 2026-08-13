import { useState, useEffect } from "react"
import { handleCallback, isAuthenticated } from "./lib/auth"
import { getEpics, type JiraEpic } from "./lib/jira"
import { initDefaultVisibility } from "./lib/storage"
import LoginPage from "./pages/LoginPage"
import BoardPage from "./pages/BoardPage"
import EpicsPage from "./pages/EpicsPage"

type Page = "loading" | "login" | "board" | "epics"

export default function App() {
  const [page, setPage] = useState<Page>("loading")
  const [authError, setAuthError] = useState("")
  const [epics, setEpics] = useState<JiraEpic[]>([])

  function loadAndGo(fetchedEpics: JiraEpic[]) {
    initDefaultVisibility(fetchedEpics)
    setEpics(fetchedEpics)
    setPage("board")
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")

    if (code) {
      const state = params.get("state")
      handleCallback(code, state)
        .then(() => {
          window.history.replaceState({}, "", window.location.pathname)
          return getEpics()
        })
        .then(loadAndGo)
        .catch((err) => {
          setAuthError(err instanceof Error ? err.message : "Login failed. Please try again.")
          setPage("login")
        })
      return
    }

    if (isAuthenticated()) {
      getEpics()
        .then(loadAndGo)
        .catch(() => setPage("login"))
    } else {
      setPage("login")
    }
  }, [])

  if (page === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F6F5F0" }}>
        <div className="w-10 h-10 rounded-2xl animate-pulse" style={{ background: "#4338CA", opacity: 0.3 }} />
      </div>
    )
  }

  if (page === "login") {
    return (
      <LoginPage
        error={authError}
        onLoggedIn={() => {
          getEpics().then(loadAndGo).catch(() => {})
        }}
      />
    )
  }

  if (page === "epics") {
    return (
      <EpicsPage
        onBack={() => {
          getEpics().then(setEpics).catch(() => {})
          setPage("board")
        }}
      />
    )
  }

  return <BoardPage epics={epics} onNavigateEpics={() => setPage("epics")} />
}
