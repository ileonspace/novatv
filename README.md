<p align="center">
  <h1 align="center">NovaTV（星尘）</h1>
  <p align="center">影视聚合搜索播放器 ｜ Next.js 14 + TypeScript + Tailwind CSS</p>
  <p align="center"><b>快速 · 高效 · 安全</b></p>
</p>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Worker-F38020?logo=cloudflare)
![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)

</div>

---

## 📖 简介

**NovaTV** 是一个影视聚合搜索播放器，支持多源搜索、在线播放、收藏同步、播放记录、直播、番剧与豆瓣数据。所有配置与数据均存储在**本地浏览器**，服务端零存储，播放不占服务器流量。

> 本项目衍生自 [MoonTechLab/LunaTV](https://github.com/MoonTechLab/LunaTV)，在此感谢原作者的贡献。

---

## ✨ 特性

- 🔍 **多源聚合搜索**：一次搜索多源返回，SSE 流式输出
- 📄 **丰富详情页**：剧集列表、评分、简介
- ▶️ **在线播放**：HLS 直连播放，流量不走服务器
- ❤️ **收藏 + 继续观看**：本地缓存，随开随用
- 📺 **直播**：m3u8 直播 + m3u 播放列表解析 + EPG 节目单
- 💾 **本地缓存**：搜索/详情/分类 IndexedDB 缓存，重复访问秒开
- 🎨 **深色模式**：自动 / 手动切换
- 📱 **响应式**：桌面侧边栏 + 移动端底部导航（平板已适配）
- 🔒 **单密码访问**：简单密码保护，仅限本人使用

---

## 🛠 技术栈

| 分类 | 技术 |
|---|---|
| **框架** | Next.js 14 · React 18 · TypeScript · Tailwind CSS |
| **播放** | ArtPlayer · HLS.js |
| **动效** | framer-motion · next-themes |
| **存储** | localStorage · IndexedDB（浏览器本地）|
| **后端** | Next.js API Routes · SSE 流式输出 |
| **部署** | Cloudflare Worker · @opennextjs/cloudflare |

---

## 🚀 快速开始

### 环境要求

- Node.js 20+
- pnpm 10+

### 安装

```bash
# 克隆项目
git clone git@github.com:ileonspace/novatv.git
cd novatv

# 安装依赖
pnpm install
```

### 开发

```bash
pnpm dev
```

打开 `http://localhost:3000` 即可。

### 构建

```bash
pnpm build       # Next.js 生产构建
pnpm typecheck   # 类型检查
pnpm lint        # 代码检查
```

### 测试

```bash
pnpm test
```

---

## ⚙️ 使用

1. 登录后点右上角 **用户菜单 → 导入配置**，自行导入所需的源配置：
   - **粘贴 JSON**：完整源配置
   - **订阅链接**：在线 JSON 配置
   - **直播源 m3u**：每行一个 m3u 播放列表地址
2. 需要直播时，**用户菜单 → 显示直播** 打开开关
3. 搜索 / 播放 / 收藏直接使用，数据自动本地缓存

> 所有内容相关配置均由使用者自行导入并存储于本地浏览器，项目本身不包含任何内容。

---

## 📁 项目结构

```
src/
├── app/            # 页面与 API 路由
│   ├── page.tsx    # 首页
│   ├── search/     # 搜索页
│   ├── play/       # 播放页
│   ├── douban/     # 豆瓣页
│   ├── live/       # 直播页
│   └── api/        # 服务端 API
├── components/     # 通用组件
├── lib/            # 工具库 / 数据层
├── hooks/          # 自定义 Hooks
└── styles/         # 全局样式
```

---

## ⚖️ 合规

仅供个人学习使用，请遵守当地法律法规。

---

## 📄 许可证

本项目衍生自 [MoonTechLab/LunaTV](https://github.com/MoonTechLab/LunaTV)，遵循 **CC BY-NC-SA 4.0** 协议：

- **BY（署名）**：使用或衍生必须保留原项目出处
- **NC（非商业）**：禁止任何商业化行为
- **SA（相同方式共享）**：衍生项目必须以相同协议开源

---

## 🙏 致谢

感谢 **[MoonTechLab](https://github.com/MoonTechLab)** 团队开源 [LunaTV](https://github.com/MoonTechLab/LunaTV) 项目，本项目的架构和功能均基于此构建。
