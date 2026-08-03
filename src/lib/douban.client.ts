/* eslint-disable @typescript-eslint/no-explicit-any,no-console,no-case-declarations */

import { cacheGet, cacheSet } from './cache';
import { DoubanResult } from './types';

interface DoubanCategoriesParams {
  kind: 'tv' | 'movie';
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

interface DoubanListParams {
  tag: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

interface DoubanRecommendsParams {
  kind: 'tv' | 'movie';
  pageLimit?: number;
  pageStart?: number;
  category?: string;
  format?: string;
  label?: string;
  region?: string;
  year?: string;
  platform?: string;
  sort?: string;
}

/**
 * 读取当前豆瓣代理配置（localStorage 或运行时常量）
 * NovaTV：所有数据请求统一走服务端 API，服务端负责代理链 + 重试 + 降级
 */
function getDoubanProxyConfig(): {
  proxyType: string;
  proxyUrl: string;
} {
  const doubanProxyType =
    localStorage.getItem('doubanDataSource') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY_TYPE ||
    'direct';
  const doubanProxy =
    localStorage.getItem('doubanProxyUrl') ||
    (window as any).RUNTIME_CONFIG?.DOUBAN_PROXY ||
    '';
  return {
    proxyType: doubanProxyType,
    proxyUrl: doubanProxy,
  };
}

/**
 * 带 stale-while-revalidate 的数据获取：
 * - 缓存命中 → 立即返回旧数据（秒开、不空白），后台静默刷新缓存供下次使用
 * - 缓存未命中 → 直接请求服务端（服务端自身已做代理重试+降级）
 */
// 后台刷新（缓存命中后的静默更新）标记：期间 fetcher 失败不触发全局错误提示
let backgroundRefreshing = false;

async function fetchWithStaleCache<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  isValid: (r: T) => boolean,
  forceRefresh = false
): Promise<T> {
  if (!forceRefresh) {
    const cached = await cacheGet<T>(cacheKey);
    if (cached) {
      // 缓存命中：后台静默刷新（不触发全局错误提示），仅更新缓存供下次使用
      backgroundRefreshing = true;
      try {
        const fresh = await fetcher();
        if (isValid(fresh)) {
          cacheSet(cacheKey, fresh).catch(() => undefined);
        }
      } catch (e) {
        // 后台刷新失败静默：屏幕上已是有效缓存，不打扰用户
      } finally {
        backgroundRefreshing = false;
      }
      return cached;
    }
  }

  const fresh = await fetcher();
  if (isValid(fresh)) {
    await cacheSet(cacheKey, fresh);
  }
  return fresh;
}

/** 触发全局错误提示（后台刷新失败时不打扰用户） */
function dispatchGlobalError(message: string) {
  if (backgroundRefreshing) return; // 缓存已显示，后台刷新失败静默
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('globalError', { detail: { message } })
    );
  }
}

/** 拼接服务端豆瓣 API 地址，附带代理参数 */
function buildServerUrl(
  path: string,
  params: Record<string, string | undefined>,
  proxyType: string,
  proxyUrl: string
): string {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qp.set(key, value);
    }
  });
  // 代理配置：direct 无需传，服务端默认直连
  if (proxyType && proxyType !== 'direct') {
    qp.set('proxyType', proxyType);
  }
  if (proxyUrl) {
    qp.set('proxyUrl', proxyUrl);
  }
  return `${path}?${qp.toString()}`;
}

/** 分类数据缓存键（含代理类型：切换代理不串数据） */
function doubanCatCacheKey(
  params: DoubanCategoriesParams,
  proxyType: string
): string {
  return `douban_cat_${proxyType}_${JSON.stringify(params)}`;
}

/** 快速读取分类数据缓存（命中立即返回，供页面切换分类时避免空白） */
export async function peekDoubanCategories(
  params: DoubanCategoriesParams
): Promise<DoubanResult | null> {
  const { proxyType } = getDoubanProxyConfig();
  return cacheGet<DoubanResult>(doubanCatCacheKey(params, proxyType));
}

/**
 * 统一的豆瓣分类数据获取函数
 * 统一走服务端 API，服务端负责代理链 + 重试 + 降级
 */
