export interface Piece {
  id: number
  x: number
  y: number
  tx: number
  ty: number
  rot: number
  color: string
  size: number
  height: number
  dur: number
}

const COLORS = ['#e2452f', '#d9a83c', '#f4e3c1', '#2f9e6e', '#7aa4ff', '#ff8fc4']

let counter = 0

export function makeConfettiBurst(): Piece[] {
  const originX = window.innerWidth / 2
  const originY = window.innerHeight * 0.42
  return Array.from({ length: 46 }, () => {
    const angle = Math.random() * Math.PI * 2
    const dist = 120 + Math.random() * 340
    const size = 7 + Math.random() * 9
    return {
      id: counter++,
      x: originX + (Math.random() - 0.5) * 40,
      y: originY + (Math.random() - 0.5) * 30,
      tx: originX + Math.cos(angle) * dist,
      ty: originY + Math.sin(angle) * dist + 180 + Math.random() * 220,
      rot: (Math.random() - 0.5) * 900,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size,
      height: size * (Math.random() > 0.5 ? 1 : 1.6),
      dur: 1.4 + Math.random() * 1.1,
    }
  })
}
