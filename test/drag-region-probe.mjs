/**
 * dsh-huashu-pixel · macOS 窗口拖拽区回归探针（**需要本机有 Chrome**）
 *
 * 背景（V1.2.1 修的坑）：官方 ui-web base.css 有一条
 *   html[data-platform=darwin] body>:not(#root){-webkit-app-region:no-drag}
 * 主题的 CRT 覆层与开屏自检都是 body 的直接子元素 → 命中这条规则 → 一个"整窗 no-drag"
 * 区域把 #root 里所有 `[data-window-drag]` 拖拽区全减掉，于是**窗口拖不动**（点击不受影响）。
 *
 * 这个脚本把真 bundle 注入的那张样式表放进一个"仿宿主"页面（逐字复刻官方那条 darwin 规则
 * + 两个 `[data-window-drag]` 条），用真 Chromium 跑两遍：
 *   - 前缀版：把主题里那条复位规则删掉（等价 v1.2.0）→ 期望"拖不动"
 *   - 修复版：原样 → 期望"拖得动"，且覆层的 computed -webkit-app-region 与树内未声明元素一致
 * 任一不符即退出码 1。
 *
 * 运行：npm run verify:drag       （可用 CHROME=/path/to/chrome 覆盖浏览器路径）
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if (!existsSync(CHROME)) {
  console.log(`skip: 没找到 Chrome（${CHROME}）；设 CHROME=... 指定浏览器后可跑`)
  process.exit(0)
}

// 1. 从真 bundle 重生成 preview.html，再取它注入的那张样式表
execFileSync(process.execPath, [`${root}scripts/build-preview.mjs`], { stdio: 'ignore' })
const preview = readFileSync(`${root}preview.html`, 'utf8')
const themeCss = preview.split('<style>')[1].split('</style>')[0]

// 2. 官方 ui-web base.css 的 darwin 拖拽规则（逐字照抄自 app.asar）
const shellCss = `
html,body,#root{height:100%;margin:0}
html[data-platform=darwin],html[data-platform=darwin] body{background:transparent}
html[data-platform=darwin] body{isolation:isolate}
html[data-platform=darwin] [data-window-drag]{-webkit-app-region:drag}
html[data-platform=darwin] [data-window-drag-recall]{-webkit-app-region:no-drag}
html[data-platform=darwin] body>:not(#root){-webkit-app-region:no-drag}
html[data-platform=darwin] :is(button,a,input,select,textarea,summary,[contenteditable=true],[tabindex],[role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=tooltip],[role=button],[role=link],[role=tab],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=checkbox],[role=radio],[role=switch],[role=slider],[role=combobox],[role=textbox]){-webkit-app-region:no-drag}
`

const probeJs = `
function mode(el){ return getComputedStyle(el).getPropertyValue('-webkit-app-region').trim() }
// 复刻 Blink 的区域计算：按文档顺序收集 drag/no-drag 区域，点上"最后命中的一条"生效
// （core/frame/local_frame_view.cc: CollectDraggableRegions + LayoutObject::AddDraggableRegions）
function verdictAt(x,y){
  let v=false, hits=[]
  for (const el of document.querySelectorAll('*')){
    const m = mode(el)
    if (m!=='drag' && m!=='no-drag') continue
    if (getComputedStyle(el).visibility!=='visible') continue
    const r = el.getBoundingClientRect()
    if (r.width===0||r.height===0) continue
    if (x>=r.left && x<r.right && y>=r.top && y<r.bottom){ v=(m==='drag'); hits.push((el.id||el.tagName)+':'+m) }
  }
  return { draggable:v, hits }
}
const overlay = document.querySelector('[data-dsh-huashu-pixel-overlay]')
const plain = document.querySelector('#plainInRoot')
document.getElementById('probe').textContent = JSON.stringify({
  overlay: mode(overlay),
  boot: mode(document.querySelector('[data-px-boot]')),
  undeclaredInRoot: mode(plain),
  overlayIsNeutral: mode(overlay) === mode(plain),
  band: mode(document.querySelector('#convHeader')),
  button: mode(document.querySelector('#btn')),
  header: verdictAt(400,24),
  sidebarTop: verdictAt(80,20)
})`

const page = (css) => `<!doctype html><html data-platform="darwin" data-px-intensity="standard" data-px-motion="normal" data-px-scanlines="on">
<head><meta charset="utf-8"><style>${shellCss}</style><style>${css}</style></head>
<body>
<div id="root">
  <div id="sidebar" style="width:240px;float:left">
    <div data-window-drag id="dragTop" style="height:52px"></div>
    <div data-window-drag id="logoRow" style="height:40px"></div>
  </div>
  <div id="main" style="margin-left:240px">
    <div id="plainInRoot"></div>
    <header data-window-drag id="convHeader" style="height:48px"><button id="btn">按钮</button></header>
    <div style="height:800px"></div>
  </div>
</div>
<div data-dsh-huashu-pixel-overlay aria-hidden="true"></div>
<div data-px-boot aria-hidden="true"><div class="px-boot-line">HUASHU PIXEL</div></div>
<pre id="probe"></pre>
<script>${probeJs}</script>
</body></html>`

const guardRe = /html\[data-platform="darwin"\] \[data-dsh-huashu-pixel-overlay\],\s*html\[data-platform="darwin"\] \[data-px-boot\]\{[^}]*\}/
if (!guardRe.test(themeCss)) {
  console.error('fail: 样式表里找不到 darwin 拖拽区复位规则，探针的前提不成立')
  process.exit(1)
}
const prefixCss = themeCss.replace(guardRe, '')
const dir = join(tmpdir(), 'dsh-huashu-pixel-drag-probe')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'prefix.html'), page(prefixCss))
writeFileSync(join(dir, 'fixed.html'), page(themeCss))

// 3. headless dump-dom（Chrome 打完 DOM 不退出，拿到 </pre> 就杀）
function dumpDom(file, tag) {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run',
      '--disable-extensions', `--user-data-dir=${join(dir, `profile-${tag}`)}`, '--dump-dom', `file://${file}`],
    { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    let settled = false
    const finish = (fn) => { if (settled) return; settled = true; child.kill('SIGKILL'); fn() }
    child.stdout.on('data', (chunk) => {
      out += chunk.toString()
      if (out.includes('</pre>')) finish(() => resolve(out))
    })
    child.on('error', (error) => finish(() => reject(error)))
    setTimeout(() => finish(() => reject(new Error('headless Chrome 超时'))), 60000)
  })
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const probe = async (file, tag) => {
  const dom = await dumpDom(file, tag)
  return JSON.parse(decode(dom.match(/<pre id="probe">([\s\S]*?)<\/pre>/)[1]))
}

const prefix = await probe(join(dir, 'prefix.html'), 'prefix')
const fixed = await probe(join(dir, 'fixed.html'), 'fixed')

const checks = [
  ['前缀版（等价 v1.2.0）覆层 computed = no-drag', prefix.overlay === 'no-drag'],
  ['前缀版标题栏判定 = 拖不动（复现 bug）', prefix.header.draggable === false],
  ['前缀版侧栏顶判定 = 拖不动（复现 bug）', prefix.sidebarTop.draggable === false],
  ['修复版覆层 computed 与树内未声明元素一致（= none，不参与区域计算）', fixed.overlayIsNeutral && fixed.overlay === 'none'],
  ['修复版开屏自检面板同样复位', fixed.boot === 'none'],
  ['修复版标题栏判定 = 拖得动', fixed.header.draggable === true],
  ['修复版侧栏顶判定 = 拖得动', fixed.sidebarTop.draggable === true],
  ['标题栏拖拽区本身仍是 drag（没被写死）', fixed.band === 'drag'],
  ['控件仍是 no-drag（点击不受影响）', fixed.button === 'no-drag']
]

console.log('前缀版：', JSON.stringify(prefix))
console.log('修复版：', JSON.stringify(fixed))
let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`)
  if (!ok) failed += 1
}
console.log(failed === 0 ? `drag-region probe: 全部通过（${checks.length} 条）` : `drag-region probe: ${failed} 条失败`)
process.exit(failed === 0 ? 0 : 1)
