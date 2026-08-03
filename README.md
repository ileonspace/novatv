# NovaTV（星尘）

> 影视聚合搜索播放器 ｜ Next.js 14 + TypeScript + Tailwind CSS

**快速 · 高效 · 安全**

多源影视搜索聚合、在线播放、收藏同步、播放记录、直播、番剧、豆瓣数据，开箱即用。

---

## ✨ 特性

- 🔍 **多源聚合搜索**：一次搜索多源返回，SSE 流式输出
- 📄 **丰富详情页**：剧集列表、评分、简介
- ▶️ **在线播放**：HLS 直连播放，**流量不走服务器**
- ❤️ **收藏 + 继续观看**：本地缓存，随开随用
- 📺 **直播**：m3u8 直播 + m3u 播放列表解析 + EPG
- 💾 **本地缓存**：搜索/详情/分类 IndexedDB 缓存 24h，重复访问秒开
- 📱 **响应式**：桌面侧边栏 + 移动端底部导航（平板已适配）

## 🏗 架构原则

- **服务端零存储**：不存储任何数据（无数据库、无文件落盘）
- **播放零服务器流量**：视频流前端直连源站
- **单一密码**：`PASSWORD` 环境变量访问控制

## ⚙️ 快速使用

1. 登录后点右上角 **用户菜单 → 导入配置**，可导入：
   - **粘贴 JSON**：完整源配置（影视源 + 直播源）
   - **订阅链接**：在线 JSON 配置
   - **直播源 m3u**：每行一个 m3u 播放列表地址（含多个频道）
2. 需要直播时，**用户菜单 → 显示直播** 打开开关
3. 搜索/播放/收藏直接使用，数据自动本地缓存

## 🚀 部署

部署到 Cloudflare Pages：

```bash
pnpm install
pnpm build
npx @cloudflare/next-on-pages --experimental-minify
wrangler pages deploy
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `PASSWORD` | 站点访问密码（必填）|
| `NOVATV_CONFIG` | 源配置 JSON（api_site / custom_category / lives）|
| `NEXT_PUBLIC_SITE_NAME` | 站点名称（默认 NovaTV）|
| `ANNOUNCEMENT` | 站点公告 |

### NOVATV_CONFIG 源配置格式

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
    "live1": { "name": "央视", "url": "https://xxx/index.m3u8" }
  }
}
```

## 📖 文档

- `PROJECT.md` — 项目说明与架构
- `ITERATION_LOG.md` — 迭代日志

## ⚖️ 合规

仅供个人学习使用，请遵守当地法律法规。
