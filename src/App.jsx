import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Roster from './pages/Roster'
import LiveTracker from './pages/LiveTracker'
import PracticeEntry from './pages/PracticeEntry'
import PracticeHistory from './pages/PracticeHistory'
import Shooting from './pages/Shooting'
import FreeThrow from './pages/FreeThrow'
import Conditioning from './pages/Conditioning'
import Dashboard from './pages/Dashboard'
import PlayerReport from './pages/PlayerReport'
import ShotChart from './pages/ShotChart'
import Standards from './pages/Standards'
import Trends from './pages/Trends'
import SeasonSwitcher from './components/SeasonSwitcher'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'live', label: 'Live Tracker' },
  { key: 'practice', label: 'Film Review Entry' },
  { key: 'history', label: 'History' },
  { key: 'shooting', label: 'Shooting Drills' },
  { key: 'ft', label: 'FT Ladder' },
  { key: 'conditioning', label: 'Conditioning' },
  { key: 'shotchart', label: 'Shot Chart' },
  { key: 'standards', label: 'Standards' },
  { key: 'trends', label: 'Trends' },
  { key: 'roster', label: 'Roster' },
  { key: 'report', label: 'Player Report' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [practiceJump, setPracticeJump] = useState(null) // {date, type}
  const [seasonVersion, setSeasonVersion] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingAuth(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (checkingAuth) {
    return <div className="login-wrap"><p className="muted">Loading…</p></div>
  }

  if (!session) {
    return <Login />
  }

  function openSession(date, type) {
    setPracticeJump({ date, type, nonce: Date.now() })
    setActiveTab('practice')
  }

  return (
    <>
      <header className="app-header">
        <h1>🏀 Team Stat Tracker</h1>
        <div className="row" style={{ gap: 12 }}>
          <SeasonSwitcher onChanged={() => setSeasonVersion((v) => v + 1)} />
          <span className="user-email">{session.user.email}</span>
          <button className="secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={activeTab === t.key ? 'active' : ''}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        {activeTab === 'dashboard' && <Dashboard key={seasonVersion} />}
        {activeTab === 'live' && <LiveTracker key={seasonVersion} />}
        {activeTab === 'practice' && (
          <PracticeEntry
            key={`${practiceJump?.nonce || 'default'}-${seasonVersion}`}
            initialDate={practiceJump?.date}
            initialType={practiceJump?.type}
          />
        )}
        {activeTab === 'history' && <PracticeHistory key={seasonVersion} onOpenSession={openSession} />}
        {activeTab === 'shooting' && <Shooting />}
        {activeTab === 'ft' && <FreeThrow />}
        {activeTab === 'conditioning' && <Conditioning />}
        {activeTab === 'shotchart' && <ShotChart key={seasonVersion} />}
        {activeTab === 'standards' && <Standards />}
        {activeTab === 'trends' && <Trends key={seasonVersion} />}
        {activeTab === 'roster' && <Roster />}
        {activeTab === 'report' && <PlayerReport key={seasonVersion} />}
      </main>
    </>
  )
}
