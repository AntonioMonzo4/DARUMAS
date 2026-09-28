import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useGoals } from './hooks/useGoals'
import { useDueNotifications } from './hooks/useNotifications'
import { AddGoalForm } from './components/AddGoalForm'
import { GoalCard } from './components/GoalCard'
import { EditGoalModal } from './components/EditGoalModal'
import { QuoteBanner } from './components/QuoteBanner'
import { Confetti } from './components/Confetti'
import { TraditionSection } from './components/TraditionSection'
import { makeConfettiBurst, type Piece } from './lib/confetti'
import { isTauri } from './lib/storage'
import { playTaiko, playTick, setSoundEnabled, soundEnabled } from './lib/sfx'
import Daruma from './components/Daruma'
import type { Goal } from './types'

type Filter = 'all' | 'active' | 'completed'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'En progreso' },
  { key: 'completed', label: 'Cumplidos' },
]

function dayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function computeStreak(goals: Goal[]): number {
  const days = new Set(
    goals.filter((g) => g.status === 'completed' && g.completedAt).map((g) => dayKey(g.completedAt!)),
  )
  if (!days.size) return 0
  let streak = 0
  const cur = new Date()
  if (!days.has(dayKey(cur.getTime()))) cur.setDate(cur.getDate() - 1)
  while (days.has(dayKey(cur.getTime()))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }
  return streak
}

export default function App() {
  const {
    goals,
    addGoal,
    updateGoal,
    completeGoal,
    reopenGoal,
    removeGoal,
    reorderGoals,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    loadExamples,
  } = useGoals()
  useDueNotifications(goals)

  const [filter, setFilter] = useState<Filter>('all')
  const [pieces, setPieces] = useState<Piece[]>([])
  const [editing, setEditing] = useState<Goal | null>(null)
  const [sound, setSound] = useState(soundEnabled())
  const [toast, setToast] = useState<string | null>(null)
  const confettiTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)
  const dragId = useRef<string | null>(null)

  const stats = useMemo(() => {
    const total = goals.length
    const completed = goals.filter((g) => g.status === 'completed').length
    const streak = computeStreak(goals)
    return {
      total,
      completed,
      active: total - completed,
      pct: total ? completed / total : 0,
      streak,
    }
  }, [goals])

  const visible = useMemo(() => {
    if (filter === 'all') return goals
    return goals.filter((g) => g.status === (filter === 'completed' ? 'completed' : 'active'))
  }, [goals, filter])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const handleComplete = (id: string) => {
    completeGoal(id)
    setPieces(makeConfettiBurst())
    window.clearTimeout(confettiTimer.current)
    confettiTimer.current = window.setTimeout(() => setPieces([]), 2800)
    window.setTimeout(playTaiko, 180)
  }

  const handleToggleSound = () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    if (next) playTick()
  }

  const handleLoadExamples = () => {
    const n = loadExamples()
    showToast(n ? `${n} ejemplos añadidos ✓` : 'Los 10 ejemplos ya están cargados')
  }

  const handleDragStart = (id: string) => {
    dragId.current = id
  }

  const handleDrop = (targetId: string) => {
    const from = dragId.current
    dragId.current = null
    if (!from || from === targetId) return
    reorderGoals(from, targetId)
  }

  const statRows = [
    { num: stats.total, label: 'Metas' },
    { num: stats.active, label: 'En curso' },
    { num: stats.completed, label: 'Cumplidas', gold: true },
    { num: stats.streak, label: 'Racha (días)', streak: true },
  ]

  return (
    <div className="app">
      <div className="bg-glow" aria-hidden="true" />
      <div className="bg-particles" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      <Confetti pieces={pieces} />

      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="header">
        <motion.div
          className="logo-daruma"
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          whileHover={{ rotate: [0, -6, 6, -3, 0] }}
        >
          <Daruma eyes={2} color="shu" kanji="続" size={100} />
        </motion.div>
        <div className="header-text">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            DARUMA<span className="header-ja">目標記録</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            Fija tu meta y pinta un ojo. Al cumplirla, pinta el otro. El daruma no se rinde.
          </motion.p>
        </div>
        <motion.button
          className="btn btn-ghost btn-mini sound-btn"
          onClick={handleToggleSound}
          aria-label={sound ? 'Silenciar sonidos' : 'Activar sonidos'}
          title={sound ? 'Silenciar' : 'Activar sonido'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {sound ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path
                d="M16.5 8.5a5 5 0 010 7M18.8 6.2a8.2 8.2 0 010 11.6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
              <path
                d="M17 9.5l4 5M21 9.5l-4 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </motion.button>
      </header>

      <QuoteBanner />

      <section className="stats" aria-label="Progreso global">
        {statRows.map((s) => (
          <div className="stat" key={s.label}>
            <span className={`stat-num ${s.gold ? 'gold' : ''} ${s.streak ? 'streak' : ''}`}>
              {s.num}
            </span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}

        <div className="stat-bar-wrap">
          <div className="stat-bar-label">
            <span>Progreso</span>
            <span>{Math.round(stats.pct * 100)}%</span>
          </div>
          <div className="stat-bar">
            <motion.div
              className="stat-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${stats.pct * 100}%` }}
              transition={{ type: 'spring', stiffness: 90, damping: 18 }}
            />
          </div>
        </div>

        <div className="data-actions">
          <button className="btn btn-ghost btn-mini" onClick={handleLoadExamples}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Cargar 10 ejemplos
          </button>
        </div>
      </section>

      <AddGoalForm onAdd={addGoal} />

      <LayoutGroup>
        <nav className="filters" aria-label="Filtrar metas">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-btn ${filter === f.key ? 'on' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {filter === f.key && (
                <motion.span
                  layoutId="filter-pill"
                  className="filter-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="filter-label">{f.label}</span>
            </button>
          ))}
        </nav>

        <main className="goal-grid">
          <AnimatePresence mode="popLayout">
            {visible.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                index={i}
                onComplete={handleComplete}
                onReopen={reopenGoal}
                onRemove={removeGoal}
                onEdit={setEditing}
                onAddSubtask={addSubtask}
                onToggleSubtask={toggleSubtask}
                onRemoveSubtask={removeSubtask}
                onDragStart={() => handleDragStart(goal.id)}
                onDrop={handleDrop}
              />
            ))}
          </AnimatePresence>

          {visible.length === 0 && (
            <motion.div
              className="empty"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                animate={{ rotate: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              >
                <Daruma eyes={0} color="murasaki" kanji="願" size={200} />
              </motion.div>
              <h3>
                {filter === 'completed'
                  ? 'Todavía no has completado ninguna meta'
                  : filter === 'active'
                    ? 'Sin metas en progreso'
                    : 'Tu primer daruma te espera'}
              </h3>
              <p>
                {filter === 'all'
                  ? 'Crea una meta: al fijarla se pinta el primer ojo, y el segundo cuando la cumplas.'
                  : 'Cambia de filtro o crea una nueva meta.'}
              </p>
            </motion.div>
          )}
        </main>
      </LayoutGroup>

      <EditGoalModal goal={editing} onSave={updateGoal} onClose={() => setEditing(null)} />

      <TraditionSection />

      <footer className="footer">
        <p>
          おめでとう — cada ojo pintado es una promesa cumplida.{' '}
          {isTauri
            ? 'Tus metas se guardan en este equipo, junto a la aplicación.'
            : 'Tus metas se guardan solo en este navegador.'}
        </p>
      </footer>
    </div>
  )
}
