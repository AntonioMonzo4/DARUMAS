const fs = require('fs')
const path = require('path')

const css = fs.readFileSync('src/index.css', 'utf8')
const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))

const files = []
;(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (/\.tsx$/.test(f)) files.push(p)
  }
})('src')

const used = new Map()
const add = (cls, file) => {
  for (const c of cls.split(/\s+/)) {
    if (!c || c.includes('$') || c.includes('{')) continue
    if (!used.has(c)) used.set(c, new Set())
    used.get(c).add(path.basename(file))
  }
}

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  for (const m of src.matchAll(/className="([^"]+)"/g)) add(m[1], f)
  for (const m of src.matchAll(/className={`([^`$]+)`}/g)) add(m[1], f)
}

const missing = [...used.keys()].filter((c) => !defined.has(c)).sort()
console.log('MISSING CLASSES:')
for (const c of missing) console.log(' ', c, '<-', [...used.get(c)].join(', '))

console.log('\nKEY SELECTORS:')
for (const sel of [
  '.btn-mini',
  '.sound-btn',
  '.goal-top',
  '.stat-bar-wrap',
  '.header',
  '.data-actions',
  '.toast',
  '.modal-backdrop',
  '.subtasks',
  '.drag-handle',
  '.drag-over',
  '.month-bars',
  '.stat-chart-wrap',
  '.stat-num.streak',
  '.form-error',
  '.field-row',
  '.add-form-grid',
  '.stat-bar-label',
  '.goal-actions',
  '.confirm-row',
]) {
  const re = new RegExp('\\' + sel + '\\s*[{,]', 'm')
  console.log(' ', sel, re.test(css) ? 'OK' : 'MISSING')
}
