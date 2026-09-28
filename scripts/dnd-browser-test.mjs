// Real-browser DnD verification via CDP (Edge/Chromium)
const CDP = 'http://127.0.0.1:9333'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let list = []
for (let i = 0; i < 40; i++) {
  try {
    list = await (await fetch(`${CDP}/json/list`)).json()
    if (list.some((t) => t.type === 'page')) break
  } catch {
    /* edge not up yet */
  }
  await sleep(500)
}
const page =
  list.find((t) => t.type === 'page' && t.url.startsWith('http://localhost')) ??
  list.find((t) => t.type === 'page' && t.url.startsWith('about:blank')) ??
  list.find((t) => t.type === 'page')
if (!page) {
  console.log('FAIL: no page target')
  process.exit(1)
}

const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.text ?? 'exception')
  }
}
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id
    pending.set(i, (m) => {
      if (m.error) console.log(`CDP error [${method}]:`, m.error.message)
      res(m)
    })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
await new Promise((r) => (ws.onopen = r))
await send('Runtime.enable')
await send('Page.enable')

const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.result?.exceptionDetails) return { error: r.result.exceptionDetails.text }
  return { value: r.result?.result?.value }
}

// make sure we are on the app
await send('Page.navigate', { url: 'http://localhost:5173/' })

// wait for the app + at least 3 cards
let count = 0
for (let i = 0; i < 40; i++) {
  const r = await evalJs('document.querySelectorAll(".goal-card").length')
  count = r.value ?? 0
  if (count >= 3) break
  await sleep(500)
}
console.log('cards:', count)
if (count < 3) {
  console.log('FAIL: app not rendering cards')
  process.exit(1)
}

const draggableAttr = await evalJs('document.querySelector(".goal-card").getAttribute("draggable")')
console.log('draggable attr:', JSON.stringify(draggableAttr.value))

const orderNow = async () => {
  const r = await evalJs(
    'JSON.stringify([...document.querySelectorAll(".goal-card .goal-title")].map(t => t.textContent))',
  )
  return JSON.parse(r.value ?? '[]')
}

const before = await orderNow()
console.log('order before:', before.join(' | '))

// --- Test A: synthetic native DragEvent sequence (React delegation path) ---
const a = await evalJs(`(() => {
  const cards = [...document.querySelectorAll('.goal-card')]
  const dt = new DataTransfer()
  cards[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
  const got = dt.getData('text/plain')
  const target = cards[2]
  target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
  target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  cards[0].dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
  return JSON.stringify({ gotData: got })
})()`)
console.log('A: dataTransfer set by handler:', a.value ?? a.error)
await sleep(400)
const afterA = await orderNow()
console.log('A order:', afterA.join(' | '))
console.log('A RESULT:', JSON.stringify(before) !== JSON.stringify(afterA) ? 'REORDERED' : 'NO CHANGE')

// --- Test B: honest native route: setInterceptDrags + real mouse gesture ---
await send('Page.reload')
await sleep(1800)
const beforeB = await orderNow()
const rectR = await evalJs(
  'JSON.stringify([...document.querySelectorAll(".goal-card")].map(c => { const r = c.getBoundingClientRect(); return { x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) } }))',
)
const rects = JSON.parse(rectR.value ?? '[]')
const vh = await evalJs('window.innerHeight')
console.log('viewport h:', vh.value, '| rects:', rects.length)
const visible = rects.length >= 3 && rects[0].y > 0 && rects[2].y < (vh.value ?? 0)

let intercepted = null
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Input.dragIntercepted') intercepted = m.params.data
})

if (visible) {
  await evalJs(`(() => {
    window.__dnd = { start: 0, over: 0, drop: 0 }
    const add = (t, k) => document.addEventListener(t, () => { window.__dnd[k]++ }, true)
    add('dragstart', 'start'); add('dragover', 'over'); add('drop', 'drop')
    return true
  })()`)
  await send('Input.setInterceptDrags', { enabled: true })
  const a0 = rects[0]
  const a2 = rects[2]
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a0.x, y: a0.y, buttons: 0 })
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: a0.x,
    y: a0.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  })
  for (let s = 1; s <= 10; s++) {
    const x = Math.round(a0.x + ((a2.x - a0.x) * s) / 10)
    const y = Math.round(a0.y + ((a2.y - a0.y) * s) / 10)
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 1 })
    await sleep(70)
    if (intercepted) break
  }
  console.log('B dragIntercepted:', intercepted ? 'YES' : 'NO')
  if (intercepted) {
    const data = intercepted
    await send('Input.dispatchDragEvent', { type: 'dragEnter', x: a2.x, y: a2.y, data })
    await send('Input.dispatchDragEvent', { type: 'dragOver', x: a2.x, y: a2.y, data })
    await send('Input.dispatchDragEvent', { type: 'drop', x: a2.x, y: a2.y, data })
  }
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: a2.x,
    y: a2.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
  })
  await sleep(500)
  const countsB = await evalJs('JSON.stringify(window.__dnd)')
  console.log('B native events reached page:', countsB.value)
  const afterB = await orderNow()
  console.log('B order:', afterB.join(' | '))
  console.log('B RESULT:', JSON.stringify(afterB) !== JSON.stringify(beforeB) ? 'REORDERED' : 'NO CHANGE')
} else {
  console.log('B: skipped (cards outside viewport)')
}

// --- console/page errors ---
console.log('page errors:', errors.length ? errors.join(' ; ') : 'none')

// --- screenshot for visual check (after reload to restore order) ---
await send('Page.reload')
await sleep(2000)
const shot = await send('Page.captureScreenshot', { format: 'png' })
if (shot.result?.data) {
  const { writeFileSync } = await import('node:fs')
  writeFileSync('screenshot-header.png', Buffer.from(shot.result.data, 'base64'))
  console.log('screenshot saved: screenshot-header.png')
}
ws.close()
process.exit(0)
