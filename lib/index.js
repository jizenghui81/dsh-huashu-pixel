/**
 * dsh-huashu-pixel · Host 半边
 *
 * 主题的视觉全部在浏览器半边（`lib/client.js`）。这一半只做一件事：
 * 用 `webServer` 注册一条前缀路由 `/huashu-pixel`，把包内 `fonts/*.woff2` 像素字体
 * 直出给浏览器（不内联 base64，字体单独走 HTTP 缓存）。
 *
 * 刻意**不**声明 Config / 不依赖任何外部包：
 * 第三方插件在 Web 客户端读不到自己的 dsh-settings 命名空间（Host apiproxy 只暴露白名单
 * 内的命名空间），所以主题的开关与档位由浏览器半边用 localStorage 自持——这也是社区里
 * 同类主题插件（dsh-neo-skin 等）的通行做法。没有 Config，也就不用把 schemastery 拉进包里。
 */
import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 包名：Loader row id / 浏览器注册 id / 留痕前缀。 */
const PLUGIN_ID = 'dsh-huashu-pixel'
/** Host 半边导出、浏览器 factory 也返回的插件模块名。 */
const name = 'huashu-pixel'
/** 字体路由前缀。`(kind, path)` 组合必须全局唯一。 */
const ROUTE_PREFIX = '/huashu-pixel'
/** 包内字体目录的绝对路径。 */
const FONT_DIR = fileURLToPath(new URL('../fonts/', import.meta.url))
/** 允许直出的字体文件白名单（只认这两个名字，杜绝路径穿越）。 */
const FONT_FILES = new Set([
  'huashu-pixel-cjk-12.woff2',
  'huashu-pixel-latin-8.woff2'
])

/**
 * 极简静态文件应答：只服务白名单内的 .woff2，其余一律 404。
 * @param req - HTTP 请求。
 * @param res - HTTP 响应。
 * @returns 应答完成后 resolve。
 */
async function serveFont(req, res) {
  const method = req.method ?? 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    res.statusCode = 405
    res.setHeader('allow', 'GET, HEAD')
    res.end()
    return
  }
  const url = new URL(req.url ?? '/', 'http://localhost')
  const rel = url.pathname.slice(ROUTE_PREFIX.length).replace(/^\/+/, '')
  const fileName = rel.startsWith('fonts/') ? basename(rel) : ''
  if (!FONT_FILES.has(fileName)) {
    res.statusCode = 404
    res.end('not found')
    return
  }
  try {
    const body = await readFile(join(FONT_DIR, fileName))
    res.statusCode = 200
    res.setHeader('content-type', 'font/woff2')
    res.setHeader('content-length', String(body.byteLength))
    res.setHeader('cache-control', 'public, max-age=31536000, immutable')
    if (method === 'HEAD') res.end()
    else res.end(body)
  } catch (error) {
    res.statusCode = 404
    res.end('not found')
    throw error
  }
}

/**
 * Host 插件体：打一行 ready 留痕 + 挂字体路由。
 * @param ctx - Host 插件上下文。
 */
function apply(ctx) {
  ctx.logger.info('%s: host ready', PLUGIN_ID)
  // webServer 是可选依赖：没有它（例如纯 CLI 组合）像素字体退化，但插件本身必须照常激活。
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler: serveFont }),
      `${PLUGIN_ID}: font route`
    )
    webCtx.logger.info('%s: font route %s/fonts/* registered', PLUGIN_ID, ROUTE_PREFIX)
  })
}

export { apply, name }
