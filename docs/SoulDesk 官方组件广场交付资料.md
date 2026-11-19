# SoulDesk 官方组件广场交付资料

将本文件放入组件仓库根目录，作为首轮实施和验收依据。目标是让官方免费组件独立发版，用户可以从网页下载 ZIP，也可以在 SoulDesk 的「官方广场」直接安装、更新和卸载。

| 项目 | 约定 |
| --- | --- |
| 组件仓库 | [Cosmocraft996/SoulDesk-Widgets](https://github.com/Cosmocraft996/SoulDesk-Widgets)，公开仓库，默认分支为 `main` |
| 宿主仓库 | [Cosmocraft996/SoulDesk](https://github.com/Cosmocraft996/SoulDesk) |
| 首期部署 | GitHub Pages 发布网页和目录，GitHub Releases 分发按版本固定的组件 ZIP |
| 实施顺序 | 先在独立仓库发布样例并用现有安装版验证 ZIP 导入和升级，再接入应用内广场 |

## 1. 仓库职责和目录

组件仓库维护组件源码、组件构建、上架记录和网页广场。SoulDesk 主仓库维护 SDK、宿主权限、组件包校验、试加载、实例管理和应用内广场。普通组件独立发版。依赖新宿主接口或固定原生能力的组件，等支持该能力的 SoulDesk 版本发布并验证后再上架。 [SoulDesk 组件 SDK](https://github.com/Cosmocraft996/SoulDesk/blob/main/sdk/README.md)

```text
SoulDesk-Widgets/
├── widgets/
│   └── daily-note/             # 每个组件一个目录
│       ├── manifest.json       # SoulDesk 组件清单
│       ├── src/                # 组件源码
│       ├── README.md           # 用途、权限、来源和兼容性
│       ├── CHANGELOG.md        # 组件更新记录
│       └── preview/            # 广场截图
├── catalog/                    # 每个组件的收录信息和已发布版本记录
├── site/                       # 网页广场源码
├── scripts/                    # 打包、校验与生成目录
├── sdk.lock.json               # 固定的宿主 SDK 版本或提交
└── .github/workflows/          # 合并检查、组件发布与 Pages 部署
```

- 每个组件使用稳定 ID 和三段数字版本。新组件可采用 `official.souldesk.<组件名>`。接管已有组件的更新时，沿用原 ID，验证旧配置和数据兼容。首批优先选择自有或许可明确、权限简单的组件。
- 打包复用普通组件 SDK 契约。ZIP 根目录放 `manifest.json`，静态资源放 `dist/`。打包时带上锁定版本的宿主 SDK，资源采用相对路径，初始化完成后通过 `host.ready()` 报告就绪。
- 按宿主限制校验成品。ZIP 最多 20 MiB，展开最多 50 MiB，最多 256 个文件项。相同 ID 和版本对应固定的 ZIP 内容，修改内容时提升版本。 [包契约与限制](https://github.com/Cosmocraft996/SoulDesk/blob/main/sdk/README.md)

## 2. 发布与上架

1. **合并组件变更。** 检查组件清单、权限、版本、相对资源、依赖锁定和 ZIP 结构。新组件、权限变化或数据结构变更，需要用目标 Windows 版本实际验证导入、主要交互和升级。最低 SoulDesk 版本填实际通过的版本，宿主接口大版本由清单另行声明。
2. **创建组件标签。** 例如 `widget-daily-note-v0.1.0`。发布工作流从该标签构建对应组件，生成 `official.souldesk.daily-note-0.1.0.zip`、文件大小和 SHA-256。每个组件按自己的发布节奏打标签。
3. **发布版本。** 将 ZIP 上传到 Release 草稿并核对后公开，建议启用不可变 Release。广场引用对应标签的自定义 ZIP 资产。 [GitHub 不可变 Release](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) · [Release 资产下载说明](https://docs.github.com/en/rest/releases/assets)
4. **合入收录记录。** 从公开下载地址读取 ZIP，核对大小和 SHA-256 后，将该版本的下载地址、摘要、最低宿主版本和说明纳入 `catalog/`。由 `main` 分支工作流生成网页和目录索引，并统一部署到 Pages。发布阶段失败时，继续展示上一次成功部署的目录。 [GitHub Pages 发布流程](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
5. **核对线上产物。** 打开网页详情和目录地址，从公开地址下载成功，记录组件标签、ZIP 摘要、实测宿主版本及结果。需要撤回时，更新目录中的版本状态并重新签名和部署。需要修复时，发布更高版本。

## 3. 目录与校验契约

网页和应用读取同一份 `catalog.json`。顶层包含目录格式版本和单调递增的目录修订号。组件条目包含稳定 ID、名称、简介、分类和截图地址。每个版本包含组件版本、最低 SoulDesk 版本、权限、更新说明、发布状态和下载信息。从 ZIP 清单生成 ID、版本和权限，从真实产物生成大小和摘要。每个组件可以收录多个版本，客户端选择仍可安装且兼容的最高版本。

下方是目录内容示例。版本、大小、摘要和下载地址仅用于说明字段，正式记录由发布流程生成。

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "widgets": [
    {
      "id": "official.souldesk.daily-note",
      "name": "桌面便签",
      "summary": "在桌面或侧边面板记录常用文字。",
      "category": "效率",
      "screenshots": ["./images/daily-note.png"],
      "versions": [
        {
          "version": "0.1.0",
          "minHostVersion": "0.5.0",
          "capabilities": ["storage.instance"],
          "releaseNotes": "首次发布。",
          "status": "published",
          "downloadUrl": "https://github.com/Cosmocraft996/SoulDesk-Widgets/releases/download/widget-daily-note-v0.1.0/official.souldesk.daily-note-0.1.0.zip",
          "sizeBytes": 16384,
          "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
        }
      ]
    }
  ]
}
```

- 应用内安装上线前签名目录。首版可在同一部署产物中提供 `catalog.json` 和 `catalog.json.sig`，对 JSON 的原始字节签名。官方私钥放在受保护的发布环境，客户端内置公钥。验签失败或目录修订号倒退时保留上次可信目录，并等候重新刷新。
- 用户确认安装或更新时，由宿主在线复核所选版本仍可安装。从目录指定的 HTTPS 地址下载，遵守宿主的包大小限制。核对文件长度、SHA-256 和包内 ID、版本及权限后，再进入原有导入流程。
- `published` 表示该版本可参与选择，`withdrawn` 表示撤回。撤回只改变线上可安装状态，本地组件仍由用户管理。目录数据和版本发布状态可以独立更新，组件 ZIP 继续按版本固定。

## 4. SoulDesk 管理窗口行为

管理窗口提供「官方广场」「组件库」「已添加」。官方广场负责浏览和线上包管理，组件库负责添加组件及离线卸载，「已添加」负责已有实例的显示、移动和删除。

| 场景 | 客户端行为 |
| --- | --- |
| 首次安装 | 显示名称、版本、最低宿主版本和权限。确认后下载、校验、试加载并启用。安装成功后提供「添加到面板」，由用户决定是否创建实例。 |
| 更新 | 有更高兼容版本时提供「更新」，显示变更说明和新增权限。确认后复用既有升级校验。升级成功后保留兼容的实例数据，试加载或事务失败时继续使用原版。 |
| 版本不兼容或冲突 | 提示所需宿主版本。同 ID、同版本且摘要一致时识别为同一版本，内容不同则提示冲突。本地版本更高时继续保留本地版本。 |
| 未使用的包 | 从广场或组件库执行「卸载」，取消本地登记。历史资源沿用现有保留策略。 |
| 仍有实例 | 显示实例数量和「管理实例」入口。删除实例需要显式确认，实例配置随实例删除。全部实例移除后即可卸载。 |
| 断网或目录故障 | 可浏览上次验签成功的目录，也可从本地组件库管理和卸载包。安装或更新等待目录在线复核成功。 |
| 包已下架 | 新用户无法从广场安装已撤回版本。已装用户仍可在组件库管理和卸载。 |

宿主实现复用 ZIP 导入、隐藏试加载、事务启用和实例外键保护。组件包和正在使用该包的实例各自有生命周期。 [SoulDesk 包安装流程](https://github.com/Cosmocraft996/SoulDesk/blob/main/src-tauri/src/packages.rs) · [组件登记与卸载](https://github.com/Cosmocraft996/SoulDesk/blob/main/src-tauri/src/widgets.rs)

## 5. 云服务器使用条件

| 目标用户网络上的实测结果 | 部署决定 |
| --- | --- |
| Pages 目录和 Releases 下载都稳定 | 继续用 Pages 和 Releases。 |
| 目录稳定，ZIP 下载经常超时或失败 | 用云服务器镜像同一份 ZIP，发布目录前核对镜像文件的大小和 SHA-256。 |
| Pages 页面或目录也经常无法加载 | 将网页、签名目录和 ZIP 迁到云服务器静态托管，GitHub 继续负责版本和构建。 |
| 需要站内账号、在线投稿审核或付费 | 再规划后端。以商业交易为主的站点使用其他托管。 [GitHub Pages 使用限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |

有自有域名时，在正式客户端上线前为广场确定稳定子域名，便于以后切换托管。开发联调可先使用 GitHub Pages 项目地址。正式目录 URL、发布签名公钥和目标网络实测结果，在客户端接入前完成确认。 [GitHub Pages 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)

## 6. 实施与验收

### 第一阶段　独立仓库发布

- [x] 初始化组件目录、SDK 锁定、打包和发布工作流。
- [x] 上架 2～3 个低权限样例，验证网页浏览、目录读取、按版本下载和 ZIP 摘要。
- [x] 用真实 Windows 安装版执行一次首次导入、添加到面板、重开恢复及保留配置的升版。记录包版本、摘要和实测的宿主版本。
- [x] 从目标用户的实际网络分别验证目录和 ZIP 可达性，决定是否启用下载镜像。

实测版本和摘要见 [首批组件验收记录](首批组件验收记录.md)。

### 第二阶段　SoulDesk 应用内广场

- [x] 接入正式目录地址和验签，完成安装、更新、添加到面板、卸载及状态联动。
- [x] 验证旧宿主选择兼容版本、本地包版本冲突、权限变化提示和多个现有实例的配置保留。
- [x] 验证坏摘要、下载中断、试加载超时和目录验签失败。检查失败提示及原安装状态。
- [x] 验证有实例时保护卸载、无实例时卸载、断网及下架后从本地组件库卸载。
- [x] 在真实安装版完成一轮应用内发布验收，记录目录修订号、组件版本、宿主版本和网络环境。

应用内验收使用 Windows x64 安装包内的宿主程序运行原生隔离检查。界面交互通过 DOM 回归验证。各项证据见 [首批组件验收记录](首批组件验收记录.md#应用内接入)。

初次实施从组件仓库第一阶段开始。首个组件用于验证独立打包、Release 下载、上架目录、手动导入和保留数据的升级，再用同一目录接入 SoulDesk。
