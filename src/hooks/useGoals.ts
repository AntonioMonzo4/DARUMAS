import { useCallback, useEffect, useRef, useState } from 'react'
import type { Goal, Subtask } from '../types'
import { fileLoad, fileSave, isTauri } from '../lib/storage'

const STORAGE_KEY = 'daruma-goals-v1'
const REMOVED_KEY = 'daruma-seeds-removed'

function dateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function examples(): Goal[] {
  const day = 86_400_000
  const now = Date.now()
  return [
    {
      id: 'seed-1',
      title: 'Terminar el curso de caligrafía',
      note: 'Practicar 20 minutos cada mañana.',
      kanji: '続',
      color: 'shu',
      dueDate: dateStr(21),
      createdAt: now - day * 5,
      status: 'active',
      subtasks: [
        { id: 'st-1', text: 'Comprar pincel y tinta', done: true },
        { id: 'st-2', text: 'Completar módulo 1', done: false },
      ],
    },
    {
      id: 'seed-2',
      title: 'Correr 10 km sin parar',
      kanji: '健',
      color: 'matsu',
      dueDate: dateStr(45),
      createdAt: now - day * 12,
      status: 'active',
    },
    {
      id: 'seed-3',
      title: 'Ahorrar para el viaje a Kioto',
      note: 'Primera meta ya cumplida: boleto reservado.',
      kanji: '夢',
      color: 'kin',
      createdAt: now - day * 40,
      completedAt: now - day,
      status: 'completed',
    },
    {
      id: 'seed-4',
      title: 'Leer 12 libros este año',
      note: 'Uno por mes, sin excusas.',
      kanji: '書',
      color: 'murasaki',
      dueDate: dateStr(60),
      createdAt: now - day * 8,
      status: 'active',
      subtasks: [
        { id: 'st-4', text: 'Elegir la lista de lectura', done: true },
        { id: 'st-5', text: 'Libro de febrero', done: false },
        { id: 'st-6', text: 'Libro de marzo', done: false },
      ],
    },
    {
      id: 'seed-5',
      title: 'Enviar el portafolio a 5 clientes',
      kanji: '集',
      color: 'ai',
      dueDate: dateStr(7),
      createdAt: now - day * 3,
      status: 'active',
    },
    {
      id: 'seed-6',
      title: 'Meditar 10 minutos cada mañana',
      kanji: '静',
      color: 'kaki',
      dueDate: dateStr(3),
      createdAt: now - day * 2,
      status: 'active',
    },
    {
      id: 'seed-7',
      title: 'Renovar el permiso de conducir',
      note: 'Cita en el ITV, lleva el DNI.',
      kanji: '車',
      color: 'shu',
      dueDate: dateStr(-2),
      createdAt: now - day * 15,
      status: 'active',
    },
    {
      id: 'seed-8',
      title: 'Preparar la presentación del lunes',
      kanji: '前',
      color: 'ai',
      dueDate: dateStr(0),
      createdAt: now - day,
      status: 'active',
      subtasks: [
        { id: 'st-8', text: 'Terminar las diapositivas', done: false },
        { id: 'st-9', text: 'Ensayar 2 veces', done: false },
      ],
    },
    {
      id: 'seed-9',
      title: 'Dejar el azúcar 30 días',
      kanji: '断',
      color: 'matsu',
      dueDate: dateStr(14),
      createdAt: now - day * 6,
      status: 'active',
    },
    {
      id: 'seed-10',
      title: 'Terminar el rompecabezas de 1000 piezas',
      kanji: '完',
      color: 'kin',
      createdAt: now - day * 9,
      completedAt: now,
      status: 'completed',
    },
  ]
}

// Fill missing demo goals (once the list only contains seeds), skipping any
// the user deleted on purpose. Idempotent, so it works for both the
// localStorage copy and the desktop file.
function maybeUpgrade(list: Goal[]): Goal[] {
  if (!list.length || !list.every((g) => g.id.startsWith('seed-'))) return list
  let gone = new Set<string>()
  try {
    gone = new Set(JSON.parse(localStorage.getItem(REMOVED_KEY) ?? '[]'))
  } catch {
    /* ignore */
  }
  const byId = new Map(list.map((g) => [g.id, g]))
  const merged = examples()
    .filter((f) => !gone.has(f.id))
    .map((f) => byId.get(f.id) ?? f)
  return merged.length === list.length ? list : merged
}

function recordRemovedSeed(id: string) {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(REMOVED_KEY) ?? '[]')
    if (!arr.includes(id)) {
      arr.push(id)
      localStorage.setItem(REMOVED_KEY, JSON.stringify(arr))
    }
  } catch {
    /* ignore */
  }
}

