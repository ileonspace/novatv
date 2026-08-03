# NovaTV 迭代日志

> 记录每次改动的目的、内容、结果。格式：日期 - 版本 - 改动摘要

---

## 部署记录（最终方案）— 2026-08-03 — 迁移 opennext + Worker 部署成功

**结论**：项目已成功部署到 Cloudflare **Worker**（`https://novatv.chinesev.workers.dev`），登录/搜索/播放全部正常。

### 为什么迁移到 opennext
- `@cloudflare/next-on-pages` 已被 Cloudflare **官方废弃**（2025年9月归档），是之前线上 500 的根因
- 官方推荐替代：**`@opennextjs/cloudflare`**，部署目标是 **Workers**（不是 Pages）

### 迁移内容
- 移除 `@cloudflare/next-on-pages`，改用 `@opennextjs/cloudflare`
- 移除 48 处 `export const runtime = "edge"`（OpenNext 用 Node runtime）
- 新增 `open-next.config.ts` / `wrangler.jsonc`
- 构建命令：`opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion`

### 部署方式（重要决策）
- **最终采用：手动命令行部署 Worker**（`npx wrangler@3.99.0 deploy`）
- **尝试过但放弃的**：
  - **Pages + GitHub 自动部署** → OpenNext 与 Pages 不兼容（404）
  - **GitHub Actions 自动部署** → 需在 GitHub 存 Cloudflare API token，用户有安全顾虑，放弃
- **GitHub 仓库**（`ileonspace/novatv` 公开）仅作代码备份，与 CF 无自动部署连接

### 踩坑记录（重要）
1. **部署前必须 `wrangler whoami` 验证账号**（曾误用主账号 vipleon，血泪教训）
2. **本地 wrangler 配置残留主账号 token** → 导致部署请求到主账号 → 删除 `~/.wrangler/config/default.toml`
3. **wrangler.jsonc 需显式 `account_id`**（否则 wrangler 默认用错的账号）
4. **OpenNext 在 Pages 上 404**（Pages 不是 OpenNext 的目标平台）
5. **本机 curl 访问 workers.dev 超时**（网络问题），但浏览器正常——线上验证以浏览器为准
6. **Next.js 14.2.30 需 `--dangerouslyUseUnsupportedNextVersion`**（opennext 支持政策）
7. **macOS 12 跑不了 workerd/miniflare**（本地无法 preview，但部署不受影响）

### 环境变量（Worker secrets）
- `PASSWORD=digital`、`NEXT_PUBLIC_SITE_NAME=NovaTV`、`NEXT_PUBLIC_STORAGE_TYPE=localstorage`、`NEXT_PUBLIC_ENABLE_LIVE=true`、`NEXT_PUBLIC_DOUBAN_PROXY_TYPE=direct`

关联：[[cloudflare-deploy-account]]、[[novatv-project]]、[[deploy-confirmation-required]]

---

## 部署记录 — 2026-08-03 — Cloudflare Pages 部署尝试（未成功，已回退）

## 部署记录 — 2026-08-03 — Cloudflare Pages 部署尝试（未成功，已回退）

**状态**：❌ 线上 500，已回退到 v1.2.9d 本地状态。代码未变，本地完全正常。

**尝试过程**：
1. 手动 wrangler 部署到主账号（vipleon）→ ❌ 违反"绝不用主账号"原则，已删除项目
2. 用 API token（chinesev@gmail.com 账号）手动部署到 `novatv-d2h` → ❌ 页面 500
3. 走 GitHub + CF Pages 自动部署到 `novatv1` → ❌ 所有 Worker 请求 500（连 api 也 500）

**已确认的事实**：
- `nodejs_compat` 已配置（production flags 生效，部署日志无 node:buffer 警告）
- 构建多次成功（deploy/success）
- 本地 Node 生产模式完全正常（200）
- 静态资源正常（favicon 200）
- **所有走 Worker 的请求都 500**（API + 页面）
- 崩溃在**模块顶层初始化**（函数内 try/catch 抓不到）
- 本地 macOS 12 跑不了 workerd 无法复现 edge

**根因判断**：next-on-pages + edge runtime 在 CF 的深层兼容问题，很可能是 `async_hooks`/`AsyncLocalStorage` 在 CF edge 运行时初始化失败，导致 `process.env` proxy 的 `getStore()` 返回 null → `Reflect.ownKeys(null)` 抛 TypeError → 所有请求崩。**非业务代码 bug**。

**部署教训（重要）**：
1. **部署前第一步必须 `wrangler whoami` 验证账号**（本次误部署到主账号，血泪教训）
2. 本地测试正常 ≠ 线上正常（两套运行时：Node vs edge）
3. CF 的 Wrangler Logs tail 在本机（macOS 12）有 bug 不可用，运行时异常难抓
4. wrangler.toml 对 CF Pages 云端构建是 BETA 支持，配置 flags 应走 Dashboard
5. **先本地彻底验证 + 解决已知部署问题，再谈部署**

