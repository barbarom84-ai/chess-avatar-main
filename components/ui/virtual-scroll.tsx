"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  maxHeight: number;
  className?: string;
  threshold?: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string | number;
}

/**
 * Renders a scrollable list; only mounts visible rows when the list is long.
 */
export function VirtualScroll<T>({
  items,
  itemHeight,
  maxHeight,
  className = "",
  threshold = 40,
  renderItem,
  getKey,
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const containerStyle: CSSProperties = { maxHeight };

  if (items.length <= threshold) {
    return (
      <div className={`overflow-y-auto ${className}`} style={containerStyle}>
        {items.map((item, index) => (
          <div key={getKey(item, index)}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const visibleCount = Math.ceil(maxHeight / itemHeight) + 4;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={containerStyle}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {items.slice(startIndex, endIndex).map((item, i) => {
            const index = startIndex + i;
            return (
              <div key={getKey(item, index)} style={{ minHeight: itemHeight }}>
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
