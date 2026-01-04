
import React, { useState, useEffect, useRef } from 'react';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
}

export function VirtualList<T>({ items, itemHeight, renderItem, overscan = 5, className = '' }: VirtualListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [listOffset, setListOffset] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = document.getElementById('main-scroll-container');
        if (!container) return;

        const updateState = () => {
            if (!listRef.current) return;
            setScrollTop(container.scrollTop);
            setViewportHeight(container.clientHeight);
            
            // Calculate list's offset from the top of the scrollable content
            // container.scrollTop + (listRect.top - containerRect.top)
            const listRect = listRef.current.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offset = container.scrollTop + (listRect.top - containerRect.top);
            setListOffset(offset);
        };

        let rafId: number;
        const handler = () => {
            rafId = requestAnimationFrame(updateState);
        };

        // Measure on mount and when list size changes (layout shift)
        updateState();

        container.addEventListener('scroll', handler, { passive: true });
        const resizeObserver = new ResizeObserver(handler);
        resizeObserver.observe(container);
        
        return () => {
            container.removeEventListener('scroll', handler);
            resizeObserver.disconnect();
            cancelAnimationFrame(rafId);
        };
    }, [items.length]); // Re-measure if item count changes

    const totalHeight = items.length * itemHeight;
    
    // Relative to list start (0):
    const relativeScrollTop = Math.max(0, scrollTop - listOffset);
    const relativeScrollBottom = scrollTop + viewportHeight - listOffset;
    
    let startIndex = Math.floor(relativeScrollTop / itemHeight);
    let endIndex = Math.ceil(relativeScrollBottom / itemHeight);
    
    // Apply Overscan
    startIndex = Math.max(0, startIndex - overscan);
    endIndex = Math.min(items.length, endIndex + overscan);
    
    const visibleItems = [];
    for (let i = startIndex; i < endIndex; i++) {
        visibleItems.push(
            <div 
                key={i} 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: `${itemHeight}px`,
                    transform: `translateY(${i * itemHeight}px)` 
                }}
            >
                {renderItem(items[i], i)}
            </div>
        );
    }

    return (
        <div 
            ref={listRef} 
            className={className}
            style={{ 
                position: 'relative', 
                height: `${totalHeight}px`,
                // contain: 'layout size' // Optimization for browser layout engine
            }}
        >
            {visibleItems}
        </div>
    );
}
