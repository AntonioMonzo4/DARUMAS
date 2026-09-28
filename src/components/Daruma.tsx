import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { colorKeyOf } from '../types'

interface DarumaProps {
  eyes: 0 | 1 | 2
  color: string
  kanji?: string
  size?: number
  animatePaint?: boolean
  className?: string
}

/** Image is 512×534; eye centers measured on source photo. */
const W = 512
const H = 534
const RIGHT_EYE = { x: 323, y: 188 }
const LEFT_EYE = { x: 183, y: 188 }
/** Erased 続 sat here on the belly (center of old bbox, scaled). */
const KANJI = { x: 252, y: 400 }

function BrushStroke({
  x,
  y,
  playKey,
}: {
  x: number
  y: number
  playKey: number
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.svg
        key={playKey}
        className="daruma-brush"
        viewBox={`${x - 70} ${y - 55} 140 110`}
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.35 } }}
      >
        <motion.path
          d={`M ${x - 48} ${y + 22} Q ${x - 10} ${y - 40} ${x + 52} ${y - 18}`}
          fill="none"
          stroke="#f6dfa0"
          strokeWidth={16}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: [1, 1, 0] }}
          transition={{
            pathLength: { duration: 0.45, ease: 'easeOut' },
            opacity: { duration: 0.7, times: [0, 0.55, 1], delay: 0.35 },
          }}
        />
        <motion.circle
          cx={x}
          cy={y}
          r={28}
          fill="none"
          stroke="#ffe9a8"
          strokeWidth={3}
          initial={{ scale: 0.4, opacity: 0.9 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      </motion.svg>
    </AnimatePresence>
  )
}

export function Daruma({
  eyes,
  color,
  kanji = '続',
  size = 160,
  animatePaint = false,
  className,
}: DarumaProps) {
  const key = colorKeyOf(color)
  const src = `/daruma/${key}/eyes-${eyes}.png`
  const [loaded, setLoaded] = useState(false)
  const [paintTick, setPaintTick] = useState(0)
  const [prevEyes, setPrevEyes] = useState(eyes)

  if (prevEyes !== eyes) {
    setPrevEyes(eyes)
    if (animatePaint && eyes > 0) {
      setPaintTick((t) => t + 1)
    }
  }

  // first paint animation when mounting with animatePaint (preview / card enter)
  const [introDone, setIntroDone] = useState(!animatePaint)
  useEffect(() => {
    if (animatePaint && !introDone && eyes > 0) {
      const t = window.setTimeout(() => setIntroDone(true), 900)
      return () => window.clearTimeout(t)
    }
  }, [animatePaint, introDone, eyes])

  const showBrush = animatePaint && (paintTick > 0 || !introDone)
  const brushEye = eyes >= 2 ? LEFT_EYE : RIGHT_EYE
  const brushKey = paintTick > 0 ? paintTick : -1

  const height = Math.round(size * (H / W))

  return (
    <div
      className={`daruma-img ${className ?? ''}`}
      style={{ width: size, height }}
      role="img"
      aria-label={`Daruma con ${eyes} de 2 ojos pintados`}
    >
      <img
        key={src}
        src={src}
        width={size}
        height={height}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />

      <span
        className="daruma-kanji"
        aria-hidden="true"
        style={{
          left: `${(KANJI.x / W) * 100}%`,
          top: `${(KANJI.y / H) * 100}%`,
          fontSize: size * 0.185,
        }}
      >
        {kanji}
      </span>

      {showBrush && brushKey !== null && (
        <BrushStroke x={brushEye.x} y={brushEye.y} playKey={brushKey} />
      )}
    </div>
  )
}

export default Daruma
