# 热榜

通过顶部下拉菜单查看 B 站、抖音、头条、微博和知乎热榜。组件首次打开默认显示 B 站，之后按实例恢复上次选择。当前榜单通过宿主公开内容接口获取，点击榜单条目在系统浏览器打开。

组件 ID 为 `official.souldesk.hot-rank`。最低宿主版本为 SoulDesk 0.5.6。

微博和知乎需使用包含对应取数修复的宿主构建。B 站徽标修复随热榜组件 0.1.1 更新。

自动刷新默认每 20 分钟一次。点击来源旁的分钟数可修改当前实例的间隔，支持 1 至 1440 分钟。打开组件或切换来源时会立即请求榜单。

## 构建

沿用 [WidgetJS 移植工具链](../../source/widgetjs-port/README.md)。从组件广场根目录运行：

```powershell
pnpm --dir source/widgetjs-port exec vite build --config components/widgetjs/hot-rank-source/vite.config.mjs
python scripts/widget.py hot-rank
```

前端源码位于 [hot-rank-source](../../source/widgetjs-port/components/widgetjs/hot-rank-source)。榜单视图、数据适配和来源记录沿用 [hotspot-source](../../source/widgetjs-port/components/widgetjs/hotspot-source)。ZIP 构建时注入广场锁定的宿主 SDK。
