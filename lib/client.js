/**
 * dsh-huashu-pixel · 浏览器半边（手写 bundle，无构建步骤）
 *
 * 形态与官方模板一致：`window.__ModuleLoader__.load({ id, factory })` → `exports.apply`。
 * 本文件不能用 `import`，也不依赖任何 Node 内置模块。
 *
 * 这一半做四件事：
 *  1. 通过 `ctx.theme.overrideTokens` 叠一层配色 token（官方扩展点，内联生效、优先于任何样式表）；
 *  2. 注入一张 `data-plugin` 样式表（方角 / 硬描边 / 像素字体 / 街机动效 / CRT 覆层样式）；
 *  3. 在 `<html>` 上挂 `data-px-motion / data-px-scanlines / data-px-fonts` 三个状态位，给样式表分档；
 *  4. 往「设置 → 通用」注册一行自己的开关（开/关、动效档、扫描线、像素字体范围）。
 *
 * 为什么配置存 localStorage 而不是 dsh-settings：Host 的 apiproxy 只对**白名单内**的
 * settings 命名空间开放读写（`WEB_SETTINGS_NAMESPACES`），第三方命名空间注册得上，
 * 但 Web 客户端拿到的是 `settings-not-exposed`。这是上游尚未开放的能力，社区里的主题插件
 * （如 dsh-neo-skin）同样用 localStorage 自持状态——自包含、可发布、不需要改宿主。
 *
 * 动效只依赖 DSH 组件已经写在 DOM 上的稳定属性（data-shimmer / data-running / data-turn-start /
 * data-turn-end / data-state / data-menu-material …），不改任何组件；需要按类名兜底时用
 * `[class*="_xxx"]` 的可读后缀（DSH 的 CSS Module 类名是 `hash_名字`，后缀稳定）。
 */

