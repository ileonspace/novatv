/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { CheckCircle2, ChevronDown, Database, Link2, Trash2, Tv, Upload, X } from 'lucide-react';
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
  // 视频数据 / 直播数据列表是否展开（默认折叠）
  const [sourceListOpen, setSourceListOpen] = useState(false);
  const [liveListOpen, setLiveListOpen] = useState(false);
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
      const existing = getLocalConfig() || {};
      if (mode === 'm3u') {
        // 直播数据：每行一个播放列表地址（一个地址含多个频道）
        if (!input.trim()) throw new Error('请输入直播数据地址');
        const lines = input
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const lives = { ...(existing.lives || {}) };
        lines.forEach((url, i) => {
          lives[`live${i + 1}`] = { name: `直播数据${i + 1}`, url };
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
      // JSON / 订阅链接模式：合并到现有配置，避免覆盖掉已导入的视频数据/直播数据
      if (mode !== 'm3u') {
        // custom_category 是数组，按 query+type 去重合并
        const seenCat = new Set<string>();
        const custom_category = [
          ...(existing.custom_category || []),
          ...(config.custom_category || []),
        ].filter((c) => {
          const key = `${c.query}-${c.type}`;
          if (seenCat.has(key)) return false;
          seenCat.add(key);
          return true;
        });
        config = {
          ...existing,
          ...config,
          cache_time: config.cache_time ?? existing.cache_time,
          api_site: { ...(existing.api_site || {}), ...(config.api_site || {}) },
          lives: { ...(existing.lives || {}), ...(config.lives || {}) },
          custom_category,
        };
      }
      // 视频数据或直播数据至少有一个
      const apiKeys = config?.api_site ? Object.keys(config.api_site) : [];
      const liveKeys = config?.lives ? Object.keys(config.lives) : [];
      if (apiKeys.length === 0 && liveKeys.length === 0) {
        throw new Error('配置中未找到有效的视频数据或直播数据');
      }
      saveLocalConfig(config);
      setCurrent(config);
      setSuccess(
        `✅ 导入成功：${apiKeys.length} 个视频数据${
          liveKeys.length ? `、${liveKeys.length} 个直播数据` : ''
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

  // 单独删除某个直播数据
  const removeLiveKey = (key: string) => {
    const cfg = getLocalConfig();
    if (!cfg?.lives) return;
    const lives = { ...cfg.lives };
    delete lives[key];
    saveLocalConfig({ ...cfg, lives });
    setCurrent(getLocalConfig());
  };

  // 清空视频数据 / 直播数据（互不影响）
  const clearSources = () => {
    const cfg = getLocalConfig();
    if (!cfg) return;
    saveLocalConfig({ ...cfg, api_site: {} });
    setCurrent(getLocalConfig());
  };

  const clearLives = () => {
    const cfg = getLocalConfig();
    if (!cfg) return;
    saveLocalConfig({ ...cfg, lives: {} });
    setCurrent(getLocalConfig());
  };

  const sourceCount = current?.api_site
    ? Object.keys(current.api_site).length
    : 0;
  const liveCount = current?.lives ? Object.keys(current.lives).length : 0;

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
            直播数据
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
                : '每行一个播放列表地址（一个地址含多个频道）'
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

        {/* 当前配置预览（视频数据 / 直播数据分开管理，可单独删除） */}
        {current && (
          <div className='mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='w-4 h-4 text-green-600 dark:text-green-400' />
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  当前配置
                </span>
              </div>
              <button
                onClick={handleClear}
                className='flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors'
              >
                <Trash2 className='w-3 h-3' />
                清除全部
              </button>
            </div>
            {current.cache_time && (
              <p className='text-xs text-gray-400'>缓存时间：{current.cache_time}s</p>
            )}

            {/* 视频数据区块（默认折叠） */}
            <div>
              <div className='flex items-center justify-between'>
                <button
                  onClick={() => setSourceListOpen(!sourceListOpen)}
                  className='flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 transition-colors'
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      sourceListOpen ? 'rotate-180' : ''
                    }`}
                  />
                  🎬 视频数据（{sourceCount}）
                </button>
                {sourceCount > 0 && (
                  <button
                    onClick={clearSources}
                    className='text-xs text-gray-500 hover:text-red-500 transition-colors'
                  >
                    清空视频数据
                  </button>
                )}
              </div>
              {sourceListOpen && sourceCount > 0 && (
                <div className='mt-1.5 space-y-1 max-h-28 overflow-y-auto'>
                  {Object.entries(current.api_site || {}).map(([key, site]) => (
                    <div
                      key={key}
                      className='flex items-center justify-between text-xs text-gray-600 dark:text-gray-300'
                    >
                      <span className='truncate'>{site.name || key}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 直播数据区块（默认折叠） */}
            {liveCount > 0 && (
              <div>
                <div className='flex items-center justify-between'>
                  <button
                    onClick={() => setLiveListOpen(!liveListOpen)}
                    className='flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 transition-colors'
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        liveListOpen ? 'rotate-180' : ''
                      }`}
                    />
                    📺 直播数据（{liveCount}）
                  </button>
                  <button
                    onClick={clearLives}
                    className='text-xs text-gray-500 hover:text-red-500 transition-colors'
                  >
                    清空直播数据
                  </button>
                </div>
                {liveListOpen && (
                  <div className='mt-1.5 space-y-1 max-h-28 overflow-y-auto'>
                    {Object.entries(current.lives || {}).map(([key, live]) => (
                      <div
                        key={key}
                        className='flex items-center justify-between text-xs text-gray-600 dark:text-gray-300'
                      >
                        <span className='truncate'>{live.name || key}</span>
                        <button
                          onClick={() => removeLiveKey(key)}
                          className='flex-shrink-0 ml-2 text-gray-400 hover:text-red-500 transition-colors'
                          title='删除此直播数据'
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
