# 发布与投稿

**双远端分工（2026-10-04 定）**：`origin` = **GitCode 主库**（国内直连、推送不用代理）；
`github` = **GitHub 镜像**（插件市场 / awesome-dsh-plugin 投稿只认 GitHub 仓库，所以镜像必须存在且同步）。

| 用途 | 地址 |
|:--|:--|
| 主库（推送/issue） | https://gitcode.com/weixin_42127089/dsh-huashu-pixel |
| 镜像（投稿/短链安装） | https://github.com/jizenghui81/dsh-huashu-pixel |

```sh
git push origin main     # GitCode 主
git push github main     # 同步镜像
```

## 0. 前置：仓库与远端（已建好，此节留作重建参考）

```sh
cd ~/code/dsh-huashu-pixel
git remote add origin https://gitcode.com/weixin_42127089/dsh-huashu-pixel.git
git remote add github https://github.com/jizenghui81/dsh-huashu-pixel.git
git push -u origin main && git push github main
```

GitCode 无仓库简写（`github:`/`gitlab:`/`bitbucket:` 之外没有 `gitcode:`），别人安装要用**完整地址**：
`dsh plugin --profile desktop add https://gitcode.com/weixin_42127089/dsh-huashu-pixel`。

仓库名与 `package.json` 的 `name` 一致（`dsh-huashu-pixel`）。给 **GitHub 镜像**加 **`dsh-plugin`** topic —— 投稿要求之一。

> ⚠️ `lib/` 是**提交进仓库的产物**（本插件无构建步骤，源码即产物）。git 安装只拿得到已提交内容。

## 1. 发 npm（可选）

包名 `dsh-huashu-pixel` 在 npm 上未被占用（2026-10-03 核实）。作者 `author` / `repository` / `homepage` / `bugs` 已写好在 `package.json` 里，需要的话改成你自己的账号：

```sh
npm login
npm publish            # prepublishOnly 会先跑语法检查 + 冒烟测试
```

## 2. 投 awesome-dsh-plugin（市场收录）

市场（dshmarket）的插件列表**完全来自** [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。
投稿 = 往 `data/plugins/` 加**一个** YAML 文件，路径与内容见本目录 `awesome-dsh-plugin.yml`：
⚠️ 投稿条目里的 `url` 必须指 **GitHub 镜像**（他们的 CI 只校验 GitHub 仓库：满 1 天、`dsh-plugin` topic 等），别改成 GitCode。

```sh
# fork + clone awesome-dsh-plugin，然后：
cp docs/awesome-dsh-plugin.yml ../awesome-dsh-plugin/data/plugins/jizenghui81__dsh-huashu-pixel.yml
cd ../awesome-dsh-plugin && git checkout -b add-dsh-huashu-pixel && git add -A && git commit -m "Add jizenghui81/dsh-huashu-pixel" && git push
# 然后开 PR
```

收录硬条件（逐条对着自查，2026-10-03 版 contributing.md）：

| 条件 | 本仓库 |
|:--|:--|
| `package.json` 声明 `dsh.bundle`（只有 `dsh.client` 不算可安装） | ✅ `dsh.bundle.patch: ./cordis.patch.yml` |
| 仓库根有 `cordis.patch.yml` | ✅ |
| 真实可用代码，非占位/纯 README | ✅ Host + 浏览器两半，带冒烟测试 |
| 仓库创建满 1 天（CI 自动检查） | ⏳ 建仓库后隔天再提 |
| 活跃维护 | ✅ |
| 仓库带 `dsh-plugin` topic | ⏳ 建仓库时加 |
| 描述只讲功能、不带营销词 | ✅ 见投稿模板 |
| `category` 取合法值 | ✅ `theme`（市场会把它归到「主题」页，装完即时启用、主题互斥、可一键切换） |

## 3. 发布前自查命令

```sh
npm run check                 # node --check ×4 + 冒烟测试
npm test                      # 最小 DOM/React/cordis 替身跑真 bundle
npm pack --dry-run            # 确认 tarball 内容（lib/locale/fonts/icon/screenshots/…）
node scripts/build-preview.mjs && open preview.html
```