**后续方案**（未执行）：升级 `@cloudflare/next-on-pages` 版本 / 换部署方式 / 找 CF 支持。本地代码保持 v1.2.9d 正常。

关联：[[cloudflare-deploy-account]]、[[novatv-project]]、[[deploy-confirmation-required]]

---

## v1.2.9d — 2026-08-03 — 代码审查 5 项修复（代理链校验 / SSRF 重绑定 / 长按清理 / 静默刷新 / 强制刷新）

**来源**：`/code-review` 审查 v1.2.9 系列，确认 2 高危 + 3 中危，全部修复。

**修1（高危）代理链被"200 错误 JSON"击穿** — `douban.ts` + 3 路由
- 豆瓣限流返回 HTTP 200 + `{code:1111}` 错误体，`fetchOnce` 只看 `response.ok` 就返回 → 链不降级 → `.map` 抛错 → 500 → 空白
- 修复：`fetchDoubanData` 增 `validate` 校验器，`fetchOnce` 校验 items/subjects 形状，无效即 throw 让链降级；3 路由各自传校验器
- 附带修复：custom 代理 URL 无尾斜杠时拼接 malformed（确保 `/` 结尾）

**修2（高危）SSRF DNS 重绑定绕过** — `url-check.ts`
- `isSafeUrl` 只挡字面 IP/localhost，`127.0.0.1.nip.io` / `169.254.169.254.nip.io` 可绕过 → 打到内网/云元数据
- 修复：检测内嵌 IPv4 片段（连续 4 段 0-255）+ 已知重绑定后缀（nip.io/sslip.io/xip.io/loca.lt/localtest.me/vcap.me）
- 验证 16 项全过：正常域名不误杀，所有私网/重绑定被拦

**修3（中危）长按计时器无卸载清理** — `useLongPress.ts`
- 卡片卸载（VirtualGrid 回收/重渲染）后挂起计时器仍触发 onLongPress + 震动
- 修复：`useEffect` 卸载时 `resetState()` 清计时器

**修4（中危）缓存后台刷新失败误弹错误** — `douban.client.ts`
- 缓存命中后后台刷新失败会 `dispatchGlobalError` → 有效缓存显示时误弹错误横幅
- 修复：`backgroundRefreshing` 标志，后台刷新期间失败静默

**修5（中危）后台刷新是无效操作** — `douban.client.ts` + `douban/page.tsx`
- 缓存命中后的 `buildDataRequest(0)` 走同一 SWR 助手，命中时仍返回缓存 → 屏幕数据永不真正刷新
- 修复：`fetchWithStaleCache`/`getDouban*`/`buildDataRequest` 增 `forceRefresh` 参数，后台刷新传 true 强制走网络

**验证**：
- tsc 零错误、本次改动文件 ESLint 零警告
- SSRF：`127.0.0.1.nip.io`/`169.254.169.254.nip.io` → HTTP 400，正常豆瓣图 → 200
- 代理链：SSRF 拦截的 custom 代理 → 自动降级 CDN/直连 → 200 + 3 条
- 核心回归：首页/豆瓣页/推荐/列表/server-config 全 200
- 浏览器：卡片触摸跳转✅ 长按菜单不跳转✅ 分类切换无空白✅ 无错误横幅✅
- 基线已用 git 备份（544aabb），可回滚

**关联**：[[review-fix-method]]（改前分析关联功能、改后全面回归）、[[novatv-project]]

---

## v1.2.9c — 2026-08-03 — 移动端分类点击不干脆修复（touch-action 消除点击判定延迟）

**问题**：移动端点击分类按钮"不直接、不干脆"，没有马上被点中的感觉。

**根因**：
- 全局 `button` **未设 `touch-action`**：移动端浏览器默认要等 ~300ms 判定是单击还是双击，导致点击响应延迟、不跟手
- VideoCard 卡片设了 `touchAction: 'manipulation'` 所以卡片点击干脆，但分类/筛选/导航按钮都没设 → 对比明显
- 按压反馈过渡 0.15s 偏慢，分类按钮自身 `transition-all duration-200` 让反馈更"软"

**修复**（`globals.css` + `DoubanSelector.tsx`）：
- 全局 `button` 加 `touch-action: manipulation` + `-webkit-tap-highlight-color: transparent` → 消除移动端 300ms 点击判定延迟
- 全局 `a` 链接同样加（导航/侧边栏受益）
- 按压反馈增强：`scale: 0.96 → 0.95`，`:active` 过渡 `0.15s → 0.05s`（按下立即缩放、跟手干脆），常规过渡 `0.15s → 0.1s`
- 分类按钮 `duration-200 → duration-150`（更短过渡）

