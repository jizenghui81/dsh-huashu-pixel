/**
 * dsh-huashu-pixel · 浏览器半边的离线冒烟测试
 *
 * 手写 bundle 没有类型检查、也没有构建期校验，所以这里用最小 DOM / React / cordis 替身
 * 把 `lib/client.js` 真跑一遍，断言六件事：
 *   1. factory 能加载、apply 不抛错；
 *   2. 样式表、CRT 覆层、token 层真的挂上，且关闭总开关/卸载时真的回收；
 *   3. token 表每一格都是 `{light, dark}` 字符串对（`overrideTokens` 的硬契约）；
 *   4. `<html>` 上的状态位跟随档位，并写进 localStorage；
 *   5. 设置行注册到 `settings.general.item` 且能渲染（用 React 替身）；
 *   6. `__HUASHU_PIXEL__` 调试 API 与设置行是同一份状态。
 *
 * 运行：node test/smoke.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** ---------- 最小 DOM 替身 ---------- */

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase()
    this.dataset = {}
    this.attributes = new Map()
    this.children = []
    this.parent = null
    this.textContent = ''
    this.style = {}
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value))
    if (name === 'data-plugin') this.dataset.plugin = String(value)
    if (name === 'data-plugin-css') this.dataset.pluginCss = String(value)
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null }
  removeAttribute(name) { this.attributes.delete(name) }
  appendChild(child) { child.parent = this; this.children.push(child); return child }
  remove() {
    if (this.parent === null) return
    const index = this.parent.children.indexOf(this)
    if (index >= 0) this.parent.children.splice(index, 1)
    this.parent = null
  }
}

function makeDom() {
  const head = new FakeElement('head')
  const body = new FakeElement('body')
  const documentElement = new FakeElement('html')
  const document = {
    head,
    body,
    documentElement,
    createElement: (tag) => new FakeElement(tag),
    querySelector: () => null
  }
  const store = new Map()
  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  }
  const window = { document, location: { origin: 'http://127.0.0.1:19387' }, localStorage }
  return { window, document, head, body, documentElement, localStorage, store }
}

/** ---------- React 替身（只要 createElement / useSyncExternalStore） ---------- */

const ReactStub = {
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children: children.flat() }
  },
  useSyncExternalStore(subscribe, getSnapshot) {
    subscribe(() => {})
    return getSnapshot()
  }
}

/** ---------- 假 cordis 上下文 ---------- */

function makeContext(dom, captured) {
  const cleanups = []
  const effectBase = (fn) => {
    const dispose = fn()
    if (typeof dispose === 'function') cleanups.push(dispose)
  }
  const ctx = {
    logger: { info() {}, warn() {} },
    effect: effectBase,
    theme: {
      overrideTokens(source, tokens) {
        captured.sources.push(source)
        captured.tokens = tokens
        captured.disposed = false
        return () => { captured.disposed = true }
      }
    },
    locale: { register: (ns, dicts) => { captured.locale = { ns, dicts }; return () => {} } },
    slots: {
      inject(slot, register) { captured.slot = slot; register() },
      register(options, component) { captured.registration = options; captured.component = component; return () => {} }
    }
  }
  return { ctx, cleanups }
}

/** ---------- 加载手写 bundle ---------- */

function loadClient(dom) {
  const source = readFileSync(fileURLToPath(new URL('../lib/client.js', import.meta.url)), 'utf8')
  let captured
  dom.window.__ModuleLoader__ = { load: (record) => { captured = record } }
  const run = new Function('window', 'document', 'location', 'localStorage', 'console', `${source}\n`)
  run(dom.window, dom.document, dom.window.location, dom.window.localStorage, { info() {}, warn() {} })
  assert.ok(captured, 'bundle 没有调用 __ModuleLoader__.load')
  assert.equal(captured.id, 'dsh-huashu-pixel')
  return captured.factory((specifier) => {
    assert.equal(specifier, 'react', `bundle 只应 require react，实际 require 了 ${specifier}`)
    return ReactStub
  })
}

/** ---------- 用例 1：默认档全链路 ---------- */

const dom = makeDom()
const captured = { sources: [], tokens: null, disposed: false }
const { ctx, cleanups } = makeContext(dom, captured)
const client = loadClient(dom)

assert.deepEqual(client.inject, ['theme', 'slots', 'locale'], 'inject 必须是主题/槽位/文案三个核心服务')
assert.equal(typeof client.apply, 'function')

client.apply(ctx)

