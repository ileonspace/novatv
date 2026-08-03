/* eslint-disable no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getLiveConfigFromRequest } from '@/lib/config';


export async function GET(request: NextRequest) {
  try {
    // NovaTV：优先用请求携带的前端直播源（config），否则用环境变量配置
    const liveSources = await getLiveConfigFromRequest(request);

    return NextResponse.json({
      success: true,
      data: liveSources
    });
  } catch (error) {
    console.error('获取直播源失败:', error);
    return NextResponse.json(
      { error: '获取直播源失败' },
      { status: 500 }
    );
  }
}