**验证**（CDP 触摸+鼠标模拟）：
- 分类按钮 computed `touch-action: manipulation` 生效
- 鼠标按下 100ms → `scale: 0.95` + `transition-duration: 0.05s`（按压反馈即时生效）
- 分类切换 362ms 内出新数据（含点击+加载+渲染）
- 分类切换功能正常（25 张图）
- tsc 零错误

**关联**：v1.2.9b 卡片点击修复、v1.1.8d 全局按钮动效经验、[[leontv-theme]]

---

## v1.2.9b — 2026-08-03 — 卡片首次点击无反应修复（长按 hook 吞掉 click）

**问题**：点击卡片经常"第一次无反应，第二次才好"（触摸设备）。结合 LeonTV 历史经验（按钮按压动效造成体验差），排查到是**长按手势 hook** 的 bug，而非按钮动效。

**根因**（`src/hooks/useLongPress.ts`）：
- `onTouchEnd` **无条件 `e.preventDefault()`**：阻止浏览器生成合成 click → 跳转完全押在手动 `onClick()` 上
- 手动跳转依赖脆弱的 `shouldClick = ... && isActive.current` 判断：手指轻微滑动超过 10px 阈值（`touchmove`）→ `isActive` 变 false → 不跳转，且 click 已被吞 → **点击彻底丢失** → "第一次无反应"
- **没有处理 `onTouchCancel`**：触摸被系统中断时 `isActive` 残留 true，干扰下一次触摸

**修复**：
- `onTouchEnd` **只在长按时 `preventDefault`**（避免长按误触跳转）；短按不再吞 click，让浏览器原生 click 可靠触发卡片 `onClick` → 跳转不受 `isActive`/滑动阈值影响
- 新增 `onTouchCancel` 重置状态，避免 `isActive` 残留
- 移除 hook 冗余的 `onClick` 参数（跳转统一走卡片 div 的 `onClick`）

**验证**（CDP 真实触摸模拟，触摸模拟 + 真实 Chrome）：
- 普通点击 → 跳转 ✅
- 5px 轻微抖动点击 → 跳转 ✅（修复前被吞）
- 触摸中断后立即点击（isActive 残留场景）→ 跳转 ✅（修复前无反应）
- 长按 600ms → 不跳转，显示菜单 ✅（长按功能保持）
- tsc 零错误、ESLint 零警告

**关联**：v1.1.8d 全局按钮按压动效修复经验、[[review-fix-method]]

---

## v1.2.9 — 2026-08-03 — 豆瓣分类切换空白根治（代理统一服务端 + 缓存优先）

**问题**：豆瓣页 `/douban` 电影/剧集/动漫/综艺来回切换，经常一个分类空白或卡顿（反复点击才出现）。用户质疑"缓存明明设置了，为什么不先读缓存"。

**根因**（三层，前两层是服务端代理问题，第三层是豆瓣页渲染逻辑缺陷）：
1. **代理模式绕过服务端**：选代理后前端浏览器直连外部代理/CDN，偶发超时/5xx/限流 → 数据请求失败 → 空白
2. **首页4分类并发打同一代理**：被压垮，1-2个失败 → 部分分类空白
3. **豆瓣页切换时先 `setDoubanData([])` 清空再等 async**：即使缓存命中也要"清空→骨架屏→重新填充"，且 `selectorsReady` 还有 50ms+防抖 100ms 延迟 → 用户感知空白/卡顿。**缓存其实命中了，但页面层不等它**

**修复**：
- **A. 服务端统一代理**（`douban.ts` + 3个路由）：代理链"用户所选 → 腾讯CDN备用 → 阿里CDN备用 → 直连带Referer"，每层重试2次，custom代理 URL 过 `isSafeUrl` 防 SSRF；路由读 `proxyType/proxyUrl` 参数
- **B. 前端统一走服务端**（`douban.client.ts`）：3个 `get*` 不再浏览器直连代理，全部请求服务端 API；修复 direct 分支未检查 `response.ok` 的隐藏 bug；缓存键加代理类型；`fetchWithStaleCache` stale-while-revalidate
- **C. 豆瓣页缓存优先**（`douban/page.tsx`）：新增 `buildDataRequest` 统一数据请求；`loadInitialData` **先 peek 缓存命中立即填充 + 后台刷新**，未命中才 loading；切换 handler 不再 `setDoubanData([])` 清空；渲染层"已有数据直接显示，无数据才骨架屏"
- **D. 首页**（`page.tsx`）：`loadSection` 失败重试2次 + `SectionError` 点击重试占位

**验证**（真实 Chrome CDP 端到端）：
- 首次加载 25 图正常；电影→剧集→电影 1s 内缓存秒显
- 快速连续切换 10 次：**0 次空白**，全部落到正确数据
- 代理链降级：SSRF 拦截（127.0.0.1/169.254）后自动降级直连返回 200
- tsc 零错误、ESLint 零警告、核心 API 回归全 200

