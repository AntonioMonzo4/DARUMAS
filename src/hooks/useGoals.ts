import { useCallback, useEffect, useRef, useState } from 'react'
import type { Goal, Subtask } from '../types'
import { fileLoad, fileSave, isTauri } from '../lib/storage'

const STORAGE_KEY = 'daruma-goals-v1'

function seedGoals(): Goal[] {
  const day = 86_400_000
  const now = Date.now()
  return [
    {
      id: 'seed-1',
      title: 'Terminar el curso de caligrafía',
      note: 'Practicar 20 minutos cada mañana.',
      kanji: '続',
      color: 'shu',
      dueDate: new Date(now + day * 21).toISOString().slice(0, 10),
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
      dueDate: new Date(now + day * 45).toISOString().slice(0, 10),
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
      completedAt: now - day * 3,
      status: 'completed',
    },
  ]
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
    if (!raw) return seedGoals()
    return sanitize(JSON.parse(raw)) ?? seedGoals()
  } catch {
    return seedGoals()
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
            setGoals(parsed)
            hydrated.current = true
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
  }, [])

  const reorderGoals = useCallback((fromId: string, toId: string) => {
    setGoals((prev) => {
      const from = prev.findIndex((g) => g.id === fromId)
      if (from < 0) return prev
      const list = [...prev]
      const [moved] = list.splice(from, 1)
      const to = list.findIndex((g) => g.id === toId)
      list.splice(to < 0 ? list.length : to, 0, moved)
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

  const replaceAll = useCallback((list: Goal[]) => {
    setGoals(list)
  }, [])

  const exportData = useCallback(() => {
    const payload = { app: 'daruma', version: 1, exportedAt: new Date().toISOString(), goals }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daruma-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }, [goals])

  const importData = useCallback((raw: string): { ok: boolean; count?: number; error?: string } => {
    try {
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed) ? parsed : (parsed as { goals?: unknown }).goals
      const clean = sanitize(list)
      if (!clean) return { ok: false, error: 'El archivo no contiene metas válidas.' }
      setGoals(clean)
      return { ok: true, count: clean.length }
    } catch {
      return { ok: false, error: 'No se pudo leer el archivo JSON.' }
    }
  }, [])

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
    replaceAll,
    exportData,
    importData,
  }
}
