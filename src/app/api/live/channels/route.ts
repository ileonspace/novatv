import { NextRequest, NextResponse } from 'next/server';

import { parseLivesFromConfig } from '@/lib/config';
import { getCachedLiveChannels } from '@/lib/live';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceKey = searchParams.get('source');

    if (!sourceKey) {
      return NextResponse.json({ error: '缺少直播数据参数' }, { status: 400 });
    }

    // NovaTV：前端导入的直播数据（config 参数）优先
    const configParam = searchParams.get('config');
    const livesOverride = configParam
      ? parseLivesFromConfig(configParam)
      : undefined;

    const channelData = await getCachedLiveChannels(sourceKey, livesOverride);

    if (!channelData) {
      return NextResponse.json({ error: '频道信息未找到' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: channelData.channels
    });
  } catch (error) {
    return NextResponse.json(
      { error: '获取频道信息失败' },
      { status: 500 }
    );
  }
}