window.__ModuleLoader__.load({
  id: 'dsh-huashu-pixel',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    /** React 由浏览器模块表提供（官方模板同样这么取），不额外安装。 */
    const React = require('react')

    /** 包名：同时是 Loader row id、浏览器注册 id、token 层 source id。 */
    const PLUGIN_ID = 'dsh-huashu-pixel'
    /** 版本号：只用于留痕与调试 API。 */
    const VERSION = '1.0.0'
    /** 字体路由前缀（Host 半边注册的那条）。 */
    const FONT_BASE = '/huashu-pixel/fonts/'
    /** 覆层元素属性。 */
    const OVERLAY_ATTR = 'data-dsh-huashu-pixel-overlay'
    /** 样式表标记属性。 */
    const STYLE_ATTR = 'data-plugin-css'
    /** 状态位属性名。 */
    const ATTR_MOTION = 'data-px-motion'
    const ATTR_SCANLINES = 'data-px-scanlines'
    const ATTR_FONTS = 'data-px-fonts'
    /** 设置行文案命名空间。 */
    const SETTINGS_NS = 'settings.dsh-huashu-pixel'
    /** 设置行在本 slot 里的排序（官方外观行排 10 上下，这里紧挨其后）。 */
    const SETTINGS_ORDER = 16
    /** 持久化键。 */
    const KEYS = {
      enabled: 'dsh-huashu-pixel.enabled',
      motion: 'dsh-huashu-pixel.motion',
      scanlines: 'dsh-huashu-pixel.scanlines',
      pixelFonts: 'dsh-huashu-pixel.pixelFonts'
    }
    /** 可选值域。 */
    const MOTIONS = ['normal', 'quiet', 'arcade', 'off']
    const FONT_SCOPES = ['headings', 'all', 'off']
    /** 出厂默认。 */
    const DEFAULTS = { enabled: true, motion: 'normal', scanlines: true, pixelFonts: 'headings' }

    /* ==================================================================== *
     * 一、配色：暖调像素（亮） / 街机磷光（暗）
     *
     * 同源两套：静态色阶（statics）负责让所有 `var(--dsw-static-*)` 派生的别名自动换色，
     * 别名层（aliases）只补那些写死 hex 的 token（边框、遮罩、悬停、菜单实底等）。
     * 亮色对齐花书像素文稿：纸 #F5F0EB / 卡 #FFFDF9 / 墨 #2A2520 / 棕 #8B7355 /
     * 金 #D4A574 / 橙 #E8642C / 描边 #D4C5B8。
     * ==================================================================== */

    /** 静态色阶：亮（暖调像素）。 */
    const STATIC_LIGHT = {
      '--dsw-static-neutral-bluish-00': '#FFFDF9',
      '--dsw-static-neutral-bluish-50': '#F5F0EB',
      '--dsw-static-neutral-bluish-60': '#F1EBE3',
      '--dsw-static-neutral-bluish-75': '#EDE6DC',
      '--dsw-static-neutral-bluish-100': '#E6DCD0',
      '--dsw-static-neutral-bluish-150': '#DCD0C2',
      '--dsw-static-neutral-bluish-200': '#D4C5B8',
      '--dsw-static-neutral-bluish-300': '#C2B2A2',
      '--dsw-static-neutral-bluish-400': '#A08B72',
      '--dsw-static-neutral-bluish-500': '#8B7355',
      '--dsw-static-neutral-bluish-600': '#7A6349',
      '--dsw-static-neutral-bluish-700': '#5F4E3A',
      '--dsw-static-neutral-bluish-750': '#4E4030',
      '--dsw-static-neutral-bluish-800': '#3D3428',
      '--dsw-static-neutral-bluish-850': '#332C22',
      '--dsw-static-neutral-bluish-875': '#2A2520',
      '--dsw-static-neutral-bluish-900': '#221E19',
      '--dsw-static-neutral-bluish-950': '#1A1713',
      '--dsw-static-neutral-bluish-1000': '#14110D',
      '--dsw-static-neutral-00': '#FFFFFF',
      '--dsw-static-neutral-50': '#F5F0EB',
      '--dsw-static-neutral-100': '#EFE9E1',
      '--dsw-static-neutral-150': '#E9E2D8',
      '--dsw-static-neutral-200': '#E2DACD',
      '--dsw-static-neutral-250': '#DBD2C3',
      '--dsw-static-neutral-300': '#D2C8B8',
      '--dsw-static-neutral-400': '#A79C8C',
      '--dsw-static-neutral-500': '#8C8172',
      '--dsw-static-neutral-550': '#75695C',
      '--dsw-static-neutral-600': '#5F5449',
      '--dsw-static-neutral-700': '#463D34',
      '--dsw-static-neutral-800': '#2E2822',
      '--dsw-static-neutral-850': '#26221C',
      '--dsw-static-neutral-900': '#14110D',
      '--dsw-static-neutral-1000': '#000000',
      '--dsw-static-blue-50': '#FDF2EA',
      '--dsw-static-blue-50p': '#FCEDE3',
      '--dsw-static-blue-75': '#FBE5D6',
      '--dsw-static-blue-100': '#F8D7C0',
      '--dsw-static-blue-300': '#F2AF88',
      '--dsw-static-blue-400': '#EE9163',
      '--dsw-static-blue-450': '#EB7B45',
      '--dsw-static-blue-500': '#E8642C',
      '--dsw-static-blue-600': '#C9501E',
      '--dsw-static-blue-800': '#8E3A16',
      '--dsw-static-blue-900': '#5E2810',
      '--dsw-static-blue-950': '#3A1A0B',
      '--dsw-static-deepseek-50': '#FDF3EC',
      '--dsw-static-deepseek-100': '#FAE4D2',
      '--dsw-static-deepseek-200': '#F6CFAC',
      '--dsw-static-deepseek-300': '#F0B584',
      '--dsw-static-deepseek-400': '#EA9A5C',
      '--dsw-static-deepseek-450': '#E6803E',
      '--dsw-static-deepseek-500': '#E8642C',
      '--dsw-static-deepseek-600': '#B94E20',
      '--dsw-static-deepseek-700-delete': '#8E3A16',
      '--dsw-static-deepseek-800': '#5E2810',
      '--dsw-static-deepseek-900': '#3A1A0B',
      '--dsw-static-green-100': '#E7F2E9',
      '--dsw-static-green-400': '#6FAE7C',
      '--dsw-static-green-500': '#3E8E5A',
      '--dsw-static-green-500-a08': '#3E8E5A14',
      '--dsw-static-green-500-a12': '#3E8E5A1F',
      '--dsw-static-green-900': '#1E3A28',
      '--dsw-static-red-50': '#FCEFEC',
      '--dsw-static-red-100': '#F8DCD6',
      '--dsw-static-red-400': '#D9705C',
      '--dsw-static-red-400-a12': '#D9705C1F',
      '--dsw-static-red-500': '#C0392B',
      '--dsw-static-red-600': '#A82F22',
      '--dsw-static-red-600-a08': '#A82F2214',
      '--dsw-static-red-900': '#451610',
      '--dsw-static-amber-100': '#FAF0DA',
      '--dsw-static-amber-400': '#E0B45C',
      '--dsw-static-amber-500': '#D4A574',
      '--dsw-static-amber-600': '#B98A55',
      '--dsw-static-amber-900': '#3A2E1B'
    }

    /** 静态色阶：暗（街机磷光）。 */
    const STATIC_DARK = {
      '--dsw-static-neutral-bluish-00': '#FCF7EC',
      '--dsw-static-neutral-bluish-50': '#F7EEDC',
      '--dsw-static-neutral-bluish-60': '#F2E7D1',
      '--dsw-static-neutral-bluish-75': '#EDE0C6',
      '--dsw-static-neutral-bluish-100': '#E4D5B8',
      '--dsw-static-neutral-bluish-150': '#D9C7A9',
      '--dsw-static-neutral-bluish-200': '#CDB99A',
      '--dsw-static-neutral-bluish-300': '#B9A588',
      '--dsw-static-neutral-bluish-400': '#9C8A6E',
      '--dsw-static-neutral-bluish-500': '#8B7355',
      '--dsw-static-neutral-bluish-600': '#6B5A47',
      '--dsw-static-neutral-bluish-700': '#4E4234',
      '--dsw-static-neutral-bluish-750': '#3E3529',
      '--dsw-static-neutral-bluish-800': '#332C22',
      '--dsw-static-neutral-bluish-850': '#292219',
      '--dsw-static-neutral-bluish-875': '#221D17',
      '--dsw-static-neutral-bluish-900': '#1C1813',
      '--dsw-static-neutral-bluish-950': '#14110D',
      '--dsw-static-neutral-bluish-1000': '#0E0C09',
      '--dsw-static-neutral-00': '#FFF6E4',
      '--dsw-static-neutral-50': '#231E18',
      '--dsw-static-neutral-100': '#2A241D',
      '--dsw-static-neutral-150': '#322B22',
      '--dsw-static-neutral-200': '#3A3228',
      '--dsw-static-neutral-250': '#42392E',
      '--dsw-static-neutral-300': '#4B4134',
      '--dsw-static-neutral-400': '#6B5E4B',
      '--dsw-static-neutral-500': '#857659',
      '--dsw-static-neutral-550': '#948366',
      '--dsw-static-neutral-600': '#A3906F',
      '--dsw-static-neutral-700': '#B7A382',
      '--dsw-static-neutral-800': '#CBB795',
      '--dsw-static-neutral-850': '#D8C5A6',
      '--dsw-static-neutral-900': '#EDE0C6',
      '--dsw-static-neutral-1000': '#0B0906',
      '--dsw-static-blue-50': '#2A2114',
      '--dsw-static-blue-50p': '#2A2114',
      '--dsw-static-blue-75': '#33280F',
      '--dsw-static-blue-100': '#3D2F12',
      '--dsw-static-blue-300': '#7A5A18',
      '--dsw-static-blue-400': '#B8860B',
      '--dsw-static-blue-450': '#D9A010',
      '--dsw-static-blue-500': '#FFAE2B',
      '--dsw-static-blue-600': '#FFC24D',
      '--dsw-static-blue-800': '#FFD98A',
      '--dsw-static-blue-900': '#FFE7B8',
      '--dsw-static-blue-950': '#FFF3DC',
      '--dsw-static-deepseek-50': '#2A2114',
      '--dsw-static-deepseek-100': '#3B2C14',
      '--dsw-static-deepseek-200': '#52390F',
      '--dsw-static-deepseek-300': '#7A5212',
      '--dsw-static-deepseek-400': '#C77F1E',
      '--dsw-static-deepseek-450': '#E8942A',
      '--dsw-static-deepseek-500': '#FFAE2B',
      '--dsw-static-deepseek-600': '#FFC24D',
      '--dsw-static-deepseek-700-delete': '#FFD98A',
      '--dsw-static-deepseek-800': '#FFE7B8',
      '--dsw-static-deepseek-900': '#FFF3DC',
      '--dsw-static-green-100': '#1E3A26',
      '--dsw-static-green-400': '#6FD489',
      '--dsw-static-green-500': '#4FBF6E',
      '--dsw-static-green-500-a08': '#4FBF6E14',
      '--dsw-static-green-500-a12': '#4FBF6E1F',
      '--dsw-static-green-900': '#122A1A',
      '--dsw-static-red-50': '#2E1611',
      '--dsw-static-red-100': '#3B1B14',
      '--dsw-static-red-400': '#FF7A5C',
      '--dsw-static-red-400-a12': '#FF7A5C1F',
      '--dsw-static-red-500': '#FF6B4A',
      '--dsw-static-red-600': '#FF8A6E',
      '--dsw-static-red-600-a08': '#FF6B4A14',
      '--dsw-static-red-900': '#3A150E',
      '--dsw-static-amber-100': '#3A2E15',
      '--dsw-static-amber-400': '#FFC44D',
      '--dsw-static-amber-500': '#FFAE2B',
      '--dsw-static-amber-600': '#E8942A',
      '--dsw-static-amber-900': '#2E2512'
    }

    /** 别名层：只列写死 hex 或必须脱离色阶推导的 token（亮）。 */
    const ALIAS_LIGHT = {
      '--dsw-alias-bg-base': '#F5F0EB',
      '--dsw-alias-bg-layer-1': '#FFFDF9',
      '--dsw-alias-bg-layer-2': '#FFFDF9',
      '--dsw-alias-bg-layer-3': '#FFFDF9',
      '--dsw-alias-bg-overlay': '#FFFDF9',
      '--dsw-alias-bg-module-platform': '#EFE8E0',
      '--dsw-alias-bg-document-preview': '#FFFDF9',
      '--dsw-alias-border-l1': '#D4C5B8',
      '--dsw-alias-border-l2-darkmode-thin': '#D4C5B8',
      '--dsw-alias-border-l2': '#C9B8A6',
      '--dsw-alias-border-l3': '#B9A78F',
      '--dsw-alias-border-l4': '#8B7355',
      '--dsw-alias-border-inverted': '#2A252014',
      '--dsw-alias-border-inverted2': '#2A25201F',
      '--dsw-alias-interactive-bg-hover': '#2A25200D',
      '--dsw-alias-interactive-bg-active': '#2A25201A',
      '--dsw-alias-interactive-bg-hover-accent': '#E8642C1F',
      '--dsw-alias-interactive-bg-hover-danger': '#C0392B14',
      '--dsw-alias-bg-mask-1': '#2A25203D',
      '--dsw-alias-bg-mask-2': '#2A25201F',
      '--dsw-alias-bg-mask-3': '#2A25207A',
      '--dsw-alias-bg-mask-photo': '#14110DE0',
      '--dsw-alias-bg-mask-drop': '#FFFDF9B3',
      '--dsw-alias-bg-skeleton': '#2A252012',
      '--dsw-alias-button-tool-bar-fill': '#F5F0EB80',
      '--dsw-alias-button-tool-bar-fill-invisible': '#F5F0EB40',
      '--dsw-alias-button-tool-bar-hover': '#E6DCD080',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#E8642C',
      '--dsw-alias-label-shimmer': '#E8642C33',
      '--dsw-alias-label-deep-diving': '#C9501E',
      '--dsw-alias-label-deep-diving-shimmer': '#E8642C66',
      '--dsw-alias-bg-document-selection': '#E8642C59',
      '--dsw-alias-file-diff-added-bg': '#E7F2E9',
      '--dsw-alias-file-diff-added-gutter': '#F0F9F1',
      '--dsw-alias-file-diff-added-marker': '#3E8E5A',
      '--dsw-alias-file-diff-deleted-bg': '#FBE7E2',
      '--dsw-alias-file-diff-deleted-gutter': '#FDEEEA',
      '--dsw-alias-file-diff-deleted-marker': '#A82F22',
      '--dsw-menu-surface-fill': '#FFFDF9F2',
      '--dsw-alias-menu-group-header-fill': '#F1EBE3F2',
      '--dsw-specific-menu': '#FFFDF9F7',
      '--dsw-specific-sidebar-fill': '#F0EAE2',
      '--dsw-alias-switch-thumb': '#FFFFFF',
      '--dsw-alias-toast-bg': '#2A2520',
      '--dsw-alias-toast-label': '#F5F0EB',
      '--dsw-alias-tooltip-bg': '#2A2520',
      '--dsw-elevation-stroke-color': '#D4C5B8'
    }

    /** 别名层：暗（街机磷光）。 */
    const ALIAS_DARK = {
      '--dsw-alias-bg-base': '#14110D',
      '--dsw-alias-bg-layer-1': '#1C1813',
      '--dsw-alias-bg-layer-2': '#221D17',
      '--dsw-alias-bg-layer-3': '#292219',
      '--dsw-alias-bg-overlay': '#221D17',
      '--dsw-alias-bg-module-platform': '#292219',
      '--dsw-alias-bg-document-preview': '#1C1813',
      '--dsw-alias-border-l1': '#F2E3C624',
      '--dsw-alias-border-l2-darkmode-thin': '#F2E3C624',
      '--dsw-alias-border-l2': '#F2E3C63D',
      '--dsw-alias-border-l3': '#F2E3C659',
      '--dsw-alias-border-l4': '#F2E3C67A',
      '--dsw-alias-border-inverted': '#F2E3C614',
      '--dsw-alias-border-inverted2': '#F2E3C61F',
      '--dsw-alias-interactive-bg-hover': '#F2E3C61A',
      '--dsw-alias-interactive-bg-active': '#F2E3C629',
      '--dsw-alias-interactive-bg-hover-accent': '#FFAE2B2E',
      '--dsw-alias-interactive-bg-hover-danger': '#FF6B4A26',
      '--dsw-alias-bg-mask-1': '#0E0C0980',
      '--dsw-alias-bg-mask-2': '#0E0C0933',
      '--dsw-alias-bg-mask-3': '#0E0C097A',
      '--dsw-alias-bg-mask-photo': '#0E0C09E0',
      '--dsw-alias-bg-mask-drop': '#221D17B3',
      '--dsw-alias-bg-skeleton': '#F2E3C614',
      '--dsw-alias-button-tool-bar-fill': '#332C2280',
      '--dsw-alias-button-tool-bar-fill-invisible': '#1C181340',
      '--dsw-alias-button-tool-bar-hover': '#3E352999',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#FFAE2B',
      '--dsw-alias-label-shimmer': '#FFAE2B40',
      '--dsw-alias-label-deep-diving': '#FFC24D',
      '--dsw-alias-label-deep-diving-shimmer': '#FFAE2B80',
      '--dsw-alias-bg-document-selection': '#FFAE2B59',
      '--dsw-alias-file-diff-added-bg': '#1F3124',
      '--dsw-alias-file-diff-added-gutter': '#132016',
      '--dsw-alias-file-diff-added-marker': '#5FD07A',
      '--dsw-alias-file-diff-deleted-bg': '#3C1F1B',
      '--dsw-alias-file-diff-deleted-gutter': '#28130E',
      '--dsw-alias-file-diff-deleted-marker': '#FF7A5C',
      '--dsw-menu-surface-fill': '#221D17F2',
      '--dsw-alias-menu-group-header-fill': '#292219F2',
      '--dsw-specific-menu': '#221D17F7',
      '--dsw-specific-sidebar-fill': '#191510',
      '--dsw-alias-switch-thumb': '#F7EEDC',
      '--dsw-alias-toast-bg': '#3E3529',
      '--dsw-alias-toast-label': '#FCF7EC',
      '--dsw-alias-tooltip-bg': '#3E3529',
      '--dsw-elevation-stroke-color': '#F2E3C63D'
    }

    /** 圆角尺度：整体压到接近方角，但保留花书文稿里 8–12px 的卡片手感。 */
    const RADIUS = {
      '--dsw-radius-xs': '2px',
      '--dsw-radius-sm': '4px',
      '--dsw-radius-md': '6px',
      '--dsw-radius-lg': '8px',
      '--dsw-radius-xl': '10px',
      '--dsw-radius-panel': '12px'
    }

    /**
     * 合并成一个 `{ token: { light, dark } }` 表：这份表同时喂给两个出口
     * （`ctx.theme.overrideTokens` 与样式表兜底），所以只有一处真源。
     */
    function buildTokens() {
      const names = new Set([
        ...Object.keys(STATIC_LIGHT), ...Object.keys(STATIC_DARK),
        ...Object.keys(ALIAS_LIGHT), ...Object.keys(ALIAS_DARK),
        ...Object.keys(RADIUS)
      ])
      const tokens = {}
      for (const token of names) {
        const light = STATIC_LIGHT[token] ?? ALIAS_LIGHT[token] ?? RADIUS[token]
        const dark = STATIC_DARK[token] ?? ALIAS_DARK[token] ?? RADIUS[token] ?? light
        tokens[token] = { light, dark }
      }
      return tokens
    }

    /** 唯一真源的 token 表。 */
    const TOKENS = buildTokens()

    /* ==================================================================== *
     * 二、样式表
     * ==================================================================== */

    /**
     * 把 token 表渲染成 CSS 声明块。
     * @param key - 'light' | 'dark'。
     * @returns `--x: y;` 拼接串。
     */
    function declarations(key) {
      return Object.entries(TOKENS).map(([token, pair]) => `${token}:${pair[key]}`).join(';')
    }

    /**
     * 组装完整样式表。字体 URL 在运行时按页面 origin 拼，避免相对路径在带路径的
     * 应用路由下解析错位。
     * @returns CSS 文本。
     */
    function buildCss() {
      const origin = typeof location === 'undefined' ? '' : location.origin
      const cjk = `${origin}${FONT_BASE}huashu-pixel-cjk-12.woff2`
      const latin = `${origin}${FONT_BASE}huashu-pixel-latin-8.woff2`
      /**
       * 需要像素字体的控件与标签。
       *
       * 像素字体只在**原生网格**上才清晰：Ark Pixel 是 12px 网格（12 / 24 / 36px），
       * Press Start 2P 是 8px 网格（8 / 16 / 24px）。所以这一组统一钉到 12px——
       * 15px 那种"差一格"的字号会让像素笔画粗细不匀（实测实拍确认），宁可贵在字号上。
       * 正文、代码与 markdown 标题不在这一组里：它们保持系统字体，长文才耐读。
       */
      const pixelChromeSelectors = [
        'button', '[role="button"]', '[role="menuitem"]', '[role="menuitemradio"]', '[role="menuitemcheckbox"]',
        '[role="tab"]', '[role="option"]', '[data-menu-group-heading]', '[data-menu-group-heading-start]',
        '[data-composer-chip]', '[data-ref-chip]', '[data-caption]', '[data-path-label]',
        '[data-conversation-tabs]', '[data-goal-bar]', '[data-status]', '[data-plan-card]',
        '[data-queue-dock]', '[data-windows-titlebar]'
      ].join(',')

      return `
/* ── 1. 像素字体（随包发布，走 /huashu-pixel 路由） ───────────────────── */
@font-face{font-family:'Huashu Pixel CJK';src:url('${cjk}') format('woff2');font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:'Huashu Pixel Latin';src:url('${latin}') format('woff2');font-weight:400;font-style:normal;font-display:swap}

:root{
  --px-font-cjk:'Huashu Pixel CJK';
  --px-font-ui:'Huashu Pixel CJK','Huashu Pixel Latin',-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;
  --px-font-display:'Huashu Pixel Latin','Huashu Pixel CJK',-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  --px-accent:#E8642C;
  --px-gold:#D4A574;
  --px-ink:#2A2520;
  --px-muted:#8B7355;
  --px-paper:#F5F0EB;
  --px-line:#D4C5B8;
  --px-shadow:#2A2520;
  --px-shadow-soft:#2A252066;
  --px-glow:#E8642C59;
  --px-table-head-bg:#2A2520;
  --px-table-head-fg:#F5F0EB;
  --px-glow-a:12%;
  --dsw-focus-ring-color:var(--px-accent);
  --dsw-focus-ring-width:2px;
}
/* 滚动条：粗一档 + 方角（官方在 body 上钉 5px，这里必须也用 body + !important） */
body{
  --dsh-scrollbar-width:10px !important;
  --dsh-scrollbar-thumb-border:0px;
  --dsh-scrollbar-track-margin:0px;
}
body[data-ds-dark-theme]{
  --px-accent:#FFAE2B;
  --px-gold:#D4A574;
  --px-ink:#F2E3C6;
  --px-muted:#9C8A6E;
  --px-paper:#14110D;
  --px-line:#4E4234;
  --px-shadow:#060504;
  --px-shadow-soft:#00000080;
  --px-glow:#FFAE2B66;
  --px-table-head-bg:#332C22;
  --px-table-head-fg:#FCF7EC;
  --px-glow-a:7%;
}

/* ── 2. token 兜底层（正常路径由 ctx.theme.overrideTokens 内联生效） ──── */
body{${declarations('light')}}
body[data-ds-dark-theme]{${declarations('dark')}}

/* ── 3. 层级描边：硬描边 + 硬投影（像素块感） ────────────────────────
   这一族 token 被官方逐元素重声明，所以必须自己声明到每个元素上并加 !important。 */
body,body *{
  --dsw-elevation-stroke:0 0 0 1.5px var(--dsw-elevation-stroke-color) !important;
  --dsw-elevation-panel:0 0 0 1.5px var(--dsw-elevation-stroke-color),3px 3px 0 0 var(--px-shadow) !important;
  --dsw-elevation-prominent:0 0 0 1.5px var(--dsw-elevation-stroke-color),5px 5px 0 0 var(--px-shadow) !important;
  --dsw-elevation-soft:0 0 0 1.5px var(--dsw-elevation-stroke-color),2px 2px 0 0 var(--px-shadow-soft) !important;
  --dsw-shadow-lv1:0 2px 0 0 var(--px-shadow-soft) !important;
  --dsw-shadow-lv1-blur:0 3px 0 0 var(--px-shadow-soft) !important;
  --dsw-shadow-lv2:3px 3px 0 0 var(--px-shadow-soft) !important;
  --dsw-shadow-lv3:0 0 0 1.5px var(--dsw-elevation-stroke-color),4px 4px 0 0 var(--px-shadow) !important;
  --dsw-menu-backdrop-filter:none !important;
  --dsw-mask-blur:none !important;
}

/* ── 4. 底色光晕（对齐花书文稿的大面径向渐变） ───────────────────────── */
body{
  background-color:var(--dsw-alias-bg-base);
  background-image:
    radial-gradient(680px 680px at -6% -12%, color-mix(in srgb, var(--px-accent) var(--px-glow-a), transparent), transparent 70%),
    radial-gradient(560px 560px at 106% 112%, color-mix(in srgb, var(--px-gold) var(--px-glow-a), transparent), transparent 70%);
  background-attachment:fixed;
  background-repeat:no-repeat;
}

/* ── 5. 像素字体范围（由 <html data-px-fonts> 分档） ─────────────────── */
html:is([data-px-fonts="headings"],[data-px-fonts="all"]) :is(${pixelChromeSelectors}){
  font-family:var(--px-font-ui);
  font-size:12px !important;
  line-height:1.5 !important;
  font-synthesis:none;
  font-variant-ligatures:none;
  letter-spacing:.01em;
  -webkit-font-smoothing:none;
}
/* 全界面档：正文也像素化（字号取 12 / 24px 的整数倍最清晰；这是你自己选的档） */
html[data-px-fonts="all"] body{--dsw-font-family:var(--px-font-ui)}
html[data-px-fonts="all"] body :is(p,li,td,th,blockquote,dd,dt,h1,h2,h3){font-family:var(--px-font-ui);-webkit-font-smoothing:none}
/* 品牌位（欢迎页 / 品牌文字）用 Press Start 2P，短拉丁串上最像街机 */
body{--dsw-font-family-brand:var(--px-font-display)}

/* ── 6. 方角与描边（面板 / 输入 / 卡片 / 菜单 / 对话框） ─────────────── */
:is([data-composer-card],[data-menu-material],[data-plan-card],[role="dialog"],[role="alertdialog"],[data-menu-backing]){
  border-radius:var(--dsw-radius-xl) !important;
}
:is([data-menu-material],[data-composer-card],[data-plan-card],[role="dialog"],[role="alertdialog"]){
  box-shadow:0 0 0 1.5px var(--dsw-elevation-stroke-color),4px 4px 0 0 var(--px-shadow) !important;
  border:0 !important;
}
[data-composer-card]{position:relative}
[data-composer-card]:focus-within{
  box-shadow:0 0 0 1.5px var(--px-accent),4px 4px 0 0 var(--px-shadow) !important;
}
button,[role="button"]{border-radius:var(--dsw-radius-sm) !important}

/* 表头：墨底纸字（花书文稿的表格签名） */
thead th{
  background:var(--px-table-head-bg) !important;
  color:var(--px-table-head-fg) !important;
  font-weight:700 !important;
}
/* 引用块：橙线 + 棕字（文稿的 .sub 语言） */
blockquote{
  border-left:3px solid var(--px-accent) !important;
  color:var(--px-muted) !important;
  padding-left:14px !important;
  background:transparent !important;
}
/* 滚动条：粗一档、方角 */
::-webkit-scrollbar{border-radius:0 !important}
::-webkit-scrollbar-thumb{border-radius:0 !important}

/* ── 7. 流式输出：方块光标 + 硬步进扫光 + 磷光 ──────────────────────── */
@keyframes px-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes px-march{from{background-position:0 0}to{background-position:14px 0}}
@keyframes px-sweep{0%{opacity:.28;transform:translateY(-105%)}70%{opacity:.18}100%{opacity:0;transform:translateY(105%)}}
@keyframes px-cut{0%{filter:brightness(1.4) contrast(1.08)}45%{filter:brightness(.9)}100%{filter:none}}
@keyframes px-pop{from{opacity:.25}to{opacity:1}}
@keyframes px-jitter{0%{transform:translate(0,0)}50%{transform:translate(1px,-1px)}100%{transform:translate(0,0)}}
@keyframes px-flicker{0%,97%{opacity:var(--px-scanline-opacity)}98%{opacity:calc(var(--px-scanline-opacity) * .6)}100%{opacity:var(--px-scanline-opacity)}}
@keyframes px-boot{0%{clip-path:inset(0 0 100% 0)}55%{clip-path:inset(45% 0 45% 0)}100%{clip-path:inset(0 0 0 0);opacity:0}}

html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-shimmer]{
  text-shadow:0 0 7px var(--px-glow);
}
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-shimmer]::after{
  content:'';display:inline-block;width:7px;height:12px;margin-left:3px;vertical-align:-1px;
  background:var(--px-accent);box-shadow:0 0 6px var(--px-glow);
  animation:px-blink 1s steps(1,end) infinite;
}
/* 把官方那条平滑扫光改成硬步进（只改缓动，不动它的动画本身） */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-shimmer] *{
  animation-timing-function:steps(8,end) !important;
}
/* 运行中的转轮：4 格跳转，像老机器的寻址灯 */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-state="ongoing"],
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-state="ongoing"] *{
  animation-timing-function:steps(4,end) !important;
}
/* 正在跑的步骤：底部一条逐格行进的像素进度条 */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-running]{position:relative}
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-running]::after{
  content:'';position:absolute;left:0;right:0;bottom:0;height:2px;pointer-events:none;
  background-image:repeating-linear-gradient(90deg,var(--px-accent) 0 6px,transparent 6px 14px);
  background-size:14px 2px;opacity:.9;
  animation:px-march .55s steps(7,end) infinite;
}
/* 一轮开始：一道扫描线下扫（老显示器上电） */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-turn-start]{position:relative}
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-turn-start]::before{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:3;opacity:0;
  background:linear-gradient(180deg,transparent 0%,var(--px-accent) 45%,transparent 92%);
  mix-blend-mode:multiply;
  animation:px-sweep .44s steps(8,end) 1 both;
}
body[data-ds-dark-theme] [data-turn-start]::before{mix-blend-mode:screen}
/* 一轮结束：CRT 收尾闪一下（只动 filter，不动布局与不透明度） */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-turn-end]{
  animation:px-cut .3s steps(3,end) 1 both;
}
/* 出错：红灯硬闪两下 */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-error]{
  animation:px-err 1.1s steps(1,end) 2;
}
@keyframes px-err{0%,60%{outline:2px solid var(--dsw-alias-state-error-primary);outline-offset:2px}61%,100%{outline:2px solid transparent;outline-offset:2px}}
/* 菜单/浮层：硬弹出，不做缓动渐变 */
html:is([data-px-motion="normal"],[data-px-motion="arcade"]) [data-menu-material]{
  animation:px-pop .09s steps(2,end) 1 both;
}
/* 插入符与选中：橙 */
:is(input,textarea,[contenteditable="true"]){caret-color:var(--px-accent)}

/* ── 8. 夸张街机档：抖动 + 屏闪 + 开机自检 ─────────────────────────── */
html[data-px-motion="arcade"] [data-running]{animation:px-jitter .2s steps(2,end) infinite}
html[data-px-motion="arcade"] [data-turn-end]{animation:px-cut .3s steps(3,end) 1 both, px-jitter .16s steps(2,end) 3}
html[data-px-motion="arcade"] [${OVERLAY_ATTR}]{animation:px-boot .9s steps(12,end) 1 both, px-flicker 6s steps(1,end) infinite}

/* ── 9. CRT 扫描线覆层 ──────────────────────────────────────────────── */
[${OVERLAY_ATTR}]{
  position:fixed;inset:0;z-index:2147482000;pointer-events:none;
  --px-scanline-opacity:.055;
  opacity:var(--px-scanline-opacity);
  background-image:repeating-linear-gradient(0deg,rgba(20,17,13,.55) 0 1px,transparent 1px 3px);
  mix-blend-mode:multiply;
}
body[data-ds-dark-theme] [${OVERLAY_ATTR}]{
  --px-scanline-opacity:.085;
  background-image:repeating-linear-gradient(0deg,rgba(255,214,140,.5) 0 1px,transparent 1px 3px);
  mix-blend-mode:screen;
}
html[data-px-scanlines="off"] [${OVERLAY_ATTR}]{display:none}

/* ── 10. 无动效档 + 系统无障碍开关 ──────────────────────────────────── */
html[data-px-motion="off"] [data-shimmer]::after,
html[data-px-motion="off"] [data-running]::after,
html[data-px-motion="off"] [data-turn-start]::before{content:none;display:none}
html[data-px-motion="off"] [data-turn-end],
html[data-px-motion="off"] [data-error],
html[data-px-motion="off"] [data-menu-material]{animation:none !important}
html[data-px-motion="quiet"] [data-shimmer]::after{animation-duration:1.2s}
@media (prefers-reduced-motion:reduce){
  [data-shimmer]::after,[data-running]::after,[data-turn-start]::before,[data-turn-end],[data-error],[data-menu-material]{animation:none !important}
  [${OVERLAY_ATTR}]{animation:none !important}
}
`
    }

    /* ==================================================================== *
     * 三、设置行文案
     * ==================================================================== */

    const zh = {
      'px.title': '花书像素',
      'px.hint': '暖调像素主题：配色、方角硬描边、像素字体与街机动效；正文保持系统字体',
      'px.on': '开启',
      'px.off': '关闭',
      'px.motion': '动效',
      'px.motionNormal': '标准',
      'px.motionQuiet': '温和',
      'px.motionArcade': '街机',
      'px.motionOff': '无',
      'px.scanlines': '扫描线',
      'px.fonts': '像素字体',
      'px.fontsHeadings': '控件与标签',
      'px.fontsAll': '全界面',
      'px.fontsOff': '关'
    }
    const en = {
      'px.title': 'Huashu Pixel',
      'px.hint': 'Warm pixel theme: palette, hard-edged corners, pixel fonts and arcade motion',
      'px.on': 'On',
      'px.off': 'Off',
      'px.motion': 'Motion',
      'px.motionNormal': 'Normal',
      'px.motionQuiet': 'Quiet',
      'px.motionArcade': 'Arcade',
      'px.motionOff': 'None',
      'px.scanlines': 'Scanlines',
      'px.fonts': 'Pixel fonts',
      'px.fontsHeadings': 'Chrome only',
      'px.fontsAll': 'Everything',
      'px.fontsOff': 'Off'
    }

    /* ==================================================================== *
     * 四、状态（localStorage 自持）
     * ==================================================================== */

    /**
     * 读一个持久化布尔值。
     * @param key - 存储键。
     * @param fallback - 缺省值。
     * @returns 布尔值。
     */
    function readBool(key, fallback) {
      try {
        if (typeof localStorage === 'undefined') return fallback
        const raw = localStorage.getItem(key)
        return raw === null ? fallback : raw !== '0' && raw !== 'false'
      } catch {
        return fallback
      }
    }

    /**
     * 读一个持久化枚举值。
     * @param key - 存储键。
     * @param allowed - 允许的取值。
     * @param fallback - 缺省值。
     * @returns 合法取值之一。
     */
    function readEnum(key, allowed, fallback) {
      try {
        if (typeof localStorage === 'undefined') return fallback
        const raw = localStorage.getItem(key)
        return raw !== null && allowed.includes(raw) ? raw : fallback
      } catch {
        return fallback
      }
    }

    /**
     * 写一个持久化值（隐私模式下 localStorage 会抛，静默即可）。
     * @param key - 存储键。
     * @param value - 值。
     */
    function writeValue(key, value) {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value))
      } catch { /* 忽略 */ }
    }

    /**
     * 读取当前生效状态。
     * @returns `{ enabled, motion, scanlines, pixelFonts }`。
     */
    function readState() {
      return {
        enabled: readBool(KEYS.enabled, DEFAULTS.enabled),
        motion: readEnum(KEYS.motion, MOTIONS, DEFAULTS.motion),
        scanlines: readBool(KEYS.scanlines, DEFAULTS.scanlines),
        pixelFonts: readEnum(KEYS.pixelFonts, FONT_SCOPES, DEFAULTS.pixelFonts)
      }
    }

    /* ==================================================================== *
     * 五、运行时
     * ==================================================================== */

    /** 当前客户端上下文（供 log 使用；在 apply 里赋值）。 */
    let ctx = null
    /** 生效状态；设置行与调试 API 都写它。 */
    let state = readState()
    /** 设置行的订阅者（由 React.useSyncExternalStore 消费）。 */
    const listeners = new Set()
    /** 已挂载的资源（关闭总开关或卸载时逐个回收）。 */
    const resources = { layer: null, style: null, overlay: null }

    /**
     * 双出口留痕：插件日志通道 + 浏览器控制台（Host 日志不落盘，页面控制台更快）。
     * @param level - 'info' | 'warn'。
     * @param message - 文本。
     */
    function log(level, message) {
      const line = `[${PLUGIN_ID}] ${message}`
      try { ctx?.logger?.[level]?.(line) } catch { /* 日志失败无所谓 */ }
      try { (level === 'warn' ? console.warn : console.info)(line) } catch { /* 忽略 */ }
    }

    /** 把生效状态写到 `<html>` 的状态位上。 */
    function syncAttributes() {
      const root = document.documentElement
      root.setAttribute(ATTR_MOTION, state.enabled ? String(state.motion) : 'off')
      root.setAttribute(ATTR_SCANLINES, state.enabled && state.scanlines ? 'on' : 'off')
      root.setAttribute(ATTR_FONTS, state.enabled ? String(state.pixelFonts) : 'off')
    }

    /** 删除本插件写在 `<html>` 上的全部状态位。 */
    function clearAttributes() {
      for (const attr of [ATTR_MOTION, ATTR_SCANLINES, ATTR_FONTS]) {
        document.documentElement.removeAttribute(attr)
      }
    }

    /**
     * 注入主题样式表。
     * @returns 样式元素。
     */
    function createStyleTag() {
      const tag = document.createElement('style')
      tag.dataset.plugin = PLUGIN_ID
      tag.setAttribute(STYLE_ATTR, `${PLUGIN_ID}/theme.css`)
      tag.textContent = buildCss()
      document.head.appendChild(tag)
      return tag
    }

    /**
     * 追加 CRT 扫描线覆层。
     * @returns 覆层元素。
     */
    function createOverlay() {
      const layer = document.createElement('div')
      layer.setAttribute(OVERLAY_ATTR, '')
      layer.setAttribute('aria-hidden', 'true')
      document.body.appendChild(layer)
      return layer
    }

    /**
     * 按当前状态挂载或回收全部视觉资源。
     */
    function applyVisuals() {
      const wantTheme = state.enabled
      // token 层：走官方扩展点，亮暗两套随主题自动取值。
      if (wantTheme && resources.layer === null && typeof ctx?.theme?.overrideTokens === 'function') {
        resources.layer = ctx.theme.overrideTokens(PLUGIN_ID, TOKENS)
      } else if (!wantTheme && resources.layer !== null) {
        resources.layer()
        resources.layer = null
      }
      // 样式表
      if (wantTheme && resources.style === null) {
        resources.style = createStyleTag()
      } else if (!wantTheme && resources.style !== null) {
        resources.style.remove()
        resources.style = null
      }
      // CRT 覆层：开启且要扫描线且 body 已就绪时才有
      const wantOverlay = wantTheme && state.scanlines && document.body !== null
      if (wantOverlay && resources.overlay === null) {
        resources.overlay = createOverlay()
      } else if (!wantOverlay && resources.overlay !== null) {
        resources.overlay.remove()
        resources.overlay = null
      }
      syncAttributes()
    }

    /**
     * 写一个档位：持久化 + 立即生效 + 通知设置行。
     * @param key - 字段名。
     * @param value - 新值。
     */
    function setOption(key, value) {
      if (!(key in DEFAULTS) || state[key] === value) return
      state = { ...state, [key]: value }
      writeValue(KEYS[key], typeof value === 'boolean' ? (value ? '1' : '0') : value)
      applyVisuals()
      for (const notify of listeners) {
        try { notify() } catch { /* 单个订阅者失败不影响其它 */ }
      }
    }

    /* ==================================================================== *
     * 六、设置行（注册进「设置 → 通用」的 item slot）
     * ==================================================================== */

    /**
     * 一个像素风格的小按钮。
     * @param props - `{ label, active, onClick }`。
     * @returns React 元素。
     */
    function OptionButton({ label, active, onClick }) {
      return React.createElement('button', {
        type: 'button',
        onClick,
        style: {
          padding: '4px 12px',
          borderRadius: '4px',
          border: '1.5px solid var(--dsw-alias-border-l4)',
          background: active ? 'var(--dsw-alias-brand-primary)' : 'transparent',
          color: active ? 'var(--dsw-alias-label-primary-foreground)' : 'var(--dsw-alias-label-secondary)',
          fontFamily: 'var(--px-font-ui, inherit)',
          fontSize: '12px',
          lineHeight: '20px',
          cursor: 'pointer'
        }
      }, label)
    }

    /**
     * 设置行：一行标题 + 四组档位（动效 / 扫描线 / 像素字体 / 总开关）。
     * @param props - 宿主注入的 `t`（文案函数）。
     * @returns React 元素。
     */
    function SettingsRow(props) {
      // `t` 由注册时的 locale 命名空间绑定注入；万一没有，也不能让整行崩掉（面板会整块空掉）。
      const t = typeof props?.t === 'function' ? props.t : (key) => zh[key] ?? key
      const current = React.useSyncExternalStore(
        (notify) => { listeners.add(notify); return () => listeners.delete(notify) },
        () => state,
        () => state
      )
      const rowStyle = { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }
      const labelStyle = { fontSize: '13px', color: 'var(--dsw-alias-label-tertiary)', minWidth: '64px' }
      const group = (title, options) => React.createElement('div', { key: title || 'master', style: rowStyle }, [
        React.createElement('span', { key: 'label', style: labelStyle }, title),
        ...options.map((option) => React.createElement(OptionButton, {
          key: option.value,
          label: option.label,
          active: option.active,
          onClick: option.onClick
        }))
      ])
      return React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '16px 0',
          borderBottom: '0.5px solid var(--dsw-alias-border-l2)'
        }
      }, [
        React.createElement('div', {
          key: 'brand',
          style: {
            fontFamily: 'var(--px-font-display, monospace)',
            fontSize: '16px',
            letterSpacing: '0.06em',
            color: 'var(--px-accent, var(--dsw-alias-brand-primary))'
          }
        }, 'HUASHU PIXEL'),
        React.createElement('div', { key: 'title', style: { fontSize: '14px', color: 'var(--dsw-alias-label-primary)' } }, t('px.title')),
        React.createElement('div', { key: 'hint', style: { fontSize: '12px', color: 'var(--dsw-alias-label-caption)' } }, t('px.hint')),
        group(t('px.motion'), [
          { value: 'normal', label: t('px.motionNormal'), active: current.motion === 'normal', onClick: () => setOption('motion', 'normal') },
          { value: 'quiet', label: t('px.motionQuiet'), active: current.motion === 'quiet', onClick: () => setOption('motion', 'quiet') },
          { value: 'arcade', label: t('px.motionArcade'), active: current.motion === 'arcade', onClick: () => setOption('motion', 'arcade') },
          { value: 'off', label: t('px.motionOff'), active: current.motion === 'off', onClick: () => setOption('motion', 'off') }
        ]),
        group(t('px.scanlines'), [
          { value: 'on', label: t('px.on'), active: current.scanlines, onClick: () => setOption('scanlines', true) },
          { value: 'off', label: t('px.off'), active: !current.scanlines, onClick: () => setOption('scanlines', false) }
        ]),
        group(t('px.fonts'), [
          { value: 'headings', label: t('px.fontsHeadings'), active: current.pixelFonts === 'headings', onClick: () => setOption('pixelFonts', 'headings') },
          { value: 'all', label: t('px.fontsAll'), active: current.pixelFonts === 'all', onClick: () => setOption('pixelFonts', 'all') },
          { value: 'off', label: t('px.fontsOff'), active: current.pixelFonts === 'off', onClick: () => setOption('pixelFonts', 'off') }
        ]),
        group('', [
          { value: 'on', label: t('px.on'), active: current.enabled, onClick: () => setOption('enabled', true) },
          { value: 'off', label: t('px.off'), active: !current.enabled, onClick: () => setOption('enabled', false) }
        ])
      ])
    }

    /* ==================================================================== *
     * 七、入口
     * ==================================================================== */

    /**
     * 浏览器半边入口。
     * @param context - 客户端插件上下文（theme / slots / locale 已就绪）。
     */
    function apply(context) {
      ctx = context
      applyVisuals()

      // 配置变更或卸载都要能收回所有资源。
      ctx.effect(() => () => {
        if (resources.layer !== null) { resources.layer(); resources.layer = null }
        if (resources.style !== null) { resources.style.remove(); resources.style = null }
        if (resources.overlay !== null) { resources.overlay.remove(); resources.overlay = null }
        clearAttributes()
      }, `${PLUGIN_ID}: theme cleanup`)

      ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), `${PLUGIN_ID}: settings row dictionaries`)

      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'huashu-pixel',
        order: SETTINGS_ORDER,
        locale: SETTINGS_NS
      }, SettingsRow))

      // 调试 API：`__HUASHU_PIXEL__.set({motion:'arcade'})`，与设置行同一份状态（会持久化）。
      const debugApi = {
        version: VERSION,
        state: () => ({ ...state }),
        set(partial) {
          for (const [key, value] of Object.entries(partial ?? {})) setOption(key, value)
          return { ...state }
        },
        reset() {
          for (const key of Object.keys(DEFAULTS)) setOption(key, DEFAULTS[key])
          return { ...state }
        }
      }
      window.__HUASHU_PIXEL__ = debugApi
      ctx.effect(() => () => { if (window.__HUASHU_PIXEL__ === debugApi) delete window.__HUASHU_PIXEL__ }, `${PLUGIN_ID}: debug api`)

      log('info', `ready v${VERSION} (enabled=${state.enabled} motion=${state.motion} scanlines=${state.scanlines} pixelFonts=${state.pixelFonts})`)
    }

    exports.inject = ['theme', 'slots', 'locale']
    exports.apply = apply
    return module.exports
  }
})
