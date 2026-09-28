import type { Goal } from '../types'
import { colorKeyOf } from '../types'

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'meta'
  )
}

export async function shareDaruma(goal: Goal): Promise<void> {
  const eyes = goal.status === 'completed' ? 2 : 1
  const src = `/daruma/${colorKeyOf(goal.color)}/eyes-${eyes}.png`
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = src
  await img.decode()

  if (document.fonts?.ready) await document.fonts.ready

  const W = 512
  const H = 534
  const FOOT = 132
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H + FOOT
  const x = canvas.getContext('2d')
  if (!x) return

  x.fillStyle = '#15110f'
  x.fillRect(0, 0, canvas.width, canvas.height)

  const grad = x.createRadialGradient(W / 2, H * 0.4, 60, W / 2, H * 0.5, W * 0.75)
  grad.addColorStop(0, 'rgba(226,69,47,0.16)')
  grad.addColorStop(1, 'rgba(226,69,47,0)')
  x.fillStyle = grad
  x.fillRect(0, 0, W, H)

  x.drawImage(img, 0, 0, W, H)

  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.font = '700 96px "Zen Maru Gothic", serif'
  x.lineWidth = 11
  x.strokeStyle = '#1a0c08'
  x.strokeText(goal.kanji, 252, 400)
  x.fillStyle = '#f0c14b'
  x.fillText(goal.kanji, 252, 400)

  x.fillStyle = '#0f0c0a'
  x.fillRect(0, H, W, FOOT)
  x.fillStyle = 'rgba(217,168,60,0.35)'
  x.fillRect(0, H, W, 1)

  let title = goal.title
  x.font = '600 27px Outfit, sans-serif'
  x.textAlign = 'left'
  x.textBaseline = 'alphabetic'
  while (title.length > 4 && x.measureText(title).width > W - 56 - (goal.status === 'completed' ? 96 : 0)) {
    title = title.slice(0, -1)
  }
  if (title !== goal.title) title = `${title.slice(0, -1)}…`
  x.fillStyle = '#f4e7d0'
  x.fillText(title, 28, H + 52)

  x.font = '400 19px Outfit, sans-serif'
  x.fillStyle = '#a89878'
  x.fillText('DARUMA · metas y objetivos', 28, H + 90)

  if (goal.status === 'completed') {
    x.save()
    x.translate(W - 76, H + 66)
    x.rotate(-0.22)
    const bw = 78
    const bh = 56
    x.fillStyle = '#c7301f'
    x.strokeStyle = 'rgba(255,255,255,0.6)'
    x.lineWidth = 3
    x.beginPath()
    x.roundRect(-bw / 2, -bh / 2, bw, bh, 8)
    x.fill()
    x.stroke()
    x.fillStyle = '#fff'
    x.font = '700 30px "Zen Maru Gothic", serif'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText('達成', 0, 2)
    x.restore()
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('no blob'))
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daruma-${slug(goal.title)}${goal.status === 'completed' ? '-logrado' : ''}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      resolve()
    }, 'image/png')
  })
}
