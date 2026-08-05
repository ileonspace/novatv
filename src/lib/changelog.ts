// NovaTV 本地变更日志（手动维护）
// 合规说明：本日志仅描述界面、功能、技术交流与项目进展，
// 不包含任何第三方数据地址/名称、数据服务信息或与版权相关的描述。

export interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-08-05",
    added: [
      "PWA 离线增强：Service Worker 静态资源缓存 + 离线回退，可安装到桌面/电视",
      "核心链路自动化回归测试（登录/搜索/播放/收藏，e2e/core-regression.py）"
    ],
    changed: [
      "Service Worker 改为运行时缓存策略（不依赖预缓存列表，版本迭代后无需更新 SW 文件）"
    ],
    fixed: [
      "修复认证中间件误拦截 PWA 公开资源（sw.js / manifest.json / robots.txt / icons）",
      "清理失效的旧 workbox Service Worker 文件（next-pwa 从未启用，属残留）"
    ]
  },
  {
    version: "1.3.4",
    date: "2026-08-05",
    added: [],
    changed: [
      "管理面板「显示直播」与「导入配置」字号统一为 text-sm"
    ],
    fixed: [
      "管理面板显示直播开关字体比导入配置大（缺 text-sm）"
    ]
  },
  {
    version: "1.3.3",
    date: "2026-08-05",
    added: [
      "「显示直播」升级为滑块开关：切换后导航栏实时显示/隐藏直播分类，无需刷新页面",
      "导航栏监听开关变化，桌面侧边栏与移动端底部导航同步实时响应"
    ],
    changed: [
      "本地设置弹窗移动端适配：采用动态视口高度，内容区域独立滚动，四周留白"
    ],
    fixed: [
      "移动端本地设置弹窗上下内容被遮挡、关闭按钮不可见"
    ]
  },
  {
    version: "1.3.2",
    date: "2026-08-05",
    added: [],
    changed: [
      "详情接口优先使用通用 JSON 接口解析（与检索数据一致），解析失败或为空时才降级为 HTML 页面解析",
      "收藏/继续观看再次进入时，详情获取不再依赖不可靠的 HTML 详情页解析"
    ],
    fixed: [
      "收藏夹/继续观看再次点击无法播放（部分数据详情解析失败导致播放地址为空）",
      "同一内容「首次检索可播、二次从收藏进入报错」的路径不一致问题"
    ]
  },
  {
    version: "1.3.1",
    date: "2026-08-04",
    added: [
      "移动端筛选分类标签与选项同行排列（左右滚动保留）"
    ],
    changed: [
      "豆瓣切换分类不再跳动：VirtualGrid 动态估计行高 + 加载指示改为覆盖层",
      "动漫筛选按钮高度统一（MultiLevelSelector padding 对齐其他筛选）",
      "筛选分类字体统一 13px（MultiLevelSelector 去掉桌面 16px）"
    ],
    fixed: [
      "切换分类时图片先下移再恢复的布局跳动",
      "动漫筛选与其他筛选排列/间距不统一"
    ]
  },
  {
    version: "1.3.0",
    date: "2026-08-04",
    added: [
      "可选线路列表按标题/年份/类型精确匹配过滤",
      "配置面板分类管理、默认折叠",
      "搜索结果筛选分类字体统一 13px"
    ],
    changed: [
      "首页/收藏夹按钮恢复原项目样式",
      "JSON/订阅链接导入改为合并，不再覆盖已有配置"
    ],
    fixed: [
      "可选线路列表串台（同名/续集/系列内容混入）",
      "实时频道播放黑屏（频道标识、SSRF 公网 IP 误判、嵌套地址缺参数）",
      "实时频道加载卡顿（节目单超时、预检失败不再阻断播放器）"
    ]
  },
  {
    version: "1.2.9e",
    date: "2026-08-04",
    added: [
      "登录用户名支持自定义配置",
      "部署方案升级：基于新版 OpenNext 适配器"
    ],
    changed: [
      "移除旧版边缘运行时声明，采用更稳定的 Node 运行时",
      "登录界面与认证逻辑优化"
    ],
    fixed: [
      "修复部署后页面加载异常问题",
      "优化登录认证稳定性"
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
      "画质检测：服务端解析流媒体真实画质（4K/1080p/720p/480p）",
      "测速综合优选：画质优先 + 高速"
    ],
    changed: [
      "测速排序画质分优先，无法检测的线路不排后",
      "自动优选画质最高 + 延迟最低的线路"
    ],
    fixed: [
      "画质检测失败/未知的处理（检测不到显示中性「流畅」）"
    ]
  },
  {
    version: "1.2.7",
    date: "2026-08-03",
    added: [
      "播放线路自动优选：秒进播放器后后台并发测速",
      "可选线路列表当前线路置顶 + 其余按延迟升序"
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
      "线路测速改宽松：仅流地址可达性 + 延迟，不解析清晰度",
      "播放页 EventSource 提前终止 + 卸载关闭"
    ],
    fixed: [
      "可选线路列表测速显示（后台测速填充 precomputedVideoInfo）",
      "空结果搜索立即完成、节目单请求序号去重"
    ]
  },
  {
    version: "1.2.5",
    date: "2026-08-03",
    added: [
      "用户菜单「管理面板」分组（收纳导入配置 + 实时频道开关）"
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
      "频道列表导入：播放列表模式（每行一个地址）",
      "频道功能开关修复（ENABLE_WEB_LIVE 默认启用）"
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
      "移动端体验优化：首页新番修复、筛选按钮字体加大、实时频道显示设置"
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
      "新番/番剧图片不显示（数据源变更导致图片失效）",
      "豆瓣数据前端请求失败（改服务端代理）"
    ]
  },
  {
    version: "1.1.5",
    date: "2026-08-02",
    added: [
      "本地缓存机制：检索/详情/分类 IndexedDB 缓存 24h",
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
      "播放页流式检索：第一个可用线路立即播放（秒进）"
    ],
    fixed: []
  },
  {
    version: "1.1.0",
    date: "2026-08-02",
    added: [
      "前端配置导入：粘贴 JSON / 订阅链接 / 播放列表",
      "JSON 配置存 localStorage，检索与频道自动携带"
    ],
    changed: [],
    fixed: []
  },
  {
    version: "1.0.0",
    date: "2026-08-02",
    added: [
      "NovaTV 初始化：基于信息检索能力重新构建",
      "服务端零数据存储，纯 localStorage",
      "简单密码访问控制",
      "播放直连数据服务，不经服务器中转",
      "项目确定名称为：Nova TV",
      "Cloudflare适配"
    ],
    changed: [],
    fixed: []
  }
];

export default changelog;