**关联**：v1.2.6 审查修复、v1.1.7 豆瓣数据源、[[review-fix-method]]（改前先分析关联功能，改后全面回归）

---

## v0.1.0 — 2026-08-02

### 阶段0：项目初始化

- 从 `LunaTV-main`（v100.1.3）拷贝创建 NovaTV 目录，原版保留只读
- `pnpm install` 依赖安装完成（pnpm v10.14.0）
- 建立本项目文档 `PROJECT.md` 与迭代日志 `ITERATION_LOG.md`

### 阶段1：全局改名 + 去品牌

- 全局替换 moontv/lunatv → novatv（代码、localStorage key、站点名、manifest）
- 删除 `version_check.ts` 原作者 GitHub 引用（改为不联网无害实现）
- 删除 login/VersionPanel 原作者链接
- 重写 README、重建 changelog.ts（NovaTV v1.0.0）
- 删除 docker/github 相关文件

### 阶段2：后台原理改造（无数据库简易版）

- `config.ts`：配置静态化，从 `NOVATV_CONFIG` 环境变量读取源配置，移除 db 依赖
- `db.ts`：LocalMemoryStorage 空实现替代数据库，删除 upstash/redis/kvrocks 实现
- 删除 `@upstash/redis`、`redis` 依赖
- 登录：localstorage 模式固定用户名 owner + 单密码（PASSWORD），无注册
- 管理后台：middleware 拦截 `/admin` 重定向首页，入口天然隐藏
- 删除 change-password / cron / data_migration API
- 播放：play 页原生直连源站（已确认，无需改动）
- 修复 login cookie 补 username=owner（原版 localstorage 模式搜索会 401）

### 阶段3：Cloudflare Pages 适配

- 安装 `@cloudflare/next-on-pages`
- next.config.js：移除 standalone / next-pwa / instrumentationHook
- 所有 API route runtime → edge（41 处）
- 所有页面 + layout + not-found 导出 `runtime = 'edge'`
- build 脚本：`build`（next build）/ `build:cf`（next-on-pages）
- ✅ next-on-pages 构建成功，产物 `.vercel/output/static/_worker.js`

### 阶段4：本地完整测试

- typecheck 通过（零错误）
- curl 测试：认证流程（未登录 307 / 错密码 401 / 登录 200）、server-config、/admin 拦截、搜索 SSE 全链路
- Playwright E2E：登录、首页渲染（NovaTV 品牌/导航）、/admin 重定向、搜索页、豆瓣页、播放页、localStorage 读写、收藏写入 —— 全部通过，JS 零错误
- ⚠️ 次要：主题切换按钮在首页公告弹窗遮挡下不可见（非功能问题）

### 阶段4.5：性能诊断与优化（图片加载慢）

- **诊断**：生产 TTFB 0.14s（快）；首页 load 0.9s；dev 模式慢（编译开销，非生产问题）
- **图片慢根因**：豆瓣图片默认走 `cmliussss` CDN，当前网络实测 0.75-1.2s/张；豆瓣源站带 Referer 仅 0.04s
- **修复**：默认图片代理 `cmliussss-cdn-tencent` → `server`（服务端带 Referer 拉豆瓣源站 + 半年缓存头）
- 实测 server 代理：首访 0.38s，缓存命中后 0.045s；部署 CF 后走边缘缓存更快
- **播放慢提示**：当前为演示源（example.com），无结果触发 20s 搜索超时；真实源下详情请求秒回

## v1.2.8 — 2026-08-03 — 视频质量检测（综合优选：质量优先 + 高速）

- **需求**：留着高分辨率+高速源；检测不到质量也不能误杀；不显示"未知"字样
- **实现**：
  - 新增服务端 `/api/video-info`：fetch m3u8 文本（带 referer 过防盗链），解析 `RESOLUTION`/`BANDWIDTH` → 真实质量（4K/1080p/720p/480p）
  - 前端测速改为综合：可达+延迟+质量；检测不到质量 → 中性"流畅"（不显示"未知"、不误杀）
  - 排序：质量分（4K>1080p>720p=流畅>480p）+ 同质量按延迟；检测不到的源不排后
  - 自动优选：质量最高 + 延迟最低的最佳源
  - SSRF 校验、质量接口超时 3s（加速测速）
- **验证**：质量检测生效（480p 等）、无"检测失败"字样、私网拒绝

## v1.2.7 — 2026-08-03 — 播放源自动优选 + 按速度排序

- **需求**：秒进播放器后，快速测速对比，自动优选最快源播放；源列表按速度排列
- **实现**：
  - 新增 `optimizeAndSortSources`：并发宽松测速所有源 → 填充测速结果 → 按延迟升序排序源列表 → 返回最佳源
  - 进入播放页：先立即播放（秒进），后台测速
  - 测速完成后：若当前源未真正开始播放（readyState<2），自动切换到最佳源
  - 换源列表：当前源置顶 + 其余按延迟升序（EpisodeSelector 保持）