// 样式表
const styleTags = dom.head.children.filter((el) => el.tagName === 'STYLE')
assert.equal(styleTags.length, 1, '应当注入恰好一张样式表')
const css = styleTags[0].textContent
for (const needle of [
  '@font-face', 'huashu-pixel-cjk-12.woff2', 'huashu-pixel-latin-8.woff2',
  '/huashu-pixel/fonts/', 'data-shimmer', 'data-running', 'data-turn-start', 'data-turn-end',
  'data-px-motion="arcade"', 'prefers-reduced-motion'
]) {
  assert.ok(css.includes(needle), `样式表缺少 ${needle}`)
}
assert.equal(styleTags[0].dataset.plugin, 'dsh-huashu-pixel')

// macOS 拖拽区护栏：覆层/开屏自检是 body 直接子元素，会被官方
// `body>:not(#root){-webkit-app-region:no-drag}` 命中，进而把整个窗口从拖拽区减掉。
// 必须显式复位成 initial（不是 none：实测这一代 Chromium 把显式 none 算成 no-drag）。
const dragGuard = 'html[data-platform="darwin"] [data-dsh-huashu-pixel-overlay],\n'
  + 'html[data-platform="darwin"] [data-px-boot]{-webkit-app-region:initial !important}'
assert.ok(css.includes(dragGuard), '样式表缺少 macOS 拖拽区复位规则（initial !important）')
assert.ok(!/-webkit-app-region:none/.test(css), '不要用 -webkit-app-region:none（本代 Chromium 会算成 no-drag）')

// CRT 覆层
const overlays = () => dom.body.children.filter((el) => el.getAttribute('data-dsh-huashu-pixel-overlay') !== null)
assert.equal(overlays().length, 1, '应当追加恰好一个 CRT 覆层')

// token 层契约
assert.deepEqual(captured.sources, ['dsh-huashu-pixel'], 'token 层 source 应当是包名')
const tokenNames = Object.keys(captured.tokens)
assert.ok(tokenNames.length > 100, `token 数量偏少：${tokenNames.length}`)
for (const name of tokenNames) {
  const pair = captured.tokens[name]
  assert.equal(typeof pair, 'object', `${name} 不是对象`)
  assert.equal(typeof pair.light, 'string', `${name}.light 不是字符串`)
  assert.equal(typeof pair.dark, 'string', `${name}.dark 不是字符串`)
  assert.ok(pair.light.length > 0 && pair.dark.length > 0, `${name} 有空值`)
}
for (const required of [
  '--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-border-l1',
  '--dsw-static-neutral-bluish-1000', '--dsw-static-neutral-bluish-50',
  '--dsw-static-deepseek-500', '--dsw-alias-border-l4'
]) {
  assert.ok(tokenNames.includes(required), `token 表缺少 ${required}`)
}
assert.notEqual(captured.tokens['--dsw-alias-bg-base'].light, captured.tokens['--dsw-alias-bg-base'].dark)

// 圆角已移出 token 表：改由样式表按强度三档声明（切档才能即时生效）
assert.ok(!tokenNames.includes('--dsw-radius-md'), '圆角不应再进 token 表')
for (const tier of ['light', 'standard', 'strong']) {
  assert.ok(css.includes(`html[data-px-intensity="${tier}"] body{`), `样式表缺少 ${tier} 档圆角规则`)
}
assert.ok(css.includes('html[data-px-intensity="strong"] body{--dsw-radius-xs:0px'), '浓档应当把 xs 圆角压到 0')

// 默认状态位
assert.equal(dom.documentElement.getAttribute('data-px-motion'), 'normal')
assert.equal(dom.documentElement.getAttribute('data-px-scanlines'), 'on')
assert.equal(dom.documentElement.getAttribute('data-px-fonts'), 'headings')
assert.equal(dom.documentElement.getAttribute('data-px-intensity'), 'standard')

// 设置行
assert.equal(captured.slot, 'settings.general.item')
assert.equal(captured.registration.name, 'settings.general.item')
assert.equal(captured.registration.id, 'huashu-pixel')
assert.equal(captured.registration.locale, 'settings.dsh-huashu-pixel')
assert.equal(typeof captured.component, 'function')
assert.equal(captured.locale.ns, 'settings.dsh-huashu-pixel')
assert.equal(captured.locale.dicts.zh['px.title'], '花书像素')
assert.equal(captured.locale.dicts.en['px.title'], 'Huashu Pixel')

// 设置行能渲染（文案函数直接回显 key，检查结构里确实带上了四组档位）
const tree = captured.component({ t: (key) => key })
assert.equal(tree.type, 'div')
assert.ok(JSON.stringify(tree).includes('px.intensity'))
assert.ok(JSON.stringify(tree).includes('px.motion'))
assert.ok(JSON.stringify(tree).includes('px.scanlines'))
assert.ok(JSON.stringify(tree).includes('px.fonts'))

