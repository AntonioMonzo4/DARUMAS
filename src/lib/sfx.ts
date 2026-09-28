let ctx: AudioContext | null = null
let enabled = typeof localStorage !== 'undefined' && localStorage.getItem('daruma-sound') !== '0'

export function setSoundEnabled(v: boolean) {
  enabled = v
  try {
    localStorage.setItem('daruma-sound', v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function soundEnabled() {
  return enabled
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function playBrush() {
  if (!enabled) return
  const a = audio()
  if (!a) return
  const dur = 0.16
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5) * (0.35 + 0.65 * Math.sin(t * Math.PI))
  }
  const src = a.createBufferSource()
  src.buffer = buf
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2400
  bp.Q.value = 0.8
  const g = a.createGain()
  g.gain.value = 0.22
  src.connect(bp).connect(g).connect(a.destination)
  src.start()
}

export function playTaiko() {
  if (!enabled) return
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const osc = a.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(140, t)
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.18)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + 0.42)

  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * 0.05), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3)
  }
  const s = a.createBufferSource()
  s.buffer = buf
  const hp = a.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 800
  const g2 = a.createGain()
  g2.gain.value = 0.3
  s.connect(hp).connect(g2).connect(a.destination)
  s.start(t)
}

export function playTick() {
  if (!enabled) return
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const osc = a.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 950
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + 0.09)
}
