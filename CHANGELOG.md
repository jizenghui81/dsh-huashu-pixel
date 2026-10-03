# CHANGELOG · dsh-huashu-pixel

## V1.2.0 · 2026-10-03

按反馈做的两件事（强度档保持"标准"不变）。

**修：侧栏字号偏小、看不清**
- 会话/项目行标题与次行**退出像素字体作用域**（原先被钉在 12px 网格上），改用系统字体：标题 14px / 行高 20px，次行 12px；行最小高度 32px。
- 像素感改由像素灯位（14px 方块）、方块化行、选中墨块 + 橙轨承担——不吃可读性。

**新：输出中的 Loading 进度条**
- 输入卡上沿一条 7px 像素质感进度条：纸面底槽 + 1px 墨线 + 8px 像素格；琥珀实心填充 `steps(12)` 走 18 秒推进到 92%（温和档 26 秒）；右缘一块更亮的"打印头"（`box-shadow: 2px 0 0 墨 + 磷光`）。
- 忙闲判定：`[data-shimmer] | [data-running] | [data-state="ongoing"|"running"]`，探测范围收在会话滚动容器内，140ms 尾随节流；结束后挂 520ms 的 `done` 态（走满 + 闪一下 + 淡出）。
- `prefers-reduced-motion` 下不跑动画（停在 60%），无动效档直接不显示。

**验证**：`npm test` 14 组断言全过；预览新增 `preview-busy.html` 与 `screenshots/busy.png`。

## V1.1.0 · 2026-10-03

「体感加强版」，并且**把力度做成可调的三档**（默认标准）——第一版一次推太满，这一版改为让用户挑。

**新增**
- **体感强度三档**：`轻 / 标准 / 浓`（`data-px-intensity`）。圆角尺度、控件描边、卡片气泡描边、菜单反白、扫描线强度全部按档切换；圆角因此**移出 token 表**改在样式表里按档声明（token 是先内联写到 body 上的，切档取不到新值）。
- **侧栏像素化 + 状态灯**：会话行方角化，选中＝墨块 + 左侧橙灯，行首 14px 像素灯位（`[class*="_slot"]`，随动效档硬闪）；状态灯统一方块 + 描边，且**只作用于 `span/svg/i/b/em`**——行容器也带 `data-state`，作用于容器会把整张工具卡刷成橙色（实测踩到并已修）。
- **开屏自检**：标准档一次约 0.6s 的两行上电；街机档五行 BIOS 自检约 1.25s；点一下跳过，`quiet`/`off` 与 `prefers-reduced-motion` 不播。
- **全界面 · 12px 档**：像素字体档新增 `all12`，把正文钉在像素字体的原生网格上（覆盖 ui-layout 的内联正文字号）。
- **浓档专属**：流式文字下方逐格行进的橙色"打印头"下划线；按钮常驻 1.5px 描边 + 2px 硬投影；按下位移 2px。

**下调（对比 V1.1 开发中的过强版本）**
- 扫描线：1px/3px 周期 → **1px/4px**，透明度 5.5%/8.5% → **3.2%/5.5%**（标准档 4.2%/5.5%），暗角减弱；「轻」档 2.2%。
- 关键面投影：4px 纯墨 → 标准档 **3px 半透明**，只有「浓」档才用 5px 纯墨。
- 流式光标 9×15 → 8×13，磷光 10px → 7px（标准档 9px）。
- 侧栏选中反白、卡片/气泡描边、按钮常驻描边一律**只在标准/浓档**出现。

**验收**
- `npm test` 14 组断言（新增强度三档、圆角出表、全界面·12px 档）。
- 预览从真 bundle 重生成，新增 `preview-soft/-strong/-boot.html` 与四张对照截图。

## V1.0.0 · 2026-10-03

首版。花书像素主题：两套配色 + 像素字体 + 街机 / CRT 动效。

**按插件市场范式写的**（对齐 dsh-neo-skin / ikun-theme-skin 一类已上架主题）：

