import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Goal, Subtask } from '../types'

interface SubtaskListProps {
  goal: Goal
  onAdd: (goalId: string, text: string) => void
  onToggle: (goalId: string, subId: string) => void
  onRemove: (goalId: string, subId: string) => void
}

export function SubtaskList({ goal, onAdd, onToggle, onRemove }: SubtaskListProps) {
  const [text, setText] = useState('')
  const subs = goal.subtasks ?? []
  const done = subs.filter((s) => s.done).length

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(goal.id, text)
    setText('')
  }

  return (
    <div className="subtasks">
      <div className="subtasks-head">
        <span className="subtasks-title">Pasos</span>
        <span className="subtasks-count">
          {done}/{subs.length}
        </span>
        {subs.length > 0 && (
          <div className="subtasks-bar">
            <motion.div
              className="subtasks-bar-fill"
              animate={{ width: `${subs.length ? (done / subs.length) * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 160, damping: 22 }}
            />
          </div>
        )}
      </div>

      <ul className="subtask-items">
        <AnimatePresence initial={false}>
          {subs.map((s: Subtask) => (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className={`subtask-item ${s.done ? 'done' : ''}`}
            >
              <button
                type="button"
                className="subtask-check"
                aria-pressed={s.done}
                onClick={() => onToggle(goal.id, s.id)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="subtask-text">{s.text}</span>
              <button
                type="button"
                className="subtask-del"
                aria-label="Quitar paso"
                onClick={() => onRemove(goal.id, s.id)}
              >
                ×
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <form className="subtask-add" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Añadir paso…"
          maxLength={80}
        />
        <button type="submit" className="btn btn-ghost btn-mini" disabled={!text.trim()}>
          Añadir
        </button>
      </form>
    </div>
  )
}
