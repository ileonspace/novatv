import { useCallback, useEffect, useRef } from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  longPressDelay?: number;
  moveThreshold?: number;
}

interface TouchPosition {
  x: number;
  y: number;
}

/**
 * 长按手势 hook
 *
 * 设计要点（NovaTV v1.2.9 修复）：
 * - 短按：不 preventDefault，让浏览器原生合成 click 自然触发 onClick，
 *   避免"第一次点击无反应"（此前 onTouchEnd 无条件 preventDefault 吞掉 click，
 *   跳转完全依赖脆弱的 isActive 判断，手指轻微滑动即丢失点击）。
 * - 长按：preventDefault 阻止合成 click，仅显示长按菜单，不触发跳转。
 * - onTouchCancel：触摸被系统中断时重置状态，避免 isActive 残留干扰下次触摸。
 */
export const useLongPress = ({
  onLongPress,
  longPressDelay = 500,
  moveThreshold = 10,
}: UseLongPressOptions) => {
  const isLongPress = useRef(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const startPosition = useRef<TouchPosition | null>(null);
  const isActive = useRef(false); // 防止重复触发
  const wasButton = useRef(false); // 记录触摸开始时是否是按钮

  const clearTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearTimer();
    isLongPress.current = false;
    startPosition.current = null;
    isActive.current = false;
    wasButton.current = false;
  }, [clearTimer]);

  const handleStart = useCallback(
    (clientX: number, clientY: number, isButton = false) => {
      // 如果已经有活跃的手势，忽略新的开始
      if (isActive.current) {
        return;
      }

      isActive.current = true;
      isLongPress.current = false;
      startPosition.current = { x: clientX, y: clientY };

      // 记录触摸开始时是否是按钮
      wasButton.current = isButton;

      pressTimer.current = setTimeout(() => {
        // 再次检查是否仍然活跃
        if (!isActive.current) return;

        isLongPress.current = true;

        if (navigator.vibrate) {
          navigator.vibrate(50);
        }

        // 触发长按事件
        onLongPress();
      }, longPressDelay);
    },
    [onLongPress, longPressDelay]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!startPosition.current || !isActive.current) return;

      const distance = Math.sqrt(
        Math.pow(clientX - startPosition.current.x, 2) +
        Math.pow(clientY - startPosition.current.y, 2)
      );

      // 如果移动距离超过阈值，取消长按（计时器停止，但点击仍交给原生 click）
      if (distance > moveThreshold) {
        clearTimer();
      }
    },
    [clearTimer, moveThreshold]
  );

  // 触摸事件处理器
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // 检查是否触摸的是按钮或其他交互元素
      const target = e.target as HTMLElement;
      const buttonElement = target.closest('[data-button]');

      // 更精确的按钮检测：只有当触摸目标直接是按钮元素或其直接子元素时才认为是按钮
      const isDirectButton = target.hasAttribute('data-button');
      const isButton = !!buttonElement && isDirectButton;

      // 阻止默认的长按行为，但不阻止触摸开始事件
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, !!isButton);
    },
    [handleStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    [handleMove]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // 只有在长按时才阻止合成 click（避免长按误触跳转）
      if (isLongPress.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      // 短按：不 preventDefault，让浏览器原生 click 触发 onClick，
      // 从而可靠跳转，不受 isActive/滑动阈值影响
      resetState();
    },
    [resetState]
  );

  // 触摸被系统取消（来电/手势中断等）：重置状态，避免 isActive 残留
  const onTouchCancel = useCallback(() => {
    resetState();
  }, [resetState]);

  // 组件卸载时清理挂起的计时器，避免卡片被回收/重渲染后仍触发 onLongPress
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
};
