/**
 * 通用的豆瓣数据获取函数（服务端）
 * 支持代理类型 + 失败自动切换备用代理 + 最终降级直连（带 Referer 防封）
 */

import { isSafeUrl } from './url-check';

/** 代理请求选项 */
export interface DoubanProxyOpts {
  /** 代理类型：direct / cmliussss-cdn-tencent / cmliussss-cdn-ali / cors-proxy-zwei / cors-anywhere / custom */
  proxyType?: string;
  /** custom 模式的代理地址（校验防 SSRF） */
  proxyUrl?: string;
}

const DOUBAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
const TIMEOUT = 10000;

/** 根据代理类型构造最终请求 URL */
export function buildProxiedDoubanUrl(
  baseUrl: string,
  proxyType: string,
  proxyUrl: string
): string {
  switch (proxyType) {
    case 'cmliussss-cdn-tencent':
      // 豆瓣 CDN 镜像（腾讯云），域名替换绕开封禁
      return baseUrl
        .replace('m.douban.com', 'm.douban.cmliussss.net')
        .replace('movie.douban.com', 'movie.douban.cmliussss.net');
    case 'cmliussss-cdn-ali':
      return baseUrl
        .replace('m.douban.com', 'm.douban.cmliussss.com')
        .replace('movie.douban.com', 'movie.douban.cmliussss.com');
    case 'cors-proxy-zwei':
      return `https://ciao-cors.is-an.org/${encodeURIComponent(baseUrl)}`;
    case 'cors-anywhere':
      return `https://cors-anywhere.com/${baseUrl}`;
    case 'custom':
      // 自定义代理地址必须通过安全校验，防止 SSRF；
      // 确保代理地址以 / 结尾，避免拼接出 malformed URL
      return proxyUrl && isSafeUrl(proxyUrl)
        ? `${proxyUrl.endsWith('/') ? proxyUrl : proxyUrl + '/'}${encodeURIComponent(baseUrl)}`
        : baseUrl;
    case 'direct':
    default:
      return baseUrl;
  }
}

/** 构建代理尝试链：用户所选代理 → 腾讯 CDN → 阿里 CDN → 直连（带 Referer） */
function buildProxyChain(baseUrl: string, opts?: DoubanProxyOpts): string[] {
  const { proxyType = 'direct', proxyUrl = '' } = opts || {};
  const chain: string[] = [];

  // 1. 用户选择的代理（排除直连，直连放最后兜底）
  const preferred = buildProxiedDoubanUrl(baseUrl, proxyType, proxyUrl);
  if (preferred !== baseUrl) chain.push(preferred);

  // 2. 备用 CDN：腾讯 / 阿里 互相补充
  const tencent = buildProxiedDoubanUrl(baseUrl, 'cmliussss-cdn-tencent', '');
  const ali = buildProxiedDoubanUrl(baseUrl, 'cmliussss-cdn-ali', '');
  if (tencent !== baseUrl && !chain.includes(tencent)) chain.push(tencent);
  if (ali !== baseUrl && !chain.includes(ali)) chain.push(ali);

  // 3. 最终降级直连（服务端带 Referer 请求豆瓣源站）
  chain.push(baseUrl);
  return chain;
}

async function fetchOnce<T>(
  url: string,
  validate?: (data: T) => boolean
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': DOUBAN_UA,
        Referer: 'https://movie.douban.com/',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://movie.douban.com',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = (await response.json()) as T;
    // 校验数据形状：豆瓣限流/异常时可能返回 200 + 错误 JSON（无 items/subjects），
    // 此时必须 throw 让代理链降级到下一个代理，而非中断返回导致空白
    if (validate && !validate(data)) {
      throw new Error('返回数据格式无效（可能被限流）');
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 获取豆瓣数据，失败自动重试并切换备用代理，最后降级直连。
 * @param url 豆瓣源站 URL
 * @param opts 代理选项（可选，不传则直连）
 * @param validate 数据形状校验器：返回 false 表示该代理返回了无效数据（如限流错误体），
 *                 会立即降级到下一个代理，而不是中断整条链
 */
export async function fetchDoubanData<T>(
  url: string,
  opts?: DoubanProxyOpts,
  validate?: (data: T) => boolean
): Promise<T> {
  const attempts = buildProxyChain(url, opts);
  let lastError: unknown = null;

  for (const targetUrl of attempts) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        return await fetchOnce<T>(targetUrl, validate);
      } catch (e) {
        lastError = e;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('获取豆瓣数据失败');
}
