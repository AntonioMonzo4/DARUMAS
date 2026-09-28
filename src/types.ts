export type GoalStatus = 'active' | 'completed'

export interface Subtask {
  id: string
  text: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  note?: string
  kanji: string
  color: string
  dueDate?: string
  createdAt: number
  completedAt?: number
  status: GoalStatus
  subtasks?: Subtask[]
}

export interface DarumaPalette {
  body: string
  dark: string
  light: string
  label: string
  swatchKanji: string
  meaning: string
}

export const DARUMA_COLORS: Record<string, DarumaPalette> = {
  shu: {
    body: '#e23127',
    dark: '#8f1210',
    light: '#f4553a',
    label: '朱 · bermellón',
    swatchKanji: '赤',
    meaning:
      'Suerte general, alejar el mal y cumplir cualquier deseo. El color clásico de los templos japoneses.',
  },
  kin: {
    body: '#e8b84b',
    dark: '#a87a1e',
    light: '#f6d96a',
    label: '金 · oro',
    swatchKanji: '金',
    meaning: 'Dinero, prosperidad y éxito en los negocios o proyectos económicos.',
  },
  ai: {
    body: '#2a4c7e',
    dark: '#122542',
    light: '#4e78b5',
    label: '藍 · índigo',
    swatchKanji: '青',
    meaning: 'Éxito académico: aprobar exámenes, oposiciones y superar estudios.',
  },
  matsu: {
    body: '#3f7355',
    dark: '#1e4130',
    light: '#6fa57e',
    label: '松 · verde pino',
    swatchKanji: '緑',
    meaning: 'Salud, longevidad y vigor. El pino verde simboliza una vida resistente.',
  },
  murasaki: {
    body: '#6b4a8e',
    dark: '#38254f',
    light: '#9270b5',
    label: '紫 · púrpura',
    swatchKanji: '紫',
    meaning: 'Salud y larga vida; en Japón el púrpura también es nobleza y logros elevados.',
  },
  kaki: {
    body: '#e2552a',
    dark: '#8f2a10',
    light: '#f47b45',
    label: '柿 · caqui',
    swatchKanji: '柿',
    meaning: 'Constancia en los estudios y, tradicionalmente, un parto seguro.',
  },
}

const LEGACY_KEYS: Record<string, string> = {
  red: 'shu',
  gold: 'kin',
  green: 'matsu',
  blue: 'ai',
  purple: 'murasaki',
  pink: 'kaki',
}

export const KANJI_OPTIONS = ['続', '福', '願', '夢', '努', '縁', '勝', '学', '健']

export function paletteOf(color: string): DarumaPalette {
  return (
    DARUMA_COLORS[color] ??
    DARUMA_COLORS[LEGACY_KEYS[color] ?? ''] ??
    DARUMA_COLORS.shu
  )
}

export function colorKeyOf(color: string): string {
  if (DARUMA_COLORS[color]) return color
  return LEGACY_KEYS[color] ?? 'shu'
}
