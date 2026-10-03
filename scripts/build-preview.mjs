/**
 * 从**真 bundle** 生成预览页：把 `lib/client.js` 放在最小 DOM/React/cordis 替身里跑一遍，
 * 取它真正注入的那张样式表，套到一份仿 DSH 结构的静态稿上，产出
 * `preview.html`（亮色）与 `preview-dark.html`（暗色）。
 *
 * 为什么要有它：
 *  - 开发时不用启动宿主就能看配色/字体/描边/动效；
 *  - 上架材料要截图，截图必须来自真 bundle，不能是手抄的第二份 CSS（会漂移）。
 *
 * 运行：node scripts/build-preview.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

/** ---------- 最小 DOM / React / cordis 替身（与 test/smoke.mjs 同一套思路） ---------- */

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase()
    this.dataset = {}
    this.attributes = new Map()
    this.children = []
    this.textContent = ''
    this.style = {}
  }
  addEventListener() {}
  setAttribute(name, value) {
    this.attributes.set(name, String(value))
    if (name === 'data-plugin') this.dataset.plugin = String(value)
    if (name === 'data-plugin-css') this.dataset.pluginCss = String(value)
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null }
  removeAttribute(name) { this.attributes.delete(name) }
  appendChild(child) { this.children.push(child); return child }
  remove() {}
}

const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot()
}

const head = new FakeElement('head')
const body = new FakeElement('body')
const documentElement = new FakeElement('html')
const window = {
  document: { head, body, documentElement, createElement: (tag) => new FakeElement(tag) },
  location: { origin: '' },
  localStorage: { getItem: () => null, setItem: () => {} }
}
const source = readFileSync(`${root}lib/client.js`, 'utf8')
let record
window.__ModuleLoader__ = { load: (r) => { record = r } }
new Function('window', 'document', 'location', 'localStorage', 'console', `${source}\n`)(
  window, window.document, window.location, window.localStorage, { info() {}, warn() {} }
)

const ctx = {
  logger: { info() {}, warn() {} },
  effect: (fn) => { fn() },
  theme: { overrideTokens: () => () => {} },
  locale: { register: () => () => {} },
  slots: { inject: (slot, register) => register(), register: () => () => {} }
}
record.factory((specifier) => {
  if (specifier !== 'react') throw new Error(`预览构建：bundle 只应 require react，实际 ${specifier}`)
  return ReactStub
}).apply(ctx)

const css = head.children.find((el) => el.tagName === 'STYLE').textContent
  // 预览页用相对路径取字体（file:// 下也能开）
  .replaceAll("url('huashu-pixel/fonts/", "url('./fonts/")
  .replaceAll("url('/huashu-pixel/fonts/", "url('./fonts/")


/**
 * 预览页专用：官方 alias 层的**公式**补丁。
 *
 * 真宿主里这一层由 `@deepseek-ai/dsh-client-ui-theme` 的 design-platform.css 声明
 * （`--dsw-alias-label-primary: var(--dsw-static-neutral-bluish-1000)` 这类）。预览页不带
 * 宿主样式，所以这里按同样的公式补上**预览用到的那些**——公式照抄，值不照抄：
 * 值全部走我们自己覆盖过的静态色阶，所以预览与真机的换色结果一致。
 */
const PREVIEW_ALIAS_SHIM = `
body{
  --dsw-alias-label-primary:var(--dsw-static-neutral-bluish-1000);
  --dsw-alias-label-secondary:var(--dsw-static-neutral-bluish-700);
  --dsw-alias-label-tertiary:var(--dsw-static-neutral-bluish-600);
  --dsw-alias-label-caption:var(--dsw-static-neutral-bluish-400);
  --dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-00);
  --dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-1000);
  --dsw-alias-brand-text:var(--dsw-static-neutral-bluish-1000);
  --dsw-specific-bubble:var(--dsw-static-deepseek-50);
  --dsw-alias-markdown-code-block:var(--dsw-static-neutral-bluish-50);
  --dsw-alias-state-error-primary:var(--dsw-static-red-600);
}
body[data-ds-dark-theme]{
  --dsw-alias-label-primary:var(--dsw-static-neutral-bluish-50);
  --dsw-alias-label-secondary:var(--dsw-static-neutral-bluish-300);
  --dsw-alias-label-tertiary:var(--dsw-static-neutral-bluish-400);
  --dsw-alias-label-caption:var(--dsw-static-neutral-bluish-600);
  --dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-1000);
  --dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-50);
  --dsw-alias-brand-text:var(--dsw-static-neutral-bluish-50);
  --dsw-specific-bubble:var(--dsw-static-neutral-bluish-850);
  --dsw-alias-markdown-code-block:var(--dsw-static-neutral-bluish-900);
  --dsw-alias-state-error-primary:var(--dsw-static-red-400);
}`