function sanitize(list: unknown): Goal[] | null {
  if (!Array.isArray(list)) return null
  const ok = list.filter(
    (g): g is Goal =>
      !!g &&
      typeof g === 'object' &&
      typeof (g as Goal).id === 'string' &&
      typeof (g as Goal).title === 'string' &&
      ((g as Goal).status === 'active' || (g as Goal).status === 'completed'),
  )
  return ok.length === list.length && list.length > 0 ? ok : list.length === 0 ? [] : null
}

function loadSync(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return examples()
    const parsed = sanitize(JSON.parse(raw))
    if (!parsed) return examples()
    return maybeUpgrade(parsed)
  } catch {
    return examples()
  }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(loadSync)
  const hydrated = useRef(false)
  const saveTimer = useRef<number | undefined>(undefined)

  // Hydrate from file when running as desktop app (file wins over localStorage)
  useEffect(() => {
    if (!isTauri) return
    let alive = true
    void (async () => {
      const raw = await fileLoad()
      if (!alive) return
      if (raw !== null) {
        try {
          const parsed = sanitize(JSON.parse(raw))
          if (parsed) {
            const upgraded = maybeUpgrade(parsed)
            setGoals(upgraded)
            hydrated.current = true
            if (upgraded !== parsed) void fileSave(JSON.stringify(upgraded))
            return
          }
        } catch {
          /* keep localStorage copy */
        }
      }
      hydrated.current = true
      // first desktop run: persist current (seeded/local) state to file
      void fileSave(JSON.stringify(loadSync()))
    })()
    return () => {
      alive = false
    }
  }, [])

  // Persist: localStorage always; file (debounced) in desktop app
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
    } catch {
      /* storage full or unavailable */
    }
    if (!isTauri || !hydrated.current) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void fileSave(JSON.stringify(goals)), 350)
    return () => window.clearTimeout(saveTimer.current)
  }, [goals])

  const addGoal = useCallback(
    (input: { title: string; note?: string; kanji: string; color: string; dueDate?: string }) => {
      const goal: Goal = {
        id: crypto.randomUUID(),
        title: input.title.trim(),
        note: input.note?.trim() || undefined,
        kanji: input.kanji,
        color: input.color,
        dueDate: input.dueDate || undefined,
        createdAt: Date.now(),
        status: 'active',
      }
      setGoals((prev) => [goal, ...prev])
      return goal
    },
    [],
  )

  const updateGoal = useCallback((id: string, patch: Partial<Omit<Goal, 'id' | 'createdAt'>>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }, [])

  const completeGoal = useCallback((id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: 'completed', completedAt: Date.now() } : g)),
    )
  }, [])

  const reopenGoal = useCallback((id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, status: 'active', completedAt: undefined } : g)),
    )
  }, [])

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
    if (id.startsWith('seed-')) recordRemovedSeed(id)
  }, [])

  const reorderGoals = useCallback((fromId: string, toId: string) => {
    setGoals((prev) => {
      const from = prev.findIndex((g) => g.id === fromId)
      const to = prev.findIndex((g) => g.id === toId)
      if (from < 0 || to < 0 || from === to) return prev
      const list = [...prev]
      const [moved] = list.splice(from, 1)
      // land on the target's slot: after it when dragging down, before it when dragging up
      list.splice(to, 0, moved)
      return list
    })
  }, [])

  const addSubtask = useCallback((goalId: string, text: string) => {
    const st: Subtask = { id: crypto.randomUUID(), text: text.trim(), done: false }
    if (!st.text) return
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, subtasks: [...(g.subtasks ?? []), st] } : g)),
    )
  }, [])

  const toggleSubtask = useCallback((goalId: string, subId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              subtasks: (g.subtasks ?? []).map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
            }
          : g,
      ),
    )
  }, [])

  const removeSubtask = useCallback((goalId: string, subId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, subtasks: (g.subtasks ?? []).filter((s) => s.id !== subId) } : g,
      ),
    )
  }, [])

  const loadExamples = useCallback(() => {
    const missing = examples().filter((f) => !goals.some((g) => g.id === f.id))
    if (missing.length) {
      setGoals((prev) => [...missing, ...prev])
      try {
        const gone: string[] = JSON.parse(localStorage.getItem(REMOVED_KEY) ?? '[]')
        const restored = new Set(missing.map((m) => m.id))
        const kept = gone.filter((id) => !restored.has(id))
        localStorage.setItem(REMOVED_KEY, JSON.stringify(kept))
      } catch {
        /* ignore */
      }
    }
    return missing.length
  }, [goals])

  return {
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
  }
}