export async function getDoubanCategories(
  params: DoubanCategoriesParams,
  forceRefresh = false
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;
  const { proxyType, proxyUrl } = getDoubanProxyConfig();

  // 缓存键含代理类型：切换代理不串数据；24h 过期
  const cacheKey = doubanCatCacheKey(params, proxyType);
  const isValid = (r: DoubanResult) =>
    r && r.code === 200 && Array.isArray(r.list) && r.list.length > 0;

  return fetchWithStaleCache(cacheKey, async () => {
    let response: Response;
    try {
      response = await fetch(
        buildServerUrl(
          '/api/douban/categories',
          {
            kind,
            category,
            type,
            limit: String(pageLimit),
            start: String(pageStart),
          },
          proxyType,
          proxyUrl
        )
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (e) {
      dispatchGlobalError('获取豆瓣分类数据失败');
      throw new Error(`获取豆瓣分类数据失败: ${(e as Error).message}`);
    }
    return (await response.json()) as DoubanResult;
  }, isValid, forceRefresh);
}

/** 列表数据缓存键（含代理类型） */
function doubanListCacheKey(params: DoubanListParams, proxyType: string): string {
  return `douban_list_${proxyType}_${JSON.stringify(params)}`;
}

/** 快速读取列表数据缓存 */
export async function peekDoubanList(
  params: DoubanListParams
): Promise<DoubanResult | null> {
  const { proxyType } = getDoubanProxyConfig();
  return cacheGet<DoubanResult>(doubanListCacheKey(params, proxyType));
}

/**
 * 统一的豆瓣列表数据获取函数（豆瓣页）
 * 统一走服务端 API
 */
export async function getDoubanList(
  params: DoubanListParams,
  forceRefresh = false
): Promise<DoubanResult> {
  const { tag, type, pageLimit = 20, pageStart = 0 } = params;
  const { proxyType, proxyUrl } = getDoubanProxyConfig();

  const cacheKey = doubanListCacheKey(params, proxyType);
  const isValid = (r: DoubanResult) =>
    r && r.code === 200 && Array.isArray(r.list) && r.list.length > 0;

  return fetchWithStaleCache(cacheKey, async () => {
    let response: Response;
    try {
      response = await fetch(
        buildServerUrl(
          '/api/douban',
          {
            tag,
            type,
            pageSize: String(pageLimit),
            pageStart: String(pageStart),
          },
          proxyType,
          proxyUrl
        )
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (e) {
      dispatchGlobalError('获取豆瓣列表数据失败');
      throw new Error(`获取豆瓣列表数据失败: ${(e as Error).message}`);
    }
    return (await response.json()) as DoubanResult;
  }, isValid, forceRefresh);
}

/**
 * 统一的豆瓣推荐数据获取函数（新番放送/豆瓣页）
 * 统一走服务端 API，只带有效参数（避免 undefined 导致服务端筛选异常）
 */
/** 推荐数据缓存键（含代理类型） */
function doubanRecCacheKey(
  params: DoubanRecommendsParams,
  proxyType: string
): string {
  return `douban_rec_${proxyType}_${JSON.stringify(params)}`;
}

/** 快速读取推荐数据缓存 */
export async function peekDoubanRecommends(
  params: DoubanRecommendsParams
): Promise<DoubanResult | null> {
  const { proxyType } = getDoubanProxyConfig();
  return cacheGet<DoubanResult>(doubanRecCacheKey(params, proxyType));
}

export async function getDoubanRecommends(
  params: DoubanRecommendsParams,
  forceRefresh = false
): Promise<DoubanResult> {
  const {
    kind,
    pageLimit = 20,
    pageStart = 0,
    category,
    format,
    label,
    region,
    year,
    platform,
    sort,
  } = params;
  const { proxyType, proxyUrl } = getDoubanProxyConfig();

  const cacheKey = doubanRecCacheKey(params, proxyType);
  const isValid = (r: DoubanResult) =>
    r && r.code === 200 && Array.isArray(r.list) && r.list.length > 0;

  return fetchWithStaleCache(cacheKey, async () => {
    let response: Response;
    try {
      response = await fetch(
        buildServerUrl(
          '/api/douban/recommends',
          {
            kind,
            limit: String(pageLimit),
            start: String(pageStart),
            category,
            format,
            label,
            region,
            year,
            platform,
            sort,
          },
          proxyType,
          proxyUrl
        )
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    } catch (e) {
      dispatchGlobalError('获取豆瓣推荐数据失败');
      throw new Error(`获取豆瓣推荐数据失败: ${(e as Error).message}`);
    }
    return (await response.json()) as DoubanResult;
  }, isValid, forceRefresh);
}
