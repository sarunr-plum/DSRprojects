import { useState, useEffect, useCallback } from "react"
import { handleCallback, isAuthenticated, logout } from "./lib/auth"
import { getEpics, type JiraEpic } from "./lib/jira"
import { initDefaultVisibility } from "./lib/storage"
import LoginPage from "./pages/LoginPage"
import BoardPage from "./pages/BoardPage"
import EpicsPage from "./pages/EpicsPage"
import AppHeader from "./components/AppHeader"
import GridPaper from "./components/GridPaper"

type Page = "loading" | "login" | "app"
type MainTab = "tasks" | "projects"

export default function App() {
  const [page, setPage] = useState<Page>("loading")
  const [authError, setAuthError] = useState("")
  const [epics, setEpics] = useState<JiraEpic[]>([])
  const [activeTab, setActiveTab] = useState<MainTab>("tasks")
  const [refreshHandler, setRefreshHandler] = useState<() => void>(
    () => () => {},
  )

  const registerRefresh = useCallback((fn: () => void) => {
    setRefreshHandler(() => fn)
  }, [])

  function loadAndGo(fetchedEpics: JiraEpic[]) {
    initDefaultVisibility(fetchedEpics)
    setEpics(fetchedEpics)
    setPage("app")
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
          setAuthError(
            err instanceof Error
              ? err.message
              : "Login failed. Please try again.",
          )
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-10 h-10 rounded-2xl animate-pulse"
          style={{ background: "var(--accent)", opacity: 0.3 }}
        />
      </div>
    )
  }

  if (page === "login") {
    return (
      <LoginPage
        error={authError}
        onLoggedIn={() => {
          getEpics()
            .then(loadAndGo)
            .catch(() => {})
        }}
      />
    )
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg)" }}
    >
      <GridPaper />
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={() => refreshHandler()}
        onLogout={() => {
          logout()
          window.location.reload()
        }}
      />
      {activeTab === "tasks" ? (
        <BoardPage
          epics={epics}
          onGoToProjects={() => setActiveTab("projects")}
          onRegisterRefresh={registerRefresh}
        />
      ) : (
        <EpicsPage onRegisterRefresh={registerRefresh} />
      )}
    </div>
  )
}
