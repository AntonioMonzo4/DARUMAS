import { AnimatePresence, motion } from 'framer-motion'
import type { Piece } from '../lib/confetti'

export function Confetti({ pieces }: { pieces: Piece[] }) {
  return (
    <div className="confetti-layer" aria-hidden="true">
      <AnimatePresence>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className="confetti-piece"
            style={{
              width: p.size,
              height: p.height,
              background: p.color,
              left: p.x,
              top: p.y,
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{
              x: p.tx - p.x,
              y: [0, p.ty - p.y - 90, p.ty - p.y],
              opacity: [1, 1, 0],
              rotate: p.rot,
              scale: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: p.dur,
              ease: [0.15, 0.6, 0.4, 1],
              times: [0, 0.35, 1],
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
