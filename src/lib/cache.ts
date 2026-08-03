/* eslint-disable no-console */

/**
 * NovaTV 本地缓存（IndexedDB）
 * 缓存搜索结果、视频详情等数据，24h 过期，容量超限 LRU 清理。
 */

const DB_NAME = 'novatv_cache';
const DB_VERSION = 1;
const STORE = 'cache';

// 缓存版本：升级后旧缓存自动失效（避免命中过期的错误数据）
const CACHE_VERSION = 'v2';

function vkey(key: string): string {
  return `${CACHE_VERSION}::${key}`;
}

// 默认缓存时长 24h（影视作品更新时间）
const DEFAULT_TTL =
  Number(process.env.NEXT_PUBLIC_CACHE_TTL) || 24 * 60 * 60 * 1000;

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
  return dbPromise;
}

/** 读取缓存，过期自动删除并返回 null */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(vkey(key));
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (!entry) return resolve(null);
        if (Date.now() - entry.timestamp > entry.ttl) {
          cacheRemove(key).catch(() => undefined);
          resolve(null);
        } else {
          resolve(entry.value as T);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

/** 写入缓存 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const db = await openDB();
    const entry: CacheEntry = {
      key: vkey(key),
      value,
      timestamp: Date.now(),
      ttl,
    };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
    // 容量检查（每 20 次写入触发一次，避免写入突发时全表 count 开销）
    writeCount++;
    if (writeCount % 20 === 0) {
      checkAndTrim().catch(() => undefined);
    }
  } catch (e) {
    // 静默失败（存储不可用/已满）
  }
}

/** 删除单条缓存 */
export async function cacheRemove(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(vkey(key));
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // ignore
  }
}

/** 清空所有缓存 */
export async function cacheClear(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // ignore
  }
}

/** 清理所有过期缓存，返回清理条数 */
export async function cacheCleanup(): Promise<number> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const now = Date.now();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      let removed = 0;
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          if (now - entry.timestamp > entry.ttl) {
            cursor.delete();
            removed++;
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(removed);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    return 0;
  }
}

/** 获取缓存信息（用于设置页展示） */
export async function cacheInfo(): Promise<{
  size: number;
  oldest: number;
  ttl: number;
}> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const countReq = store.count();
      let oldest = Infinity;
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          oldest = Math.min(oldest, cursor.value.timestamp);
          cursor.continue();
        }
      };
      countReq.onsuccess = () => {
        tx.oncomplete = () => {
          resolve({
            size: countReq.result,
            oldest: oldest === Infinity ? 0 : oldest,
            ttl: DEFAULT_TTL,
          });
        };
      };
    });
  } catch (e) {
    return { size: 0, oldest: 0, ttl: DEFAULT_TTL };
  }
}

// 容量上限（约 30MB 数据）
const MAX_ENTRIES = 500;
let trimming = false;
// 写入计数器（控制 checkAndTrim 触发频率）
let writeCount = 0;

async function checkAndTrim(): Promise<void> {
  if (trimming) return;
  trimming = true;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result > MAX_ENTRIES) {
          // 按时间戳删除最旧的，直到降到上限
          const index = store.index('timestamp');
          const cursorReq = index.openCursor();
          let toDelete = countReq.result - MAX_ENTRIES;
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && toDelete > 0) {
              cursor.delete();
              toDelete--;
              cursor.continue();
            }
          };
        }
      };
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // ignore
  } finally {
    trimming = false;
  }
}

export { DEFAULT_TTL };
