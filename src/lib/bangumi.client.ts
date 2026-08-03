'use client';

import { cacheGet, cacheSet } from './cache';

export interface BangumiCalendarData {
  weekday: {
    en: string;
  };
  items: {
    id: number;
    name: string;
    name_cn: string;
    rating: {
      score: number;
    };
    air_date: string;
    images: {
      large: string;
      common: string;
      medium: string;
      small: string;
      grid: string;
    };
  }[];
}

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  // NovaTV 缓存：番剧日历 24h 过期
  const cacheKey = 'bangumi_calendar';
  const cached = await cacheGet<BangumiCalendarData[]>(cacheKey);
  if (cached) return cached;

  const response = await fetch('/api/bangumi/calendar');
  if (!response.ok) {
    throw new Error(`获取番剧日历失败: HTTP ${response.status}`);
  }
  const data = await response.json();
  // 校验响应形状，避免非数组/缺 items 时崩溃
  if (!Array.isArray(data)) {
    throw new Error('番剧日历数据格式错误');
  }
  const filteredData = data
    .filter((item: any) => item && Array.isArray(item.items))
    .map((item: BangumiCalendarData) => ({
      ...item,
      items: item.items.filter(bangumiItem => bangumiItem.images)
    }));

  await cacheSet(cacheKey, filteredData);
  return filteredData;
}
