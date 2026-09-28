import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Goal } from '../types'
import Daruma from './Daruma'
import { SubtaskList } from './SubtaskList'
import { playBrush } from '../lib/sfx'
import { shareDaruma } from '../lib/share'

interface GoalCardProps {
  goal: Goal
  index: number
  onComplete: (id: string) => void
  onReopen: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (goal: Goal) => void
  onAddSubtask: (goalId: string, text: string) => void
  onToggleSubtask: (goalId: string, subId: string) => void
  onRemoveSubtask: (goalId: string, subId: string) => void
  onDragStart: () => void
  onDrop: (targetId: string) => void
}

function daysLeft(due?: string): number | null {
  if (!due) return null
  const dueMs = new Date(`${due}T23:59:59`).getTime()
  return Math.ceil((dueMs - Date.now()) / 86_400_000)
}

export function GoalCard({
  goal,
  index,
  onComplete,
  onReopen,
  onRemove,
  onEdit,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onDragStart,
  onDrop,
}: GoalCardProps) {
  const [confirming, setConfirming] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const completed = goal.status === 'completed'
  const left = daysLeft(goal.dueDate)

  const dueLabel = useMemo(() => {
    if (!goal.dueDate) return null
    const d = new Date(`${goal.dueDate}T12:00:00`)
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }, [goal.dueDate])

  const handleComplete = () => {
    setJustCompleted(true)
    playBrush()
    onComplete(goal.id)
    window.setTimeout(() => setJustCompleted(false), 2200)
  }

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    try {
      await shareDaruma(goal)
      setShared(true)
      window.setTimeout(() => setShared(false), 2400)
    } catch {
      /* export failed */
    } finally {
      setSharing(false)
    }
  }

  const urgency =
    completed || left === null
      ? ''
      : left < 0
        ? 'overdue'
        : left <= 3
          ? 'soon'
          : left <= 10
            ? 'near'
            : ''

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: Math.min(index * 0.05, 0.3) }}
      className={`goal-card ${completed ? 'is-completed' : ''} ${dragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => {
        const ev = e as unknown as React.DragEvent
        if (ev.dataTransfer) {
          ev.dataTransfer.setData('text/plain', goal.id)
          ev.dataTransfer.effectAllowed = 'move'
        }
        onDragStart()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        onDrop(goal.id)
      }}
      onDragEnd={() => setDragOver(false)}
    >
      <div className="goal-daruma-wrap">
        <motion.div
          className="goal-daruma"
          animate={
            justCompleted
              ? { rotate: [0, -14, 12, -8, 5, 0], y: [0, -8, 0, -4, 0] }
              : { rotate: 0 }
          }
          transition={{ duration: 1.1, ease: 'easeOut' }}
          whileHover={{ rotate: [0, -3, 3, -2, 0], transition: { duration: 0.6 } }}
        >
          <Daruma
            eyes={completed ? 2 : 1}
            color={goal.color}
            kanji={goal.kanji}
            size={185}
            animatePaint
          />
        </motion.div>

        {completed && (
          <motion.span
            className="stamp"
            initial={{ scale: 2.2, opacity: 0, rotate: -28 }}
            animate={{ scale: 1, opacity: 1, rotate: -14 }}
            transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          >
            達成
          </motion.span>
        )}
      </div>

      <div className="goal-body">
        <div className="goal-top">
          <span className="drag-handle" title="Arrastrar para reordenar" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.7" />
              <circle cx="15" cy="6" r="1.7" />
              <circle cx="9" cy="12" r="1.7" />
              <circle cx="15" cy="12" r="1.7" />
              <circle cx="9" cy="18" r="1.7" />
              <circle cx="15" cy="18" r="1.7" />
            </svg>
          </span>
          <h3 className="goal-title">{goal.title}</h3>
          <span className={`status-pill ${completed ? 'ok' : 'active'}`}>
            {completed ? 'Cumplido' : 'En curso'}
          </span>
        </div>

        {goal.note && <p className="goal-note">{goal.note}</p>}

        <div className="goal-meta">
          {dueLabel && (
            <span className={`chip ${urgency}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {completed
                ? `Límite: ${dueLabel}`
                : left !== null && left < 0
                  ? `Vencida hace ${Math.abs(left)} d`
                  : left === 0
                    ? 'Vence hoy'
                    : `Faltan ${left} d · ${dueLabel}`}
            </span>
          )}
          {!completed && (
            <span className="chip ghost">一目 · 1er ojo pintado al fijar la meta</span>
          )}
          {completed && goal.completedAt && (
            <span className="chip ghost">
              Cumplido:{' '}
              {new Date(goal.completedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}
        </div>

        <SubtaskList
          goal={goal}
          onAdd={onAddSubtask}
          onToggle={onToggleSubtask}
          onRemove={onRemoveSubtask}
        />

        <div className="goal-actions">
          {!completed ? (
            <button className="btn btn-primary" onClick={handleComplete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12.5l5 5L20 6.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Pintar el 2.º ojo
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => onReopen(goal.id)}>
              Volver a empezar
            </button>
          )}

          <button className="btn btn-ghost btn-mini" onClick={() => onEdit(goal)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Editar
          </button>

          <button className="btn btn-ghost btn-mini" onClick={handleShare} disabled={sharing}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v12m0-12l-4 4m4-4l4 4M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {shared ? 'Guardado ✓' : 'Compartir'}
          </button>

          {confirming ? (
            <div className="confirm-row">
              <button className="btn btn-danger" onClick={() => onRemove(goal.id)}>
                Sí, eliminar
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button
              className="btn btn-icon"
              onClick={() => setConfirming(true)}
              aria-label="Eliminar meta"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 13h8l1-13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  )
}
