'use client';

import { useEffect } from 'react';

import { cacheCleanup } from '@/lib/cache';

/**
 * 全局缓存清理器：每次应用加载时清理过期缓存（无 UI）
 */
export default function CacheCleaner() {
  useEffect(() => {
    cacheCleanup();
  }, []);
  return null;
}
