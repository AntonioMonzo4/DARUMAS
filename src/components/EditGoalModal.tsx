import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DARUMA_COLORS, KANJI_OPTIONS, type Goal } from '../types'
import Daruma from './Daruma'

interface EditGoalModalProps {
  goal: Goal | null
  onSave: (
    id: string,
    patch: { title: string; note?: string; kanji: string; color: string; dueDate?: string },
  ) => void
  onClose: () => void
}

function EditForm({
  goal,
  onSave,
  onClose,
}: {
  goal: Goal
  onSave: EditGoalModalProps['onSave']
  onClose: () => void
}) {
  const [title, setTitle] = useState(goal.title)
  const [note, setNote] = useState(goal.note ?? '')
  const [kanji, setKanji] = useState(goal.kanji)
  const [color, setColor] = useState(goal.color)
  const [dueDate, setDueDate] = useState(goal.dueDate ?? '')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('La meta no puede estar vacía.')
      return
    }
    onSave(goal.id, {
      title: title.trim(),
      note: note.trim() || undefined,
      kanji,
      color,
      dueDate: dueDate || undefined,
    })
    onClose()
  }

  return (
    <motion.form
      className="modal-card"
      onSubmit={submit}
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    >
      <div className="modal-head">
        <h3>Editar meta</h3>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Cerrar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="modal-grid">
        <div className="add-fields">
          <label className="field">
            <span>Meta</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (error) setError('')
              }}
              maxLength={90}
            />
          </label>

          <label className="field">
            <span>Nota</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={220}
              placeholder="¿Por qué es importante?"
            />
          </label>

          <label className="field">
            <span>Fecha límite</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>

          <fieldset className="field">
            <span>Kanji</span>
            <div className="kanji-picker">
              {KANJI_OPTIONS.map((k) => (
                <button
                  type="button"
                  key={k}
                  className={`kanji-chip ${kanji === k ? 'on' : ''}`}
                  onClick={() => setKanji(k)}
                >
                  {k}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <span>Color</span>
            <div className="color-picker">
              {Object.entries(DARUMA_COLORS).map(([key, pal]) => (
                <button
                  type="button"
                  key={key}
                  aria-label={pal.label}
                  title={pal.label}
                  className={`color-dot ${color === key ? 'on' : ''}`}
                  style={{
                    background: `radial-gradient(circle at 32% 28%, ${pal.light}, ${pal.body} 55%, ${pal.dark})`,
                  }}
                  onClick={() => setColor(key)}
                />
              ))}
            </div>
          </fieldset>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar cambios
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>

        <div className="add-preview">
          <Daruma
            eyes={goal.status === 'completed' ? 2 : 1}
            color={color}
            kanji={kanji}
            size={170}
          />
          <p className="preview-label">Vista previa</p>
        </div>
      </div>
    </motion.form>
  )
}

export function EditGoalModal({ goal, onSave, onClose }: EditGoalModalProps) {
  return (
    <AnimatePresence>
      {goal && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <EditForm key={goal.id} goal={goal} onSave={onSave} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
