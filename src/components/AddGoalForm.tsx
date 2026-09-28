import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DARUMA_COLORS, KANJI_OPTIONS, type Goal } from '../types'
import Daruma from './Daruma'
import { playBrush } from '../lib/sfx'

interface AddGoalFormProps {
  onAdd: (input: {
    title: string
    note?: string
    kanji: string
    color: string
    dueDate?: string
  }) => Goal
}

export function AddGoalForm({ onAdd }: AddGoalFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [kanji, setKanji] = useState('続')
  const [color, setColor] = useState('shu')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  const minDate = new Date().toISOString().slice(0, 10)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Escribe una meta para pintar el primer ojo.')
      return
    }
    playBrush()
    onAdd({ title, note, kanji, color, dueDate })
    setTitle('')
    setNote('')
    setDueDate('')
    setError('')
    setOpen(false)
  }

  return (
    <div className="add-panel">
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.button
            key="cta"
            className="btn btn-primary btn-add"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span className="btn-add-plus">＋</span>
            Nueva meta · pinta un ojo
          </motion.button>
        ) : (
          <motion.form
            key="form"
            className="add-form"
            onSubmit={submit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="add-form-grid">
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
                    placeholder="Ej. Leer 12 libros este año"
                    maxLength={90}
                  />
                </label>

                <label className="field">
                  <span>Nota para recordar (opcional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="¿Por qué es importante? ¿Qué harás cada semana?"
                    rows={2}
                    maxLength={220}
                  />
                </label>

                <div className="field-row">
                  <label className="field">
                    <span>Fecha límite</span>
                    <input
                      type="date"
                      value={dueDate}
                      min={minDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>

                  <fieldset className="field">
                    <span>Kanji del daruma</span>
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
                </div>

                <fieldset className="field">
                  <span>Color del daruma</span>
                  <div className="color-picker">
                    {Object.entries(DARUMA_COLORS).map(([key, pal]) => (
                      <button
                        type="button"
                        key={key}
                        aria-label={pal.label}
                        title={pal.label}
                        className={`color-dot ${color === key ? 'on' : ''}`}
                        style={{ background: `radial-gradient(circle at 32% 28%, ${pal.light}, ${pal.body} 55%, ${pal.dark})` }}
                        onClick={() => setColor(key)}
                      />
                    ))}
                  </div>
                </fieldset>

                {error && <p className="form-error">{error}</p>}

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Fijar meta y pintar ojo
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                    Cancelar
                  </button>
                </div>
              </div>

              <motion.div
                className="add-preview"
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              >
                <Daruma eyes={1} color={color} kanji={kanji} size={210} animatePaint />
                <p className="preview-label">Vista previa · 1er ojo</p>
              </motion.div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
