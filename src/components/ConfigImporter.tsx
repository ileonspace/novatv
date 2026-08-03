/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { CheckCircle2, Database, Link2, Trash2, Tv, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cacheClear, cacheCleanup, cacheInfo } from '@/lib/cache';
import {
  clearLocalConfig,
  getLocalConfig,
  saveLocalConfig,
  LocalSiteConfig,
} from '@/lib/config.client';

interface ConfigImporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigImporter({ isOpen, onClose }: ConfigImporterProps) {
  const [mode, setMode] = useState<'json' | 'url' | 'm3u'>('json');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [current, setCurrent] = useState<LocalSiteConfig | null>(() =>
    getLocalConfig()
  );
  const [cacheStat, setCacheStat] = useState<{
    size: number;
    oldest: number;
    ttl: number;
  } | null>(null);

  // 打开时加载缓存信息
  useEffect(() => {
    if (isOpen) {
      cacheInfo().then(setCacheStat);
    }
  }, [isOpen]);

  const refreshCacheInfo = async () => {
    setCacheStat(await cacheInfo());
  };

  if (!isOpen) return null;

  const handleImport = async () => {
    setError('');
    setSuccess('');
    let config: LocalSiteConfig;
    try {
      if (mode === 'm3u') {
        // m3u 直播源：每行一个 m3u 播放列表地址（一个地址含多个频道）
        if (!input.trim()) throw new Error('请输入 m3u 直播源地址');
        const lines = input
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const existing = getLocalConfig() || {};
        const lives = { ...(existing.lives || {}) };
        lines.forEach((url, i) => {
          lives[`live${i + 1}`] = { name: `直播源${i + 1}`, url };
        });
        config = { ...existing, lives };
      } else if (mode === 'url') {
        if (!input.trim()) throw new Error('请输入订阅链接');
        setLoading(true);
        const res = await fetch(input.trim());
        if (!res.ok) throw new Error('订阅链接请求失败，请确认链接可访问');
        config = await res.json();
      } else {
        if (!input.trim()) throw new Error('请粘贴配置 JSON');
        config = JSON.parse(input);
      }
      // 播放源或直播源至少有一个
      const apiKeys = config?.api_site ? Object.keys(config.api_site) : [];
      const liveKeys = config?.lives ? Object.keys(config.lives) : [];
      if (apiKeys.length === 0 && liveKeys.length === 0) {
        throw new Error('配置中未找到有效的播放源或直播源');
      }
      saveLocalConfig(config);
      setCurrent(config);
      setSuccess(
        `✅ 导入成功：${apiKeys.length} 个播放源${
          liveKeys.length ? `、${liveKeys.length} 个直播源` : ''
        }`
      );
      setInput('');
    } catch (e: any) {
      setError(e.message || '导入失败，请检查格式');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearLocalConfig();
    setCurrent(null);
    setSuccess('');
    setError('');
    setInput('');
  };

  const sourceCount = current?.api_site
    ? Object.keys(current.api_site).length
    : 0;

  return createPortal(
    <div
      className='fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6'
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-bold text-gray-800 dark:text-gray-200'>
            导入源配置
          </h3>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            aria-label='关闭'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* 模式切换 */}
        <div className='flex gap-1.5 mb-4'>
          <button
            onClick={() => setMode('json')}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              mode === 'json'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Upload className='w-3.5 h-3.5 inline mr-1' />
            粘贴 JSON
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              mode === 'url'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Link2 className='w-3.5 h-3.5 inline mr-1' />
            订阅链接
          </button>
          <button
            onClick={() => setMode('m3u')}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              mode === 'm3u'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            <Tv className='w-3.5 h-3.5 inline mr-1' />
            直播源 m3u
          </button>
        </div>

        {/* 输入区 */}
        {mode === 'json' || mode === 'm3u' ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'json'
                ? '粘贴配置 JSON，格式：{"api_site": {"key": {"name":"","api":""}}, "cache_time": 7200}'
                : '每行一个 m3u 直播源地址（一个地址含多个频道）\n如：https://example.com/live.m3u'
            }
            className='w-full h-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 font-mono resize-none focus:ring-2 focus:ring-green-500 focus:outline-none'
          />
        ) : (
          <input
            type='url'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='粘贴订阅链接，如 https://example.com/sub.json'
            className='w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:outline-none'
          />
        )}

        {/* 状态提示 */}
        {error && (
          <p className='mt-3 text-sm text-red-600 dark:text-red-400'>{error}</p>
        )}
        {success && (
          <p className='mt-3 text-sm text-green-600 dark:text-green-400'>
            {success}
          </p>
        )}

        {/* 当前配置预览 */}
        {current && (
          <div className='mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='w-4 h-4 text-green-600 dark:text-green-400' />
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  当前配置：{sourceCount} 个播放源
                </span>
              </div>
              <button
                onClick={handleClear}
                className='flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors'
              >
                <Trash2 className='w-3 h-3' />
                清除
              </button>
            </div>
            {current.cache_time && (
              <p className='mt-1 text-xs text-gray-400'>缓存时间：{current.cache_time}s</p>
            )}
          </div>
        )}

        {/* 说明 */}
        <p className='mt-3 text-xs text-gray-400 leading-relaxed'>
          配置保存在浏览器本地，搜索时自动携带（服务端不存储）。
          若未导入配置，将使用部署时环境变量中的源。
        </p>

        {/* 导入按钮 */}
        <button
          onClick={handleImport}
          disabled={loading || !input.trim()}
          className='mt-4 w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? '加载中...' : '导入并生效'}
        </button>

        {/* 缓存管理 */}
        <div className='mt-5 pt-4 border-t border-gray-200 dark:border-gray-700'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2'>
              <Database className='w-4 h-4 text-gray-500 dark:text-gray-400' />
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                本地缓存
              </span>
            </div>
            <span className='text-xs text-gray-400'>
              {cacheStat ? `${cacheStat.size} 条 · 有效期 ${Math.round(
                cacheStat.ttl / 3600000
              )} 小时` : '加载中...'}
            </span>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={async () => {
                await cacheCleanup();
                await refreshCacheInfo();
              }}
              className='flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
            >
              清理过期
            </button>
            <button
              onClick={async () => {
                await cacheClear();
                await refreshCacheInfo();
              }}
              className='flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
            >
              清空全部
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
