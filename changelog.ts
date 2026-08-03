// NovaTV 本地变更日志（手动维护）

export interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.2.9e",
    date: "2026-08-04",
    added: [
      "部署迁移到 @opennextjs/cloudflare（弃用 next-on-pages）",
      "登录用户名可配置（USERNAME 环境变量，默认 owner）",
      "成功部署 Cloudflare Worker：novatv.chinesev.workers.dev"
    ],
    changed: [
      "部署方式：Cloudflare Worker（手动 wrangler deploy）",
      "移除 48 处 edge runtime 声明（OpenNext 用 Node runtime）"
    ],
    fixed: [
      "修复废弃工具 next-on-pages 导致的线上 500",
      "部署账号残留 token 导致请求打到主账号的问题"
    ]
  },
  {
    version: "1.2.9d",
    date: "2026-08-03",
    added: [
      "代码审查 5 项修复：代理链校验 / SSRF DNS 重绑定 / 长按清理 / 静默刷新 / forceRefresh"
    ],
    changed: [],
    fixed: [
      "代理链被 200 错误 JSON 击穿",
      "SSRF DNS 重绑定绕过（127.0.0.1.nip.io）"
    ]
  },
  {
    version: "1.2.9",
    date: "2026-08-03",
    added: [
      "豆瓣分类切换空白根治：服务端统一代理链 + 缓存优先",
      "卡片首次点击无反应修复：长按 hook 不吞 click",
      "移动端点击不干脆修复：touch-action 消除 300ms 延迟"
    ],
    changed: [],
    fixed: [
      "豆瓣页/首页分类切换偶发空白"
    ]
  },
  {
    version: "1.2.8",
    date: "2026-08-03",
    added: [
      "视频质量检测：服务端解析 m3u8 真实质量（4K/1080p/720p/480p）",
      "测速综合优选：质量优先 + 高速"
    ],
    changed: [
      "测速排序质量分优先，检测不到的源不排后",
      "自动优选质量最高 + 延迟最低的最佳源"
    ],
    fixed: [
      "无“检测失败/未知”字样（检测不到质量显示中性“流畅”）"
    ]
  },
  {
    version: "1.2.7",
    date: "2026-08-03",
    added: [
      "播放源自动优选：秒进播放器后后台并发测速",
      "换源列表当前源置顶 + 其余按延迟升序"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.2.6",
    date: "2026-08-03",
    added: [
      "全量代码审查修复（约 40 项）",
      "SSRF 防护：代理接口拒绝私网/回环地址",
      "认证 cookie 改签名令牌（HMAC + 7 天有效期 + Secure）"
    ],
    changed: [
      "登录限流（5 次失败 30s 锁定）",
      "换源测速改宽松：仅 m3u8 可达性 + 延迟，不解析清晰度",
      "播放页 EventSource 提前终止 + 卸载关闭"
    ],
    fixed: [
      "换源列表测速显示（后台测速填充 precomputedVideoInfo）",
      "零源搜索立即完成、EPG 请求序号去重"
    ]
  },
  {
    version: "1.2.5",
    date: "2026-08-03",
    added: [
      "用户菜单“管理面板”分组（收纳导入配置 + 显示直播）"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.2.4",
    date: "2026-08-03",
    added: [
      "NovaTV 专属 Logo（favicon / PWA 图标 / logo）",
      "清理原项目截图等残留资源"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.2.3",
    date: "2026-08-03",
    added: [
      "直播源导入：m3u 播放列表模式（每行一个地址）",
      "直播功能开关修复（ENABLE_WEB_LIVE 默认启用）"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.2.2",
    date: "2026-08-03",
    added: [],
    changed: [
      "首页分类间距紧凑优化",
      "移动端页面滚动修复（html/body height→min-height）"
    ],
    fixed: []
  },
  {
    version: "1.2.0",
    date: "2026-08-03",
    added: [
      "移动端体验优化：首页新番修复、筛选按钮字体加大、直播隐藏设置"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.1.9",
    date: "2026-08-02",
    added: [],
    changed: [
      "移动端/平板全面适配（平板用底部导航，断点调整）"
    ],
    fixed: []
  },
  {
    version: "1.1.8",
    date: "2026-08-02",
    added: [
      "全局按钮按压反馈 + 页面/图片/切换丝滑动效"
    ],
    changed: [],
    fixed: [
      "播放页返回卡死（播放器卸载清理）"
    ]
  },
  {
    version: "1.1.7",
    date: "2026-08-02",
    added: [],
    changed: [],
    fixed: [
      "新番/番剧图片不显示（bgm 图被墙 → 改用豆瓣数据）",
      "豆瓣数据源前端请求失败（改服务端代理）"
    ]
  },
  {
    version: "1.1.5",
    date: "2026-08-02",
    added: [
      "本地缓存机制：搜索/详情/分类 IndexedDB 缓存 24h",
      "缓存管理（手动清理 + 自动过期）"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.1.2",
    date: "2026-08-02",
    added: [],
    changed: [
      "播放页流式搜索：第一个可用源立即播放（秒进）"
    ],
    fixed: []
  },
  {
    version: "1.1.0",
    date: "2026-08-02",
    added: [
      "前端配置导入：粘贴 JSON / 订阅链接 / 直播源 m3u",
      "源配置存 localStorage，搜索/直播自动携带"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.0.0",
    date: "2026-08-02",
    added: [
      "NovaTV 初始化：基于影视聚合能力重新构建",
      "服务端零数据存储，纯 localStorage",
      "单一密码访问（PASSWORD 环境变量）",
      "播放直连源站，不走服务器流量",
      "项目确定名称为：Nova TV",
      "Cloudflare Pages 适配（next-on-pages）"
    ],
    changed: [],
    fixed: []
  }
];

export default changelog;
