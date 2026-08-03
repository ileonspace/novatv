# NovaTV（星尘）项目说明

> 二次开发自 LunaTV v100.1.3｜ 部署：Cloudflare Pages｜ 状态：开发中
> 核心目标：**快速 · 高效 · 安全**，与原项目尽量隔开

---

## 一、项目定位

影视聚合搜索播放器（Next.js 14），具备多源搜索、详情、播放、收藏、播放记录、搜索历史、直播、番剧、豆瓣数据等完整功能。

**与原版 LunaTV 的关键差异（后台原理）：**

| 项 | 原版 LunaTV | NovaTV |
|---|---|---|
| 数据库 | Upstash/Redis/Kvrocks | ❌ 无（纯 localStorage）|
| 用户体系 | 注册 + 角色 + 封禁 | ❌ 单一密码（PASSWORD 环境变量）|
| 管理后台 | 动态数据库配置 | ❌ 配置静态化（NOVATV_CONFIG 环境变量）|
| 播放 | 服务端 m3u8/segment 代理 | ✅ 前端直连源站（不走服务器）|
| 服务端存储 | 落盘数据 | ✅ 零落盘（搜索仅实时转发）|
| 部署 | Vercel/Docker | Cloudflare Pages |

---

## 二、架构

```
浏览器（localStorage: 配置/收藏/记录/历史/跳过配置；IndexedDB: 搜索/详情缓存）
   │
   ├─ 搜索/详情 ─→ CF Pages Function（实时转发苹果CMS，不存储）
   ├─ 豆瓣/番剧 ─→ CF Pages Function（实时转发）
   ├─ 直播 ─────→ CF Pages Function（m3u 频道解析，不存储）
   ├─ 播放 ─────→ 源站 m3u8 直连（不经服务器）
   └─ 登录 ─────→ PASSWORD 环境变量校验
```

- **服务端零落盘**：不存储任何 JSON/视频/用户数据
- **播放零服务器流量**：视频流全程源站直连
- **配置双通道**：前端导入（localStorage，即时生效）或 `NOVATV_CONFIG` 环境变量
- **数据缓存**：搜索/详情/分类 24h 过期（IndexedDB），可手动清理

---

## 三、环境变量

| 变量 | 说明 | 必填 |
|---|---|---|
| `PASSWORD` | 站点访问密码（单密码）| ✅ |
| `NOVATV_CONFIG` | 源配置 JSON（api_site / custom_category / lives）| ✅ |
| `NEXT_PUBLIC_SITE_NAME` | 站点名（默认 NovaTV）| 可选 |
| `ANNOUNCEMENT` | 站点公告 | 可选 |
| `NEXT_PUBLIC_STORAGE_TYPE` | 固定 `localstorage` | 固定 |
| `NEXT_PUBLIC_ENABLE_LIVE` | 直播功能（默认 `true`，`false` 关闭）| 可选 |
| `NEXT_PUBLIC_CACHE_TTL` | 数据缓存时长 ms（默认 24h=86400000）| 可选 |

### NOVATV_CONFIG 格式（源配置）

```json
{
  "cache_time": 7200,
  "api_site": {
    "source1": { "api": "https://xxx/api.php/provide/vod", "name": "源一" }
  },
  "custom_category": [
    { "name": "华语", "type": "movie", "query": "华语" }
  ],
  "lives": {
    "live1": { "name": "央视", "url": "https://xxx/index.m3u" }
  }
}
```

> `lives` 的 `url` 可以是**单个 m3u8 频道**，也可以是 **m3u 播放列表**（一个地址含多个频道，系统自动解析）。

### 前端配置导入（日常推荐）

打开页面后，通过**用户菜单 → 导入配置**即可管理源，无需改环境变量：

| 模式 | 用途 |
|---|---|
| 粘贴 JSON | 完整配置（影视源 + 直播源）|
| 订阅链接 | 拉取在线 JSON 配置 |
| 直播源 m3u | **每行一个 m3u 播放列表地址**（一个地址含多个频道）|

- 配置保存在**浏览器 localStorage**，搜索/直播时自动携带（服务端不存储）
- **显示直播**开关：用户菜单可切换直播分类显示/隐藏（默认隐藏）

---

## 四、本地开发

```bash
pnpm install
pnpm dev          # 开发服务器
pnpm build        # 生产构建
npx @cloudflare/next-on-pages --experimental-minify   # CF Pages 构建
```

---

## 五、部署（Cloudflare Pages）

⚠️ **部署账号约束：绝不用主账号 vipleon@gmail.com**，使用其他 CF 账号。

1. `pnpm build` 本地验证通过
2. `npx @cloudflare/next-on-pages --experimental-minify` 生成 CF Pages 产物
3. `wrangler pages deploy` 部署到非主账号
4. 在 CF Pages 配置环境变量（PASSWORD、NOVATV_CONFIG、NEXT_PUBLIC_SITE_NAME）

详见 `ITERATION_LOG.md` 部署记录。

---

## 六、合规说明

- 服务端不存储任何数据（无 JSON、无视频、无违规代码）
- 播放流量不经服务器（前端直连源站）
- 仅供个人学习使用，请遵守当地法律法规

---

## 七、相关文档

- `ITERATION_LOG.md` — 迭代日志（每次改动记录）
- `CHANGES_v1.2.9_20260803.md` — v1.2.9 系列改动总结（本次会话全部修改）
- `README.md` — 项目使用说明
- 原版参考：`~/Desktop/Leon项目/LunaTV-main`