/** ---------- 仿 DSH 结构（只用官方稳定属性） ---------- */

const mock = String.raw`
<div class="app">
  <aside class="sidebar" data-sidebar>
    <div class="brand">HUASHU PIXEL</div>
    <div class="jJkEga_sessionRow" data-conversation-session><span class="jJkEga_slot"></span><span class="jJkEga_title">暖调像素主题</span></div>
    <div class="jJkEga_sessionRow jJkEga_selected" data-conversation-session><span class="jJkEga_slot"></span><span class="jJkEga_title">老式街机动效</span></div>
    <div class="jJkEga_sessionRow" data-conversation-session><span class="jJkEga_slot"></span><span class="jJkEga_title">插件市场范式</span></div>
    <div class="sideFoot">v1.0.0 · 2026-10-03</div>
  </aside>
  <main class="main" data-conversation-scroll>
    <div class="header" data-conversation-header-leading>
      <span class="crumb">会话</span><h1>花书像素 · 主题验收</h1>
      <div class="tabs" data-conversation-tabs><span class="tab">对话</span><span class="tab">轨迹</span></div>
    </div>

    <div class="turn" data-turn-start>
      <div class="bubble user" data-side="right"><p>把界面换成花书那套像素风，并给流式输出加上老机器的动效。</p></div>
      <div class="assistant">
        <p data-shimmer>正在按花书像素文稿的配色重建 token 层<span data-shimmer-text></span></p>
        <div class="tool" data-tool data-running>
          <span class="dot" data-state="ongoing"></span>bash · 校验字体路由
        </div>
        <blockquote>亮色是设计文稿，暗色切到老式街机的磷光。</blockquote>
        <table><thead><tr><th>层</th><th>做法</th></tr></thead>
          <tbody>
            <tr><td>配色</td><td>130 个 --dsw-* token</td></tr>
            <tr><td>形状</td><td>方角 + 硬描边 + 硬投影</td></tr>
            <tr><td>字体</td><td>Ark Pixel 12px / Press Start 2P</td></tr>
          </tbody></table>
        <div class="chips"><span data-composer-chip>动效 标准</span><span data-composer-chip>扫描线</span><span data-composer-chip>像素字体</span></div>
      </div>
    </div>

    <div class="composer" data-composer-card>
      <div class="composerInput" data-composer-input contenteditable="true">下一句从这里开始……</div>
      <div class="composerRow">
        <button>发送</button><button class="ghost">附加</button>
        <span class="caption" data-caption>Enter 发送 · Shift+Enter 换行</span>
      </div>
    </div>
    <div class="turnEnd" data-turn-end>— 本轮结束 —</div>
  </main>
</div>
`

