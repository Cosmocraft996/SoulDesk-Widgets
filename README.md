# SoulDesk 官方组件广场

本仓库维护可独立发版的官方免费组件。GitHub Pages 提供广场网页和目录，GitHub Releases 提供每个版本的 ZIP。SoulDesk 管理窗口中的「导入本地 ZIP」可以直接导入组件。

[官方组件广场](https://cosmocraft996.github.io/SoulDesk-Widgets/) · [组件目录](https://cosmocraft996.github.io/SoulDesk-Widgets/catalog.json)

广场支持组合使用用途分类和关键词搜索。分类维护在 `catalog/<组件>.json` 的 `category` 字段，修改已收录组件的分类时提高目录修订号。

| 组件 | 权限 | 用途 |
| --- | --- | --- |
| [桌面便签](widgets/daily-note/README.md) | `storage.instance` | 在当前实例保存便签文字 |
| [本地时钟](widgets/local-clock/README.md) | 无 | 显示电脑本地时间、日期和星期 |

## 仓库分工

- 组件广场维护 `widgets/` 的独立组件、`catalog/` 的收录记录和站点发布。迁入的既有组件沿用原 ID，供宿主的已有实例升级。
- [SoulDesk 宿主](https://github.com/Cosmocraft996/SoulDesk) 维护 Windows 运行时、SDK、宿主能力和隔离验证。
- [组件开发 Skill](https://github.com/Cosmocraft996/Souldesk-Widget-Skill) 维护 AI 生成及验证工作流。在以宿主为主目录的 Codex 项目里选用 `$souldesk-widget`，明确在广场仓库创建或更新组件。
- 多组件共享或由 Vite 构建的迁移源与构建入口保存在 `source/widgetjs-port/`；各组件当前独立安装资源在 `widgets/<目录>/src/`。目录项中的空版本列表表示源码已经迁入，等待发版和收录。

## 本地构建

使用 Python 3.12。构建脚本没有第三方依赖，首次运行会从宿主仓库拉取锁定的 SDK 并校验 SHA-256。离线时可提供相同版本的 SDK 文件。

```powershell
python scripts/widget.py
python scripts/catalog.py build --out artifacts/preview --preview
python -m http.server 8000 --directory artifacts/preview
```

打开 [本地广场](http://127.0.0.1:8000/)。本地预览包含当前源码生成的候选 ZIP，详情标明「本地预览版」。正式目录只含已收录的发布版本。再次生成时使用新的空输出目录。

组件包位于 `artifacts/widgets/`，同目录有 SHA-256 文件和发布说明。可单独构建某个组件，例如 `python scripts/widget.py daily-note`。使用 `--sdk <文件>` 时也会核对锁定摘要。

## 发布与收录

1. 在 `widgets/<组件>/` 更新源码、清单和变更记录。组件 ID 保持稳定。包内容有变化时增加组件版本。
2. 检查构建结果，并在目标 Windows 安装版导入同一份 ZIP。首次导入、主要操作、面板恢复和有数据的升版按适用场景验证，记录宿主版本及 SHA-256。
3. 合入源码后为对应提交创建标签，例如 `widget-daily-note-v0.1.0`。标签工作流会构建 ZIP 并生成 Release 草稿。核对草稿附件与验收 ZIP 的摘要及大小，再公开该 Release。核对后保持资产固定。
4. 用实际验收包生成收录记录。脚本会从公开 Release 下载 ZIP，比较清单、大小和 SHA-256。下方宿主版本按实际通过的版本填写。

   ```powershell
   python scripts/catalog.py record daily-note artifacts/widgets/official.souldesk.daily-note-0.1.0.zip --min-host 0.5.2
   ```

5. 合入收录记录后，Pages 工作流重新校验公开包并部署。首次配置时在仓库 Pages 设置选择 GitHub Actions 发布源。部署后打开网页组件详情与 `catalog.json`，从目标网络下载核对。撤回时将记录改为 `withdrawn` 并增加 `catalog/revision.json` 的修订号。

## 目录签名

受保护的 `github-pages` 发布环境用 `CATALOG_SIGNING_KEY` 对原始 `catalog.json` 字节签名，输出 64 字节的 `catalog.json.sig`。工作流发布前使用固定公钥复验。客户端使用同一把公钥和上方的正式目录地址。[Ed25519 公钥](docs/catalog-public-key.pem)

更多实施顺序和验收条件见 [SoulDesk 官方组件广场交付资料](<docs/SoulDesk 官方组件广场交付资料.md>)。
