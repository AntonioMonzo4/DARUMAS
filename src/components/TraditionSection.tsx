import { motion } from 'framer-motion'
import { DARUMA_COLORS } from '../types'
import Daruma from './Daruma'

const STEPS = [
  {
    n: '一',
    title: 'Fijas la meta',
    text: 'Le pintas un solo ojo (el izquierdo). El otro queda vacío: el daruma aún no ha cumplido.',
  },
  {
    n: '二',
    title: 'Te vigila',
    text: 'Sin el segundo ojo, cada vez que lo ves te recuerda tu promesa. No puedes ignorarlo.',
  },
  {
    n: '三',
    title: 'La cumples',
    text: 'Pintas el ojo restante. El daruma "abre los ojos": 遂行, logro completado.',
  },
]

export function TraditionSection() {
  return (
    <section className="tradition" aria-label="Significado de los darumas">
      <div className="tradition-intro">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="tradition-ja">「伝統」</span> Por qué se pinta un ojo
        </motion.h2>

        <p className="tradition-lead">
          El daruma (達磨) representa al monje <strong>Bodhidharma</strong>, fundador del zen, que
          meditó tantos años que se le durmieron brazos y piernas — por eso la muñeca no los tiene.
          Tiene peso en la base y <strong>siempre se levanta si cae</strong>: el lema es{' '}
          <em>七転八起</em>, «cuelga siete veces, levántate ocho».
        </p>

        <div className="tradition-steps">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              className="step-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
            >
              <span className="step-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </motion.div>
          ))}
        </div>

        <p className="tradition-note">
          En esta web el daruma digital cumple el mismo papel: <strong>cada muñeco es un objetivo</strong>
          . Verlo con un ojo vacío te aprieta para no abandonar; verlo con dos ojos es tu historial de
          logros.
        </p>
      </div>

      <div className="color-meanings">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <span className="tradition-ja">「色」</span> Significado de cada color
        </motion.h2>

        <div className="color-grid">
          {Object.entries(DARUMA_COLORS).map(([key, pal], i) => (
            <motion.article
              key={key}
              className="color-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            >
              <div className="color-card-daruma">
                <Daruma eyes={2} color={key} kanji={pal.swatchKanji} size={92} />
              </div>
              <div className="color-card-text">
                <h3>{pal.label}</h3>
                <p>{pal.meaning}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