- **验证**：换源列表 17-19 源、延迟显示、排序逻辑正确

## v1.2.6c — 2026-08-03 — 换源测速改宽松（参考 LeonTV）

- **问题**：换源列表大量源"检测失败、无检测数据"
- **原因**：原测速强制 Hls.js 解析 m3u8 清晰度，防盗链/特殊 UA 源加载失败误判
- **修复**：`getVideoResolutionFromM3u8` 改宽松测速——仅请求 m3u8 可达性（no-cors）+ 延迟，不解析清晰度，移除 Hls.js 依赖
- **验证**：换源列表 19 个源全部显示"流畅 + 延迟"，0 检测失败（631~972ms）

## v1.2.6b — 2026-08-03 — 修复换源列表测速显示

- **问题**：换源列表显示"检测失败、无测速数据"
- **原因**：v1.1.2 提速优化跳过了测速优选（preferBestSource 未被调用），precomputedVideoInfo 一直为空
- **修复**：加载换源列表后后台测速填充（precomputedVideoInfo），不阻塞播放
- **验证**：换源列表显示延迟（1016ms）；源不可访问的显示"检测失败"（源本身问题）

## v1.2.6 — 2026-08-03 — 全量代码审查与修复

**审查**：安全/功能逻辑/性能质量三维度，发现约 40 个问题，全部按优先级修复。

**P0 高危**
- SSRF：新增 `url-check.ts`，所有代理接口（image-proxy/m3u8/segment/key/logo）拒绝私网/回环地址
- 认证：cookie 不再存明文密码，改存签名令牌（HMAC 覆盖 username+role+timestamp），middleware 验签 + 7 天有效期 + Secure 标记
- 直播播放代理：支持前端导入的 config 直播源（之前能列频道不能播）
- 播放页 EventSource：存 ref 卸载关闭 + 找到源提前终止

**P1 中危**
- search/ws 零源时立即 complete（不再无限转圈）
- EPG 请求序号去重（快速切频道不串节目单）
- 播放页从搜索/豆瓣进入时恢复续播/跳过配置
- getCachedLiveChannels 缓存键含 URL（配置变更不串源）
- 豆瓣缓存统一只存非空；IndexedDB 写入每 20 次才 trim
- EpgScrollableRow 用稳定时间 state（定时器不再反复重置）
- 登录限流（5 次失败 30s 锁定）+ redirect 白名单
- 清理敏感 console.log；番剧日历响应校验；空 episodes 提示

**P2 质量**
- 删除死代码（optimizationEnabled/saveIntervalRef/fetchSourcesData）
- globals.css：button 规则降特异性（:where）、桌面保留滚动条

**验证**：cookie 无密码、限流 429、SSRF 400、首页 200、零源搜索正常结束。

## v1.2.5 — 2026-08-03 — 用户菜单管理面板分组

- **需求**：用户菜单新建"管理面板"分组，收纳"导入配置"和"显示直播"
- **实现**：
  - UserMenu 新增可展开/折叠的"管理面板"分组（含箭头动画 + 子项缩进分隔线）
  - "导入配置"和"显示直播"（含开/关状态）移入分组内
  - 顶层菜单更整洁：设置 → 管理面板 ▾ → 修改密码 → 登出
- **验证**：分组展开正常、子项显示正确、无 JS 错误

## v1.2.4b — 2026-08-03 — 变更日志丰富 + 版本号同步（今日收尾）

- changelog.ts 扩展为 11 个版本的完整迭代记录
- 版本号同步：version.ts / VERSION.txt → v1.2.4（之前停在 v1.0.0）
- 验证：版本面板完整显示 v1.2.4 → v1.0.0

### 今日待办（明日继续）
- [ ] **阶段5：部署 Cloudflare Pages**（⚠️ 非主账号 vipleon@gmail.com）
  - 需要用户提供非主 CF 账号
  - `npx wrangler login` → `wrangler pages deploy .vercel/output/static`
  - 配置环境变量：PASSWORD / NOVATV_CONFIG / NEXT_PUBLIC_SITE_NAME
  - 部署后线上验证
- [ ] 真机体验反馈（手机端全流程）

## v1.2.4 — 2026-08-03 — 更换项目 Logo

- **问题**：原项目 logo（favicon/logo.png/PWA 图标/截图）仍在，可能被页面调用时显示
- **修复**：
  - 用 PIL 生成 NovaTV 专属图标（绿色圆角 + 白色 "N"）
  - 替换 favicon.ico、icons/icon-192/256/384/512.png、logo.png
  - 删除 old.favicon.ico、原项目截图 screenshot1/2/3.png（18MB）
  - layout 加 `<link rel="icon" href="/favicon.ico">`
