# NovaTV v1.2.9 系列改动总结

> 会话日期：2026-08-03 ｜ 当前版本：**v1.2.9d**
> 本文档汇总本次会话的全部修改，与 `ITERATION_LOG.md`（逐版本记录）互补。

---

## 一、改动总览

本次会话围绕 5 个方向，共 4 次 git 提交，改动 12+ 文件：

| # | 方向 | 版本 | 提交 |
|---|---|---|---|
| 1 | 豆瓣分类切换空白根治 | v1.2.9 | `544aabb`（基线）|
| 2 | 卡片首次点击无反应修复 | v1.2.9b | — |
| 3 | 移动端分类点击不干脆修复 | v1.2.9c | — |
| 4 | 代码审查 5 项修复 | v1.2.9d | `46aace7` |
| 5 | 版本号同步 + 日期/文案修正 | — | `af34811` `e5377aa` |

> 基线 `544aabb` 备份了 v1.2.9c 之前的状态（148 文件），可随时回滚。

---

## 二、v1.2.9 — 豆瓣分类切换空白根治

### 问题
豆瓣页 `/douban` 电影/剧集/动漫/综艺来回切换，经常一个分类空白或卡顿。

### 三层根因
1. **代理模式绕过服务端**：选代理后前端浏览器直连外部代理/CDN，偶发超时/5xx/限流 → 数据请求失败 → 空白
2. **首页 4 分类并发打同一代理**：被压垮，1-2 个失败 → 部分分类空白
3. **豆瓣页切换时先 `setDoubanData([])` 清空再等 async**：即使缓存命中也要"清空→骨架屏→重新填充"，且 `selectorsReady` 有 50ms + 防抖 100ms 延迟 → **缓存其实命中了，但页面层不等它**

### 修复
- **A. 服务端统一代理**（`src/lib/douban.ts` + 3 个路由）：代理链"用户所选 → 腾讯CDN备用 → 阿里CDN备用 → 直连带Referer"，每层重试 2 次，custom 代理 URL 过 `isSafeUrl` 防 SSRF
- **B. 前端统一走服务端**（`src/lib/douban.client.ts`）：3 个 `get*` 不再浏览器直连代理；修复 direct 分支未检查 `response.ok` 的隐藏 bug；缓存键加代理类型；`fetchWithStaleCache` stale-while-revalidate
- **C. 豆瓣页缓存优先**（`src/app/douban/page.tsx`）：`buildDataRequest` 统一请求；`loadInitialData` 先 peek 缓存命中立即填充 + 后台刷新；切换 handler 不再清空数据；渲染层"已有数据直接显示，无数据才骨架屏"
- **D. 首页**（`src/app/page.tsx`）：`loadSection` 失败重试 2 次 + `SectionError` 点击重试占位

### 验证
真实 Chrome CDP：快速连续切换 10 次 **0 次空白**；代理降级后自动直连返回 200。

---

## 三、v1.2.9b — 卡片首次点击无反应修复

### 问题
点击卡片经常"第一次无反应，第二次才好"（触摸设备）。

### 根因（`src/hooks/useLongPress.ts`）
- `onTouchEnd` **无条件 `e.preventDefault()`**：阻止浏览器生成合成 click → 跳转全靠手动 `onClick()`
- 手动跳转依赖脆弱的 `shouldClick = ... && isActive.current`：手指轻微滑动超 10px → `isActive` 变 false → 不跳转，且 click 已被吞 → **点击彻底丢失**
- **没有 `onTouchCancel`**：触摸被中断时 `isActive` 残留 true，干扰下一次触摸

### 修复
- `onTouchEnd` **只在长按时 preventDefault**；短按让浏览器原生 click 可靠触发
- 新增 `onTouchCancel` 重置状态
- 移除 hook 冗余 `onClick` 参数

### 验证
CDP 触摸：普通点击✅ 5px 抖动✅ 中断后点击✅ 长按 600ms 不跳转（菜单）✅

---

## 四、v1.2.9c — 移动端分类点击不干脆修复

### 问题
移动端点击分类按钮"不直接、不干脆"，没有马上被点中的感觉。

### 根因
- 全局 `button` **未设 `touch-action`**：移动端浏览器默认等 ~300ms 判定单击/双击 → 点击响应延迟
- 按压反馈过渡 0.15s 偏慢，分类按钮 `transition-all duration-200` 更"软"

### 修复（`globals.css` + `DoubanSelector.tsx`）
- 全局 `button` 加 `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent`
- 全局 `a` 链接同样加
- 按压反馈：`scale 0.96→0.95`、`:active` 过渡 `0.15s→0.05s`、常规过渡 `0.15s→0.1s`
- 分类按钮 `duration 200→150`

### 验证
分类按钮 computed `touch-action: manipulation` 生效；分类切换 362ms 内出新数据。

---

## 五、v1.2.9d — 代码审查 5 项修复

**来源**：`/code-review` 审查确认 2 高危 + 3 中危。

### 修1（高危）代理链被"200 错误 JSON"击穿 — `douban.ts` + 3 路由
- 豆瓣限流返回 HTTP 200 + `{code:1111}` 错误体，`fetchOnce` 只看 `response.ok` → 链不降级 → `.map` 抛错 → 500 → 空白
- 修复：`fetchDoubanData` 增 `validate` 校验器，无效即 throw 让链降级；附带修复 custom 代理无尾斜杠

### 修2（高危）SSRF DNS 重绑定绕过 — `url-check.ts`
- `isSafeUrl` 只挡字面 IP/localhost，`127.0.0.1.nip.io` / `169.254.169.254.nip.io` 可绕过
- 修复：检测内嵌 IPv4 片段 + 已知重绑定后缀（nip.io/sslip.io/xip.io/loca.lt/localtest.me/vcap.me）；验证 16 项全过

### 修3（中危）长按计时器无卸载清理 — `useLongPress.ts`
- 修复：`useEffect` 卸载时 `resetState()` 清计时器

### 修4（中危）缓存后台刷新失败误弹错误 — `douban.client.ts`
- 修复：`backgroundRefreshing` 标志，后台刷新失败静默

### 修5（中危）后台刷新是无效操作 — `douban.client.ts` + `douban/page.tsx`
- 修复：`forceRefresh` 参数强制走网络，后台刷新真正更新屏幕

---

## 六、版本同步与修正

- 版本号同步：`VERSION.txt` / `src/lib/version.ts` → `1.2.9d`（`changelog.ts` 补录 v1.2.5~v1.2.9d）
- **日期修正**：v1.2.5~v1.2.8 误标 `2026-08-04` → 全部更正为 `2026-08-03`
- **文案修正**：版本信息"全局改名 novatv，与原项目隔开" → "项目确定名称为：Nova TV"

---

## 七、当前状态

- **版本**：v1.2.9d
- **git**：4 个提交，工作区干净，可回滚到基线 `544aabb`
- **dev server**：`http://localhost:3000`（owner / test123）
- **待办**：阶段5 部署 Cloudflare Pages（⚠️ 需非主账号 vipleon@gmail.com）；真机体验反馈

---

## 八、相关文档

- `ITERATION_LOG.md` — 逐版本迭代日志
- `PROJECT.md` — 项目架构说明
- `README.md` — 项目使用说明
- `src/lib/changelog.ts` — 版本面板变更日志
