/* eslint-disable no-console,@typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";

import { isSafeUrl } from "@/lib/url-check";

import { getConfig, parseLivesFromConfig } from "@/lib/config";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source = searchParams.get('novatv-source');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const config = await getConfig();
  // 优先前端导入的直播源（config），否则环境变量
  const configParam = searchParams.get('config');
  const livesOverride = configParam ? parseLivesFromConfig(configParam) : undefined;
  const liveSource =
    livesOverride?.find((s: any) => s.key === source) ||
    config.LiveConfig?.find((s: any) => s.key === source);
  if (!liveSource) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }
  const ua = liveSource.ua || 'AptvPlayer/1.4.10';

  try {
    const decodedUrl = decodeURIComponent(url);

    // 防 SSRF：拒绝私网/回环/非 http(s)
    if (!isSafeUrl(decodedUrl)) {
      return NextResponse.json({ error: 'URL 不合法' }, { status: 400 });
    }
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': ua,
      },
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch key' }, { status: 500 });
    }
    const keyData = await response.arrayBuffer();
    return new Response(keyData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch key' }, { status: 500 });
  }
}