- **验证**：新 favicon 正常返回、页面引用正确、无原 logo 残留

## v1.2.3 — 2026-08-03 — 直播源导入 + 直播开关修复

- **问题**：设置里"显示直播"打开后侧边栏仍无直播——`ENABLE_WEB_LIVE` 默认 false（原项目后台配置项）
- **修复**：`ENABLE_WEB_LIVE` 默认 true（可用 `NEXT_PUBLIC_ENABLE_LIVE=false` 关闭），直播显示完全由前端"显示直播"开关控制
- **直播源导入**：
  - 导入面板支持**只含直播源（lives）的 JSON**（之前强制要求影视源）
  - 新增 **"直播源 m3u" 模式**：每行一个 m3u 播放列表地址，自动转成多个直播源
  - 直播 API（`/api/live/sources`、`/api/live/channels`）支持前端导入的 config 参数
  - 修复直播页请求 URL 参数 bug（`&config` → `?config`）
- **验证**：m3u 导入成功（2 个源）、直播页"直播源"Tab 显示导入源、侧边栏直播显示
- **搜索历史确认**：已本地存储（`novatv_search_history`，20 条上限）

## v1.2.2 — 2026-08-03 — 首页分类间距紧凑

- **问题**：首页大分类（继续观看/热门电影/热门剧集/新番放送/热门综艺）间距太大（mb-8 2rem / mb-5 1.25rem）
- **修复**：所有分类 section 间距 → **mb-2（8px）**，只隔一个分类标题，紧凑协调
- **附带**：修复移动端页面无法滚动根因（`html,body { height:100% }` → `min-height`），底部不再被导航遮挡

## v1.2.0b — 2026-08-03 — 首页/收藏夹切换动效

- **问题**：首页"首页/收藏夹" Tab 切换动效不明显（内容淡入太弱）
- **修复**：
  - CapsuleSwitch 滑动指示器确认工作（白色 0.3s 滑动）
  - 内容切换动效增强：`content-fade-in` 加 translateY(10px) 上滑 + 0.25s（首页/收藏夹内容切换与筛选分类一致）
- **验证**：指示器 4px→68px 滑动、内容动画 content-fade-in 0.25s 触发

## v1.2.0 — 2026-08-03 — 移动端体验优化（4 项）

- **1. 首页新番放送空白（移动端）**：根因 `getDoubanRecommends` direct 分支把 `undefined` 参数拼进 URL（`region=undefined`）→ 服务端筛选异常 → 空结果。修复：URLSearchParams 只带有效参数 + 缓存仅存非空数据。实测新番 20 张图正常。
- **2. 底部导航生硬滞后**：加按压反馈 `active:scale-90` + 过渡。
- **3. 筛选按钮字体小、排版乱**：MultiLevelSelector + DoubanSelector 移动端字体 text-xs→text-sm（12→14px），分类多时可横向滚动。
- **4. 直播隐藏设置**：config.client 加 `getShowLive/setShowLive`（localStorage 默认隐藏），UserMenu 加"显示直播"开关，Sidebar + MobileBottomNav 按设置显示/隐藏直播。
- 验证：新番 20 图、底部导航 5 项无直播、分类按钮 14px、JS 零错误。

## v1.1.9 — 2026-08-02 — 移动端/平板全面适配

- **问题**：平板（768px）即显示 256px 侧边栏，内容区只剩 512px 很挤；底部导航 6 项固定 20vw 需横向滚动
- **修复**：
  - 布局断点 `md` → `lg`（Sidebar/MobileHeader/MobileBottomNav/PageLayout）：平板（768-1023）改用底部导航 + 隐藏侧边栏，1024+ 才显示侧边栏
  - 底部导航动态宽度 `100/navItems.length vw`：6 项平分满屏，不横向滚动
- **验证**（手机375/平板768/平板横1024/桌面1280）：
  - 全视口无水平溢出
  - 375/768 底部导航 + 无侧边栏；1024/1280 侧边栏 + 底部导航隐藏
  - 底部导航项平分（手机 62px/项、平板 128px/项）
  - 手机 3 列卡片、sm+ 自适应列数；播放器移动端 300px 高 + 隐藏 pip/全屏

## v1.1.8d — 2026-08-02 — 修复侧边栏折叠按钮无反应

- **问题**：左侧折叠按钮（Menu 图标）点击无反应，偶尔能折叠
- **根因**：全局 `button:active { transform: scale(0.96) }` 覆盖了折叠按钮的 `transform: translate(-50%,-50%)` 定位 → 点击瞬间按钮跳位，鼠标脱离
- **修复**：改用独立 CSS `scale: 0.96` 属性（不覆盖 transform），播放器排除改 `scale: none`
- **实测**：折叠按钮每次点击正常折叠/展开（256↔64），JS 零错误

