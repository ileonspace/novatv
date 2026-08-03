/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

/**
 * NovaTV 前端本地配置管理。
 * 源配置存储于 localStorage，搜索时编码为 base64 携带给搜索 API（服务端无状态，不存储）。
 */

const CONFIG_KEY = 'novatv_config';

export interface LocalSiteConfig {
  cache_time?: number;
  api_site?: Record<
    string,
    { name: string; api: string; detail?: string }
  >;
  custom_category?: {
    name?: string;
    type: 'movie' | 'tv';
    query: string;
  }[];
  lives?: Record<
    string,
    { name: string; url: string; ua?: string; epg?: string }
  >;
}

export function getLocalConfig(): LocalSiteConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalConfig(config: LocalSiteConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearLocalConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

export function hasLocalConfig(): boolean {
  return !!getLocalConfig();
}

// 编码配置为 base64（UTF-8 安全，支持中文源名）
export function encodeConfigParam(config: LocalSiteConfig): string {
  const bytes = new TextEncoder().encode(JSON.stringify(config));
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// 返回 base64 编码的配置（无配置返回空字符串）
export function getConfigParam(): string {
  const config = getLocalConfig();
  if (!config) return '';
  return encodeConfigParam(config);
}

// 返回携带配置的 URL 后缀（无配置则返回空字符串）
export function getConfigUrlSuffix(): string {
  const config = getLocalConfig();
  if (!config) return '';
  return `&config=${encodeURIComponent(encodeConfigParam(config))}`;
}

// ---------- 直播显示设置 ----------
const SHOW_LIVE_KEY = 'novatv_show_live';

// 默认隐藏直播（用户可设置显示）
export function getShowLive(): boolean {
  try {
    return localStorage.getItem(SHOW_LIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setShowLive(show: boolean): void {
  localStorage.setItem(SHOW_LIVE_KEY, String(show));
}
