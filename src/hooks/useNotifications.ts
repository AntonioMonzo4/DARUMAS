import { useEffect, useState } from 'react'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import type { Goal } from '../types'
import { isTauri } from '../lib/storage'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function useDueNotifications(goals: Goal[]) {
  const [permissionAsked, setPermissionAsked] = useState(false)

  useEffect(() => {
    if (!isTauri || permissionAsked) return
    let alive = true
    void (async () => {
      try {
        let granted = await isPermissionGranted()
        if (!granted) {
          const res = await requestPermission()
          granted = res === 'granted'
        }
        if (alive) setPermissionAsked(true)
      } catch {
        if (alive) setPermissionAsked(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [permissionAsked])

  useEffect(() => {
    if (!isTauri) return
    const notify = () => {
      const today = startOfDay(new Date())
      const due = goals.filter((g) => {
        if (g.status !== 'active' || !g.dueDate) return false
        return startOfDay(new Date(`${g.dueDate}T23:59:59`)) <= today
      })
      if (!due.length) return
      const overdue = due.filter(
        (g) => startOfDay(new Date(`${g.dueDate}T23:59:59`)) < today,
      )
      const sent = `daruma-notified-${new Date().toISOString().slice(0, 10)}`
      try {
        if (localStorage.getItem(sent)) return
        localStorage.setItem(sent, '1')
      } catch {
        /* ignore */
      }
      void isPermissionGranted().then((ok) => {
        if (!ok) return
        if (overdue.length) {
          sendNotification({
            title: `${overdue.length} meta${overdue.length > 1 ? 's' : ''} vencida${overdue.length > 1 ? 's' : ''}`,
            body: overdue.slice(0, 3).map((g) => g.title).join(' · '),
          })
        } else {
          sendNotification({
            title: 'Vence hoy',
            body: due.map((g) => g.title).join(' · '),
          })
        }
      })
    }
    notify()
    const id = window.setInterval(notify, 60 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [goals])
}
