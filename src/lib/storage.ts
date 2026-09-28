import { invoke } from '@tauri-apps/api/core'

export const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export async function fileLoad(): Promise<string | null> {
  if (!isTauri) return null
  try {
    return (await invoke<string | null>('storage_load')) ?? null
  } catch {
    return null
  }
}

export async function fileSave(data: string): Promise<void> {
  if (!isTauri) return
  try {
    await invoke('storage_save', { data })
  } catch {
    /* disk unavailable — localStorage still holds the data */
  }
}
