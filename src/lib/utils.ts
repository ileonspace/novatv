/* eslint-disable @typescript-eslint/no-explicit-any,no-console */
import he from 'he';

function getDoubanImageProxyConfig(): {
  proxyType:
  | 'server'
  | 'cmliussss-cdn-tencent'
  | 'cmliussss-cdn-ali'
  | 'custom';
  proxyUrl: string;
} {
  let doubanImageProxyType =
    localStorage.getItem('doubanImageProxyType') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY_TYPE ||
    'server';
  // 兼容历史数据：直连和豆瓣官方精品 CDN 统一使用服务器代理
  if (doubanImageProxyType === 'direct' || doubanImageProxyType === 'img3') {
    doubanImageProxyType = 'server';
  }
  const doubanImageProxy =
    localStorage.getItem('doubanImageProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_IMAGE_PROXY ||
    '';
  return {
    proxyType: doubanImageProxyType,
    proxyUrl: doubanImageProxy,
  };
}

/**
 * 处理图片 URL，如果设置了图片代理则使用代理
 */
export function processImageUrl(originalUrl: string): string {
  if (!originalUrl) return originalUrl;

  // 仅处理豆瓣图片代理
  if (!originalUrl.includes('doubanio.com')) {
    return originalUrl;
  }

  const { proxyType, proxyUrl } = getDoubanImageProxyConfig();
  switch (proxyType) {
    case 'server':
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    case 'cmliussss-cdn-tencent':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.net'
      );
    case 'cmliussss-cdn-ali':
      return originalUrl.replace(
        /img\d+\.doubanio\.com/g,
        'img.doubanio.cmliussss.com'
      );
    case 'custom':
      return `${proxyUrl}${encodeURIComponent(originalUrl)}`;
    default:
      return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
  }
}

/**
 * 从m3u8地址获取视频质量等级和网络信息
 * @param m3u8Url m3u8播放列表的URL
 * @returns Promise<{quality: string, loadSpeed: string, pingTime: number}> 视频质量等级和网络信息
 */
export async function getVideoResolutionFromM3u8(m3u8Url: string): Promise<{
  quality: string; // 真实质量（4K/1080p/720p/480p），检测不到时用中性"流畅"，不可达用"检测失败"
  loadSpeed: string;
  pingTime: number;
}> {
  // 1. 测可达 + 延迟（no-cors，宽松）
  const pingStart = performance.now();
  let reachable = false;
  let pingTime = 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    await fetch(m3u8Url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    reachable = true;
    pingTime = Math.round(performance.now() - pingStart);
  } catch {
    pingTime = Math.round(performance.now() - pingStart);
  } finally {
    clearTimeout(timer);
  }

  if (!reachable) {
    return { quality: '检测失败', loadSpeed: '未知', pingTime };
  }

  // 2. 请求服务端解析 m3u8 分辨率（带 referer 过防盗链）
  // 检测不到质量时用中性"流畅"，不误杀可能高清的源
  let quality = '流畅';
  try {
    const res = await fetch(`/api/video-info?url=${encodeURIComponent(m3u8Url)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.quality) {
        quality = data.quality;
      }
    }
  } catch {
    // 质量接口失败不影响可播判断
  }
  return { quality, loadSpeed: '正常', pingTime };
}

export function cleanHtmlTags(text: string): string {
  if (!text) return '';

  const cleanedText = text
    .replace(/<[^>]+>/g, '\n') // 将 HTML 标签替换为换行
    .replace(/\n+/g, '\n') // 将多个连续换行合并为一个
    .replace(/[ \t]+/g, ' ') // 将多个连续空格和制表符合并为一个空格，但保留换行符
    .replace(/^\n+|\n+$/g, '') // 去掉首尾换行
    .trim(); // 去掉首尾空格

  // 使用 he 库解码 HTML 实体
  return he.decode(cleanedText);
}