- **Host 半边零依赖**：只用 Node 内置模块 + `webServer` 一条字体路由；**没有 Config、没有 node_modules、没有构建步骤**。
- **配置存 localStorage**，不用 dsh-settings：第三方命名空间在 Web 客户端读不到（Host apiproxy 只暴露白名单内的命名空间，社区同类插件同样这么做）。
- **设置行注册进 `settings.general.item`**（与官方「外观」「字号」同一座位），文案走 `locale` 命名空间，卸载即随插件移除。
- **清单补齐上架所需元数据**：`icon`（SVG）、`locale/zh.json` + `locale/en.json` 的 `meta.title/description`、`exports` 暴露 `./package.json` 与 `./locale/*.json`、`files` 列全运行期资源、`engines.dsh` 与 `manifestVersion`、`publishConfig.access=public`、`dsh-plugin.naming.json`。
- **`dsh.client.inject`** 声明 `@deepseek-ai/dsh-client-ui-theme`（排序激活，不取模块）。
- **投稿材料就绪**：`docs/PUBLISHING.md` + `docs/awesome-dsh-plugin.yml`（category `theme`，含中英描述）；包名 `dsh-huashu-pixel` 在 npm 上未被占用。
- **截图来自真 bundle**：`scripts/build-preview.mjs` 把 `lib/client.js` 放进最小替身跑一遍，取它真正注入的样式表生成 `preview.html` / `preview-dark.html`，再截 `screenshots/`——不是手抄的第二份 CSS。

**字体网格修正（实测实拍）**：像素字体只在原生网格上清晰（Ark Pixel 12px；Press Start 2P 8px）。控件统一钉 **12px**；原先给 `h1/h2` 套像素字在 20px 上笔画不匀，已移除，标题与正文保持系统字体。

**配色**
- 亮色「暖调像素」：纸 `#F5F0EB`、卡 `#FFFDF9`、墨 `#2A2520`、棕 `#8B7355`、金 `#D4A574`、橙 `#E8642C`、描边 `#D4C5B8`。
- 暗色「街机磷光」：底 `#14110D`、面板 `#1C1813`、磷光米 `#F2E3C6`、琥珀 `#FFAE2B`。
- 覆盖 130 个 `--dsw-*` token：6 档静态色阶（19+16+12+11+6+8+5 项）+ 别名层写死 hex 的 47 项 + 6 档圆角。
- 配色走 `ctx.theme.overrideTokens`，亮暗自动切换；样式表同源兜底。

**形状与材质**
- 圆角 4/8/12/16/20/28px → 2/4/6/8/10/12px。
- 面板 / 浮层 / 对话框 / 菜单：硬描边 + 3–5px 实心偏移投影（无模糊）；菜单去毛玻璃改实底。
- 表头改墨底纸字；引用块改 3px 橙线 + 棕字（对齐文稿的 `.sub` 与表格语言）。
- 滚动条 5px → 10px 且方角。

**字体**（随包发布，经 Host `webServer` 路由 `/huashu-pixel/fonts/*` 直出）
- Ark Pixel 12px zh_hans 子集 552KB（中文 + 拉丁）。
- Press Start 2P 12KB（拉丁展示体）。
- 默认只作用于控件 / 标签 / 标题，正文与对话保持系统字体。

**动效**
- 流式：尾部 7×12px 方块光标 `steps(1)` 硬闪 + 磷光；官方扫光只改缓动为 `steps(8)`；转轮改 4 格跳转。
- 状态：`[data-running]` 底部逐格行进像素条（`steps(7)`）；`[data-turn-start]` 扫描线下扫一次；
  `[data-turn-end]` CRT 收尾闪（只动 `filter`，不动布局）；`[data-error]` 红灯硬闪两下；菜单硬弹出。
- 覆层：CRT 扫描线（亮 multiply 5.5% / 暗 screen 8.5%），`pointer-events:none`。
- 分档 `normal / quiet / arcade / off`；`arcade` 追加抖动、屏闪、开机自检；`prefers-reduced-motion` 全关。

**工程**
- Host：4 个 `.volatile()` 配置字段（设置页即时生效）+ 字体路由 + index 首屏配置注入 + `ready` 留痕。
- Client：手写 bundle，零 `require`、零组件、零对外依赖；资源全部挂在 `ctx.effect` 上，卸载即清。
- `test/smoke.mjs`：最小 DOM 替身跑真 bundle，断言注入 / token 契约（130 项 `{light,dark}` 字符串对）/
  状态位 / 调试 API / 卸载 / 总开关；`node --check` 双文件语法。
