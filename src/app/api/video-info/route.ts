import { NextResponse } from 'next/server';

import { isSafeUrl } from '@/lib/url-check';


// 从 m3u8 文本解析视频质量
function parseM3u8Quality(text: string): string | null {
  // 1. 优先解析 RESOLUTION（master playlist 多码率）
  const resolutions: Array<[number, number]> = [];
  const resRegex = /RESOLUTION=(\d+)x(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = resRegex.exec(text))) {
    resolutions.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
  }
  if (resolutions.length > 0) {
    const maxH = Math.max(...resolutions.map((r) => r[1]));
    return qualityFromHeight(maxH);
  }

  // 2. 无 RESOLUTION，解析 BANDWIDTH（master playlist）
  const bandwidths: number[] = [];
  const bwRegex = /BANDWIDTH=(\d+)/g;
  while ((m = bwRegex.exec(text))) bandwidths.push(parseInt(m[1], 10));
  if (bandwidths.length > 0) {
    const maxBw = Math.max(...bandwidths);
    return qualityFromBandwidth(maxBw);
  }

  // 3. 单码率 / 无法解析 → null（前端按中性"流畅"处理，不误杀）
  return null;
}

function qualityFromHeight(h: number): string {
  if (h >= 2160) return '4K';
  if (h >= 1080) return '1080p';
  if (h >= 720) return '720p';
  return '480p';
}

function qualityFromBandwidth(bw: number): string {
  if (bw >= 8000000) return '4K';
  if (bw >= 3000000) return '1080p';
  if (bw >= 1500000) return '720p';
  return '480p';
}

// NovaTV：轻量视频质量检测（解析 m3u8 文本，不加载视频）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // 防 SSRF
  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: 'URL 不合法' }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        // 过防盗链：带源站 Referer
        Referer: parsed.origin + '/',
        Accept: '*/*',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ quality: null });
    }
    const text = await res.text();
    const quality = parseM3u8Quality(text);
    return NextResponse.json({ quality });
  } catch {
    return NextResponse.json({ quality: null });
  }
}
