/* eslint-disable no-console */

'use client';

import { CURRENT_VERSION } from "@/lib/version";

// 版本检查结果枚举
export enum UpdateStatus {
  HAS_UPDATE = 'has_update', // 有新版本
  NO_UPDATE = 'no_update', // 无新版本
  FETCH_FAILED = 'fetch_failed', // 获取失败
}

// NovaTV 无远程版本源，本地即最新
export async function checkForUpdates(): Promise<UpdateStatus> {
  return UpdateStatus.NO_UPDATE;
}

/**
 * 比较版本号
 * @param remoteVersion 远程版本号
 * @returns UpdateStatus - 返回版本比较状态
 */
export function compareVersions(remoteVersion: string): UpdateStatus {
  // 如果版本号相同，无需更新
  if (remoteVersion === CURRENT_VERSION) {
    return UpdateStatus.NO_UPDATE;
  }

  return UpdateStatus.NO_UPDATE;
}
