# 上架 PR 草稿（awesome-dsh-plugin）

仓库侧已就绪：`https://github.com/jizenghui81/dsh-huashu-pixel`（public，含 `dsh-plugin` topic）。
fork 与分支也已推好：`jizenghui81/awesome-dsh-plugin` @ `add-huashu-pixel`，条目文件
`data/plugins/jizenghui81__dsh-huashu-pixel.yml`（分类 `theme`）。

**只剩"创建 PR"这一步**：本机钥匙串里的 GitHub 令牌是**细粒度**令牌，对第三方仓库没有
Pull requests 写权限（实测 `POST /pulls` → 403 `Resource not accessible by personal access token`）。
两种补法，任选其一：

## A. 点一下（10 秒，零安装）

预填好的 compare 链接（标题与正文都已带好）：

```
https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare/main...jizenghui81:add-huashu-pixel?expand=1&title=Add%20jizenghui81/dsh-huashu-pixel%20%28theme%29&body=Adds%20%60jizenghui81/dsh-huashu-pixel%60%20under%20%60theme%60.%0A%0AWarm%20pixel%20theme%20for%20the%20DSH%20Web%20UI%3A%20cream-paper%20and%20arcade-phosphor%20palettes%2C%20hard-edged%20pixel%20chrome%2C%20bundled%20OFL%20pixel%20fonts%20served%20from%20the%20plugin%27s%20own%20Host%20route%2C%20CRT%20motion%20on%20streaming%20and%20state%20changes%2C%20three%20intensity%20tiers%2C%20and%20a%20pixel%20loading%20bar%20while%20a%20turn%20runs.%20Switches%20live%20in%20a%20General%20settings%20row.%0A%0AInstall%3A%20%60dsh%20plugin%20--profile%20desktop%20add%20github%3Ajizenghui81/dsh-huashu-pixel%60%0A%0ADeclares%20%60dsh.bundle.patch%60%20with%20%60cordis.patch.yml%60%20at%20the%20root%2C%20%60lib/%60%20committed%2C%20no%20npm%20dependencies%20in%20the%20Host%20half.%20Verified%20locally%3A%20activates%20in%20a%20desktop%20profile%2C%20%60npm%20test%60%20%28DOM/React/cordis%20harness%20against%20the%20real%20client%20bundle%29%20passes%2C%20%60npm%20pack%20--dry-run%60%20is%20clean.%20GitHub-only%20install%2C%20not%20on%20npm.
```

或只用短链接、自己粘标题正文：

```
https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/compare/main...jizenghui81:add-huashu-pixel?expand=1
```

标题：`Add jizenghui81/dsh-huashu-pixel (theme)`

## B. 让我全自动（一次性授权）

装 `gh`（本机没有 Homebrew，用官方二进制）后 `gh auth login`（浏览器设备码，约 1 分钟），
之后我可以直接用 gh 建 PR，也能脚本化后续版本。

## 收录门槛提醒

- 仓库需**满 1 天**才过自动 CI（本仓库 2026-10-03 创建 → 2026-10-04 起安全）。
- 仓库已加 `dsh-plugin` topic ✓
- `dsh.bundle.patch` + 根 `cordis.patch.yml` ✓ ／ `lib/` 已提交 ✓ ／ 无 install script ✓

## PR 正文（备用）

见 `docs/awesome-dsh-plugin.yml` 与本文件顶部链接中的 body 参数。