const shell = (dark, tier = 'standard') => `<!DOCTYPE html>
<html lang="zh-CN" data-px-motion="normal" data-px-scanlines="on" data-px-fonts="headings" data-px-intensity="${tier}">
<head>
<meta charset="UTF-8">
<title>dsh-huashu-pixel 预览${dark ? '（暗）' : '（亮）'} · ${tier}</title>
<style>
${css}
${PREVIEW_ALIAS_SHIM}
/* ── 仅预览页自己的排版：模拟宿主容器，不属于主题 ── */
html,body{margin:0;height:100%}
body{${dark ? '' : ''}}
.app{display:flex;min-height:100vh}
.sidebar{width:240px;flex-shrink:0;background:var(--dsw-specific-sidebar-fill);border-right:1px solid var(--dsw-alias-border-l1);padding:16px 12px;display:flex;flex-direction:column;gap:8px}
.brand{font-family:var(--px-font-display);font-size:12px;letter-spacing:.08em;color:var(--px-accent);margin-bottom:8px}
.jJkEga_sessionRow{padding:0 8px;border-radius:var(--dsw-radius-md);font-size:13px;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:6px;height:32px}
.jJkEga_title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sideFoot{margin-top:auto;font-family:var(--px-font-ui);font-size:12px;color:var(--dsw-alias-label-caption)}
.main{flex:1;padding:20px 28px;display:flex;flex-direction:column;gap:16px;min-width:0}
.header h1{font-size:20px;margin:2px 0 8px;color:var(--dsw-alias-label-primary)}
.crumb,.tabs .tab{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-right:10px}
.turn{position:relative;display:flex;flex-direction:column;gap:14px}
.bubble{max-width:70%;padding:10px 14px;border-radius:var(--dsw-radius-lg);font-size:14px}
.bubble.user{align-self:flex-end;background:var(--dsw-specific-bubble);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-border-l1)}
.assistant{display:flex;flex-direction:column;gap:12px;font-size:14px;color:var(--dsw-alias-label-primary)}
.tool{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-markdown-code-block);font-family:var(--ds-font-family-code);font-size:12px;color:var(--dsw-alias-label-secondary);align-self:flex-start}
.dot{width:8px;height:8px;border-radius:50%;background:var(--px-accent);display:inline-block}
.chips{display:flex;gap:8px;flex-wrap:wrap}
[data-composer-chip]{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);padding:3px 10px;border-radius:999px}
table{border-collapse:collapse;font-size:13px;width:100%;max-width:560px}
th,td{border:1px solid var(--dsw-alias-border-l2);padding:6px 10px;text-align:center}
.composer{margin-top:auto;background:var(--dsw-alias-bg-layer-1);padding:12px;display:flex;flex-direction:column;gap:10px}
.composerInput{min-height:46px;font-size:14px;color:var(--dsw-alias-label-secondary)}
.composerRow{display:flex;align-items:center;gap:10px}
button{padding:6px 16px;border:1.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground);font-size:13px;cursor:pointer}
button.ghost{background:transparent;color:var(--dsw-alias-label-secondary)}
.caption{font-size:12px;color:var(--dsw-alias-label-caption)}
.turnEnd{font-family:var(--px-font-ui);font-size:12px;color:var(--dsw-alias-label-caption);text-align:center}
</style>
</head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<div data-dsh-huashu-pixel-overlay aria-hidden="true"></div>
${mock}
</body>
</html>
`

/** 开屏自检预览页：只有那一块一次性上电画面（其余样式与真 bundle 同源）。 */
const bootPage = (dark) => `<!DOCTYPE html>
<html lang="zh-CN" data-px-motion="normal" data-px-scanlines="on" data-px-fonts="headings" data-px-intensity="standard">
<head><meta charset="UTF-8"><title>dsh-huashu-pixel 开屏自检</title>
<style>
${css}
${PREVIEW_ALIAS_SHIM}
html,body{margin:0;height:100%}
[data-px-boot]{animation:none;clip-path:none}
[data-px-boot] .px-boot-line{opacity:1;animation:none}
</style></head>
<body${dark ? ' data-ds-dark-theme' : ''}>
<div data-px-boot aria-hidden="true">
  <div class="px-boot-line">HUASHU PIXEL BIOS v1.1</div>
  <div class="px-boot-line">RAM 128K OK</div>
  <div class="px-boot-line">PALETTE 124 TOKENS OK</div>
  <div class="px-boot-line">CRT SYNC OK</div>
  <div class="px-boot-line">READY.<span class="px-boot-cursor"></span></div>
</div>
</body></html>
`

writeFileSync(`${root}preview.html`, shell(false, 'standard'))
writeFileSync(`${root}preview-dark.html`, shell(true, 'standard'))
writeFileSync(`${root}preview-soft.html`, shell(false, 'light'))
writeFileSync(`${root}preview-strong.html`, shell(false, 'strong'))
writeFileSync(`${root}preview-boot.html`, bootPage(false))
console.log(`preview: standard / dark / soft / strong / boot（样式表 ${css.length} 字节）`)