## v1.1.8c — 2026-08-02 — 切换动效不卡（去掉重挂载 + 精简动画）

- **问题**：分类切换、首页/收藏夹切换动效卡顿
- **根因**：分类切换用 `key={type+primarySelection}` 强制整个 VirtualGrid 重挂载（重建 25 卡片 DOM）；动画时长偏长叠加卡顿
- **修复**：
  - 去掉分类切换的 key 重挂载 → VirtualGrid 原地更新 items（不重建 DOM）
  - 动画时长精简：图片 0.25→0.12s、页面 0.3→0.2s、内容淡入改**纯透明度 0.15s**（GPU 合成不卡）
  - 首页/收藏夹 Tab 切换加轻量淡入（key={activeTab} + 纯 opacity）
- **实测**：首页/收藏夹切换 **0.07-0.21s**，JS 零错误

## v1.1.8b — 2026-08-02 — 全局按钮丝滑修复

- **问题**：之前只定义 `btn-press` class，未应用到具体按钮；用户要求所有按钮切换全部修复
- **修复**：globals.css 全局按钮反馈——`button:not(:disabled)` 统一过渡（transform/opacity/颜色/边框）+ `:active` 缩放 0.96，播放器控件（artplayer）排除缩放，链接点击反馈
- **覆盖**：分类筛选按钮、胶囊切换、导航、播放页选集/换源等所有按钮
- **验证**：按钮 transition 生效、内容淡入应用、JS 零错误

## v1.1.8 — 2026-08-02 — 修复卡死 + 全局丝滑动效

- **问题1：播放页点返回卡死**——`cleanupPlayer()` 只在 `beforeunload`（页面刷新）调用，SPA 返回时组件卸载不触发 → ArtPlayer/Hls 未销毁
- **修复**：组件卸载的 useEffect return 中调用 `cleanupPlayer()`，返回时销毁播放器
- **实测**：返回耗时 0.1s，无卡死
- **问题2：分类切换/全局卡顿**——图片解码阻塞、切换生硬
- **修复**：
  - VideoCard 图片加 `decoding="async"`（异步解码）
  - globals.css 全局丝滑动效：图片加载淡入、页面内容进入动画、分类切换内容淡入（`novatv-content-fade` + key）、按钮按压反馈（`btn-press`）
  - 豆瓣页内容容器 key 触发切换淡入
- **实测**：分类切换缓存后平均 0.6s 稳定

## v1.1.7 — 2026-08-02 — 修复新番/番剧图片 + 豆瓣数据源

- **问题1**：bgm.tv 图片被墙（lain.bgm.tv HTTP 000），首页"新番放送"和豆瓣页"每日放送"图片不显示
- **问题2**：前端直连豆瓣 cmliussss CDN 报 `Failed to fetch`（浏览器 CORS/网络）
- **修复**：
  - 首页新番改用豆瓣番剧数据（getDoubanRecommends kind=tv/动画/电视剧）
  - 豆瓣页 anime 默认分类从"每日放送"改"番剧"（初始 useState + type 变化重置 useEffect 两处）
  - 豆瓣数据默认代理 `cmliussss-cdn-tencent` → `direct`（服务端代理，避免前端 CORS 失败）
  - 缓存仅缓存 `code===200` 的成功数据（避免缓存异常）
- **实测**：豆瓣番剧页卡片 1.1s 出现、图片 20/20 加载；首页新番图片正常；JS 零错误

## v1.1.6 — 2026-08-02 — 豆瓣全分类数据缓存

- **问题**：豆瓣分类页（电影/剧集/动漫/综艺）切换时每次重新请求豆瓣 API，数据+图片重载
- **修复**：`douban.client.ts` 三个 `get*` 函数（getDoubanCategories/getDoubanList/getDoubanRecommends）+ `bangumi.client.ts` 番剧日历统一加 IndexedDB 缓存（24h）
- **效果**：数据缓存命中后，图片 URL 立即可得，浏览器缓存图片秒显
- **实测**：切回已访问分类，图片全部加载 1.9s → **0.3s**（快 6 倍）
- 已覆盖缓存面：豆瓣分类/推荐/列表/番剧 + 搜索/详情（v1.1.5）

## v1.1.5 — 2026-08-02 — 本地缓存机制

- **新增 `src/lib/cache.ts`**：IndexedDB 统一缓存（get/set/remove/clear/cleanup/info），默认 24h 过期，容量上限 500 条 LRU 清理，过期自动删除
- **播放页缓存**：视频详情（`detail_源_id`）和搜索结果（`search_关键词`）缓存 24h，重复打开秒进
- **启动清理**：`CacheCleaner` 组件挂载 layout，每次加载清理过期缓存
- **缓存管理 UI**：ConfigImporter 新增"本地缓存"区——显示条数/有效期，支持"清理过期"和"清空全部"
- **图片**：豆瓣源站/代理已有长 HTTP 缓存头（1 年/半年），浏览器自动缓存，无需重复下载
- **实测**：二次打开播放页 load 0.8s→0.1s，播放器 1.9s→0.9s；IndexedDB 缓存条数正确

