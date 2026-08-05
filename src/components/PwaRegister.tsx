'use client';

import { useEffect } from 'react';

// 注册 Service Worker（PWA 离线缓存）
export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('Service Worker 注册失败:', err));
    };

    // 页面加载完成后再注册，避免影响首屏渲染
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
