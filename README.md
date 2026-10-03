# dsh-huashu-pixel · 花书像素

给 DSH Web GUI 换一套**暖调像素**主题：亮色是暖米白纸面 + 深褐墨字的「设计文稿」，暗色切到老式街机的琥珀磷光；控件与标签用像素字体，正文保持系统字体；流式输出与状态变化带方块光标、扫描线、硬切闪帧等 CRT 动效。

![亮色：暖调像素](screenshots/light.png)
![暗色：街机磷光](screenshots/dark.png)

> 截图由 `scripts/build-preview.mjs` 从**真 bundle** 生成（不是手抄的第二份 CSS）。

## 装

```sh
# 从 GitHub（本仓库）
dsh plugin --profile desktop add github:jizenghui81/dsh-huashu-pixel

# 或从 npm
dsh plugin --profile desktop add dsh-huashu-pixel
```

两种方式都要重启宿主/刷新页面后生效（改了浏览器半边时要 **Cmd+R 刷新**；宿主半边改动需要重启）。

## 配置

「设置 → 通用 → 花书像素」一行四组档位（存在浏览器 localStorage，刷新/重启后保留）：

| 档位 | 取值 | 默认 | 说明 |
|:--|:--|:--|:--|
| 动效 | 标准 / 温和 / 街机 / 无 | 标准 | 街机档另加抖动、屏闪与开机自检 |
| 扫描线 | 开 / 关 | 开 | CRT 扫描线覆层（`pointer-events:none`，不影响点击） |
| 像素字体 | 控件与标签 / 全界面 / 关 | 控件与标签 | 全界面档连正文一起像素化（字号取 12/24px 倍数最清晰） |
| 总开关 | 开 / 关 | 开 | 关掉即整套停用，资源全部回收 |

命令行里也能临时试档（与设置行同一份状态，会写入 localStorage）：

```js
__HUASHU_PIXEL__.set({ motion: 'arcade' })    // 街机档
__HUASHU_PIXEL__.set({ pixelFonts: 'all' })   // 全界面像素
__HUASHU_PIXEL__.reset()                      // 回到出厂默认
```

## 主题内容

- **配色**：覆盖 130 个 `--dsw-*` token。6 档静态色阶（换成暖色系）让所有 `var(--dsw-static-*)` 派生的别名自动跟随；别名层单独覆盖写死 hex 的 47 项（描边、遮罩、悬停、菜单实底、diff 底色、菜单分组底）。亮色对齐这套像素文稿的既有色：纸 `#F5F0EB`、卡 `#FFFDF9`、墨 `#2A2520`、棕 `#8B7355`、金 `#D4A574`、橙 `#E8642C`、描边 `#D4C5B8`；暗色为底 `#14110D`、面板 `#1C1813`、磷光米 `#F2E3C6`、琥珀 `#FFAE2B`。
- **形状**：圆角 4/8/12/16/20/28px → 2/4/6/8/10/12px；菜单/浮层/对话框/输入区改**硬描边 + 3–5px 实心偏移投影**，去掉毛玻璃；滚动条 5px → 10px 且方角；表头墨底纸字；引用块 3px 橙线 + 棕字。
- **字体**：随包发布两个 OFL 像素字体——**Ark Pixel 12px**（中文 + 拉丁，552KB）与 **Press Start 2P**（拉丁展示体，12KB）。像素字体只在原生网格上清晰，所以控件统一钉在 12px；正文、代码与 markdown 标题保持系统字体。字体由 Host 半边经 `webServer` 路由 `/huashu-pixel/fonts/*` 直出（文件名白名单，不可穿越）。
- **动效**：流式文字尾部 7×12px 方块光标硬闪 + 磷光，官方扫光只改缓动为 `steps(8)`，运行中转轮改 4 格跳转；`[data-running]` 步骤底部一条逐格行进的像素条；一轮开始扫描线下扫一次；一轮结束 CRT 收尾闪（只动 `filter`）；出错红灯硬闪两下；菜单硬弹出；`prefers-reduced-motion` 下全部关闭。

## 为什么升级不容易打崩

- **配色走官方扩展点**：`ctx.theme.overrideTokens(id, tokens)`，内联生效、优先于任何样式表，亮暗两套随主题自动取值；同一份 token 表同时生成样式表兜底。
- **动效只认组件已经写在 DOM 上的稳定属性**：`data-shimmer` / `data-running` / `data-turn-start` / `data-turn-end` / `data-state` / `data-error` / `data-menu-material` / `data-composer-card` 等；不改任何组件、不读别人的 CSS Module 类名（需要按类名兜底时才用 `[class*="_名字"]` 这种稳定后缀）。
- **Host 半边无依赖**：只用 Node 内置模块 + `webServer` 注册一条字体路由；没有 Config、没有 `node_modules`、没有构建步骤（`lib/` 就是产物）。
- **配置存 localStorage**：第三方插件的 dsh-settings 命名空间在 Web 客户端读不到（Host apiproxy 只暴露白名单内的命名空间），所以开关与档位自持在浏览器里——自包含、不需要改宿主。

## 自检

```sh
npm run check     # 双文件语法 + 冒烟测试
npm test          # 最小 DOM/React/cordis 替身跑真 bundle：注入 / token 契约 / 状态位 / 槽位注册 / 卸载 / 兜底
node scripts/build-preview.mjs   # 从真 bundle 重新生成 preview.html 与 preview-dark.html
```

装到 profile 后的验收证据：

```sh
curl -sI http://127.0.0.1:19387/huashu-pixel/fonts/huashu-pixel-cjk-12.woff2   # 200 + font/woff2
# cordis_inspect_query(client, Slots, listSubTree, root=settings.general.item) → 占用行 id: huashu-pixel
# cordis_inspect_query(client, Theme, listTokens) → 130 个 token 由本插件注册
```

## 发布

见 [docs/PUBLISHING.md](docs/PUBLISHING.md)：npm 发布与 awesome-dsh-plugin 投稿（分类 `theme`）的具体步骤，投稿文件模板在 [docs/awesome-dsh-plugin.yml](docs/awesome-dsh-plugin.yml)。

## 授权

代码 MIT（见 [LICENSE](LICENSE)）。字体沿用各自授权，均为 **SIL Open Font License 1.1**，可随包分发：
`fonts/LICENSE-ArkPixel-OFL.txt`（Ark Pixel Font · TakWolf）与 `fonts/LICENSE-PressStart2P-OFL.txt`（Press Start 2P · The Press Start 2P Project Authors）。