## v1.1.4 — 2026-08-02 — 首页图片渐进加载 + 去加载动效

- **问题**：首页用 `Promise.allSettled` 等 4 个分类接口全部完成才一次性渲染 → 慢接口拖累全部，图片一次性加载，且有流光/脉动动效
- **修复**：
  - `page.tsx`：各分类独立加载（`loadSection`），先到先渲染（渐进式），删全局 `loading` state，4 处判断改 `!分类.length`
  - 移除首页骨架屏 `animate-pulse`
  - `ImagePlaceholder.tsx`：去掉 `shine` 流光动画，改静态灰块
- **实测**：页面 load 0.8s，图片渐进加载

## v1.1.3 — 2026-08-02 — 修复源名乱码

- **问题**：源名（含 emoji 🎬 和中文）显示乱码（`ð\x9f\x8e¬-ç\x88±å¥\x87è\x89º-`）
- **根因**：前端 `TextEncoder` 生成 UTF-8 字节 → base64，服务端 `atob` 得到 Latin-1 字符串直接 `JSON.parse`，中文/emoji 字节被错误解码
- **修复**：`config.ts` `parseApiSitesFromConfig` 用 `atob → Uint8Array → TextDecoder('utf-8')` 正确还原 UTF-8
- **验证**：node 测试（修复前乱码/修复后正常）、curl 搜索源名正常、Playwright UI 源名正常

## v1.1.2 — 2026-08-02 — 播放页流式搜索（真正秒进）

- **问题**：点击卡片（仅 title，无 source/id）→ 全源搜索（3.96s）+ 优选测速（2-4s）→ 播放，共 3-6s
- **修复**：`play/page.tsx` 重构——
  - 无 source/id 时改用 `/api/search/ws` **流式搜索**，第一个可用源到达立即播放，不等全部源
  - **移除"优选测速"**（preferBestSource 不再调用），省 2-4s
  - 抽取 `applyDetail`，有 source/id 时仍直接详情秒进
- **实测（4 次稳定）**：页面 load 0.1-0.8s，播放器就绪 1.0-1.3s
- 遗留：preferBestSource/fetchSourcesData/optimizationEnabled 暂未删除（仅 warning），后续清理

## v1.1.1 — 2026-08-02 — 播放页提速优化

- **问题**：进入播放页即使带明确的 source/id，也先做全源搜索（28 源，10-30s）+ 优选，体验差
- **修复**：`play/page.tsx` 加载逻辑重构——有明确 source/id 时直接 `fetchSourceDetail`（单源详情），跳过全源搜索和优选；无 source/id 时才走全源搜索+优选
- **实测**：页面 load 0.5s，播放器就绪 2.3s（优化前等 20s+）
- ESLint 修复：prefer-const

## v1.1.0 — 2026-08-02 — 方案1：导入 JSON（本地配置）

- 服务端：`config.ts` 新增 `parseApiSitesFromConfig` / `getApiSitesFromRequest`，6 个搜索/详情 API 支持 `config` 参数
- 前端：新增 `src/lib/config.client.ts`（localStorage `novatv_config` + base64 UTF-8 编码）
- 搜索页/播放页/搜索建议：自动携带本地配置
- 新增 `ConfigImporter` 弹窗（UserMenu → "导入配置"）：支持粘贴 JSON / 订阅链接两种模式
- ✅ 测试：粘贴用户配置导入成功（28 源）；搜索"流浪地球"返回 68 结果（多源命中）
- ✅ 订阅 URL（pz.v88.qzz.io）CORS 开放，链接模式可用
- 端到端：注入配置 → 搜索页搜索 → 结果正常显示

### 待办
- [ ] 阶段5：部署 CF Pages（⚠️ 非主账号 vipleon@gmail.com）
- [ ] 真实源全量搜索/播放体验确认

---

## 2026-08-02 — 决策记录

- 项目名：**NovaTV（星尘）**，全局替换 moontv/lunatv
- 部署：**Cloudflare Pages**（next-on-pages）
- 播放：**前端直连源站**（不走服务器，接受 CORS 兼容性取舍；直播保留服务端代理——用户要求直播不动）
- 数据库：**去掉**（纯 localStorage，无注册）
- 认证：**单一密码**（PASSWORD 环境变量）
- UI/配色：**保持原样**（绿色系 + #eaf3f7 渐变）
- 功能逻辑：**不改变**，只改后台原理
- 部署账号：**绝不用主账号 vipleon@gmail.com**
