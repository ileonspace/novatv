/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';

import { isSafeUrl } from '@/lib/url-check';

import { getConfig, parseLivesFromConfig } from '@/lib/config';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const source = searchParams.get('novatv-source');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  const config = await getConfig();
  // 优先前端导入的直播源（config），否则环境变量
  const configParam = searchParams.get('config');
  const livesOverride = configParam ? parseLivesFromConfig(configParam) : undefined;
  const liveSource =
    livesOverride?.find((s: any) => s.key === source) ||
    config.LiveConfig?.find((s: any) => s.key === source);
  const ua = liveSource?.ua || 'AptvPlayer/1.4.10';

  try {
    const decodedUrl = decodeURIComponent(imageUrl);

    // 防 SSRF：拒绝私网/回环/非 http(s)
    if (!isSafeUrl(decodedUrl)) {
      return NextResponse.json({ error: 'URL 不合法' }, { status: 400 });
    }
    const imageResponse = await fetch(decodedUrl, {
      cache: 'no-cache',
      redirect: 'follow',
      credentials: 'same-origin',
      headers: {
        'User-Agent': ua,
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: imageResponse.statusText },
        { status: imageResponse.status }
      );
    }

    const contentType = imageResponse.headers.get('content-type');

    if (!imageResponse.body) {
      return NextResponse.json(
        { error: 'Image response has no body' },
        { status: 500 }
      );
    }

    // 创建响应头
    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    // 设置缓存头
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 缓存一天

    // 直接返回图片流
    return new Response(imageResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching image' },
      { status: 500 }
    );
  }
}
