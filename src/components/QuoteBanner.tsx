import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const QUOTES = [
  { es: 'Cae siete veces, levántate ocho.', ja: '七転八起' },
  { es: 'Un gran viaje comienza con un solo paso.', ja: '千里の道も一歩から' },
  { es: 'El esfuerzo diario hace visible la suerte.', ja: '地道な努力' },
  { es: 'Pinta un ojo: la meta ya es real.', ja: '一念発起' },
  { es: 'Constancia sobre la perfección.', ja: '継続は力なり' },
  { es: 'Hoy un poco, mañana mucho.', ja: '石の上にも三年' },
]

export function QuoteBanner() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % QUOTES.length)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  const quote = useMemo(() => QUOTES[index], [index])

  return (
    <div className="quote-banner" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="quote-inner"
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="quote-ja">{quote.ja}</span>
          <span className="quote-es">{quote.es}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
