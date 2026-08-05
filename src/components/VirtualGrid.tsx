'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Estimated row height in px (including gap). Will be refined by measurement. */
  estimateRowHeight?: number;
  /** CSS class for row gap, applied as padding-bottom on each row so measureElement captures it */
  rowGapClass?: string;
  /** Overscan rows */
  overscan?: number;
  className?: string;
}

/**
 * A virtualised grid that piggy-backs on CSS grid for column layout
 * and virtualises *rows* via @tanstack/react-virtual.
 *
 * It measures the actual container width + first-row height so it
 * works with responsive `grid-template-columns`.
 */
export default function VirtualGrid<T>({
  items,
  renderItem,
  estimateRowHeight = 320,
  rowGapClass = 'pb-14 sm:pb-20',
  overscan = 3,
  className = '',
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);
  // 当前列宽（px），用于动态计算估计行高，让 estimate 接近实际行高，
  // 避免切换数据时测量调整导致图片位置跳动
  const [colWidth, setColWidth] = useState(160);

  // Detect column count from a hidden probe row
  const probeRef = useRef<HTMLDivElement>(null);

  const detectColumns = useCallback(() => {
    if (!probeRef.current) return;
    const style = window.getComputedStyle(probeRef.current);
    const cols = style.gridTemplateColumns.split(' ').length;
    if (cols > 0 && cols !== columns) setColumns(cols);
    // 测量列宽（第一个子元素宽度），响应式下自动更新
    const first = probeRef.current.firstElementChild as HTMLElement | null;
    if (first) {
      const w = first.getBoundingClientRect().width;
      if (w > 0 && Math.abs(w - colWidth) > 1) setColWidth(w);
    }
  }, [columns, colWidth]);

  useEffect(() => {
    detectColumns();
    const ro = new ResizeObserver(detectColumns);
    if (probeRef.current) ro.observe(probeRef.current);
    return () => ro.disconnect();
  }, [detectColumns]);

  const rowCount = Math.ceil(items.length / columns);

  // 动态估计行高：图片高(宽×2/3) + 标题(~24px) + 行间距(pb-12=48 / sm:pb-20=80)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640;
  const dynamicEstimateRowHeight = Math.round(
    colWidth * 1.5 + 24 + (isDesktop ? 80 : 48)
  );

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => document.body,
    estimateSize: () => dynamicEstimateRowHeight,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <>
      {/* Hidden probe element that shares the same grid CSS to measure column count */}
      <div
        ref={probeRef}
        aria-hidden
        className={`grid invisible h-0 overflow-hidden ${className}`}
      >
        <div />
      </div>

      <div
        ref={parentRef}
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIdx = virtualRow.index * columns;
          const rowItems = items.slice(startIdx, startIdx + columns);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={`${rowGapClass}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={`grid ${className}`}>
                {rowItems.map((item, i) => (
                  <React.Fragment key={startIdx + i}>
                    {renderItem(item, startIdx + i)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