// 调试 API = 设置行的同一份状态，并且写进 localStorage
assert.equal(typeof dom.window.__HUASHU_PIXEL__.set, 'function')
dom.window.__HUASHU_PIXEL__.set({ motion: 'arcade', scanlines: false, pixelFonts: 'all', intensity: 'strong' })
assert.equal(dom.documentElement.getAttribute('data-px-motion'), 'arcade')
assert.equal(dom.documentElement.getAttribute('data-px-fonts'), 'all')
assert.equal(dom.documentElement.getAttribute('data-px-intensity'), 'strong')
assert.equal(dom.documentElement.getAttribute('data-px-scanlines'), 'off')
assert.equal(overlays().length, 0, '关掉扫描线后覆层应移除')
assert.equal(dom.store.get('dsh-huashu-pixel.motion'), 'arcade')
assert.equal(dom.store.get('dsh-huashu-pixel.scanlines'), '0')
assert.equal(dom.store.get('dsh-huashu-pixel.pixelFonts'), 'all')
assert.equal(dom.store.get('dsh-huashu-pixel.intensity'), 'strong')

// 关闭总开关：视觉全回收
dom.window.__HUASHU_PIXEL__.set({ enabled: false })
assert.equal(dom.head.children.filter((el) => el.tagName === 'STYLE').length, 0, '关闭后样式表应移除')
assert.equal(captured.disposed, true, '关闭后 token 层应被回收')
assert.equal(dom.documentElement.getAttribute('data-px-motion'), 'off')
assert.equal(dom.documentElement.getAttribute('data-px-fonts'), 'off')
assert.equal(dom.documentElement.getAttribute('data-px-scanlines'), 'off')

// 再打开：资源重新挂上（扫描线此前被单独关掉，所以覆层要等它一起开）
dom.window.__HUASHU_PIXEL__.set({ enabled: true })
assert.equal(dom.head.children.filter((el) => el.tagName === 'STYLE').length, 1, '重新开启后样式表应回来')
assert.equal(overlays().length, 0, '扫描线仍关着时不应有覆层')
dom.window.__HUASHU_PIXEL__.set({ scanlines: true })
assert.equal(overlays().length, 1, '打开扫描线后覆层应回来')

// 卸载：全部收干净
for (const dispose of cleanups) if (typeof dispose === 'function') dispose()
assert.equal(dom.head.children.filter((el) => el.tagName === 'STYLE').length, 0)
assert.equal(overlays().length, 0)
assert.equal(dom.window.__HUASHU_PIXEL__, undefined)
for (const attr of ['data-px-motion', 'data-px-scanlines', 'data-px-fonts', 'data-px-intensity']) {
  assert.equal(dom.documentElement.getAttribute(attr), null, `卸载后 ${attr} 应移除`)
}

/** ---------- 用例 2：持久化生效（刷新后按上次的档位起） ---------- */

const dom2 = makeDom()
dom2.localStorage.setItem('dsh-huashu-pixel.enabled', '0')
dom2.localStorage.setItem('dsh-huashu-pixel.motion', 'quiet')
const captured2 = { sources: [], tokens: null, disposed: false }
const second = makeContext(dom2, captured2)
loadClient(dom2).apply(second.ctx)
assert.equal(dom2.documentElement.getAttribute('data-px-motion'), 'off', '上次关了总开关，刷新后应当仍是关')
assert.equal(dom2.head.children.filter((el) => el.tagName === 'STYLE').length, 0)

const dom3 = makeDom()
dom3.localStorage.setItem('dsh-huashu-pixel.motion', 'quiet')
dom3.localStorage.setItem('dsh-huashu-pixel.pixelFonts', 'all')
const captured3 = { sources: [], tokens: null, disposed: false }
loadClient(dom3).apply(makeContext(dom3, captured3).ctx)
assert.equal(dom3.documentElement.getAttribute('data-px-motion'), 'quiet')
assert.equal(dom3.documentElement.getAttribute('data-px-fonts'), 'all')

/** ---------- 用例 3：坏值兜底 ---------- */

const dom4 = makeDom()
dom4.localStorage.setItem('dsh-huashu-pixel.motion', 'bogus')
dom4.localStorage.setItem('dsh-huashu-pixel.pixelFonts', 'bogus')
loadClient(dom4).apply(makeContext(dom4, { sources: [], tokens: null, disposed: false }).ctx)
assert.equal(dom4.documentElement.getAttribute('data-px-motion'), 'normal', '非法档位应回落默认')
assert.equal(dom4.documentElement.getAttribute('data-px-fonts'), 'headings', '非法范围应回落默认')

console.log(`smoke: 全部通过（${tokenNames.length} 个 token，3 个场景，14 组断言）`)
