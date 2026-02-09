'use client';

import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Commentary } from '@/app/actions';
import { LoaderCircle } from 'lucide-react';

interface VirtualCommentaryListProps {
    commentary: Commentary[];
    renderItem: (comment: Commentary, index: number) => React.ReactNode;
    containerClassName?: string;
    onLoadMore?: () => void;
    loadingMore?: boolean;
    hasMore?: boolean;
    newCommentaryStartIndex?: number | null;
    onNewCommentaryVisible?: () => void;
}

// Threshold in pixels from bottom to trigger load more
const LOAD_MORE_THRESHOLD = 200;

export function VirtualCommentaryList({
    commentary,
    renderItem,
    containerClassName = 'max-h-[32rem]',
    onLoadMore,
    loadingMore,
    hasMore,
    newCommentaryStartIndex,
    onNewCommentaryVisible,
}: VirtualCommentaryListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const loadMoreTriggeredRef = useRef(false);

    const virtualizer = useVirtualizer({
        count: commentary.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80, // Estimated average item height
        overscan: 5, // Render 5 items above/below viewport for smooth scrolling
    });

    // Scroll to new commentary when it's loaded
    useEffect(() => {
        if (newCommentaryStartIndex !== null && newCommentaryStartIndex !== undefined && newCommentaryStartIndex < commentary.length) {
            // Small delay to allow virtualizer to update
            const timeout = setTimeout(() => {
                virtualizer.scrollToIndex(newCommentaryStartIndex, {
                    align: 'start',
                    behavior: 'smooth',
                });
                onNewCommentaryVisible?.();
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [newCommentaryStartIndex, commentary.length, virtualizer, onNewCommentaryVisible]);

    // Reset load more trigger when loadingMore changes to false
    useEffect(() => {
        if (!loadingMore) {
            loadMoreTriggeredRef.current = false;
        }
    }, [loadingMore]);

    // Infinite scroll - detect when scrolled near bottom (only on user scroll)
    useEffect(() => {
        const scrollElement = parentRef.current;
        if (!scrollElement) return;

        const handleScroll = () => {
            if (!hasMore || loadingMore || loadMoreTriggeredRef.current || !onLoadMore) return;

            const { scrollTop, scrollHeight, clientHeight } = scrollElement;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
                loadMoreTriggeredRef.current = true;
                onLoadMore();
            }
        };

        scrollElement.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            scrollElement.removeEventListener('scroll', handleScroll);
        };
    }, [hasMore, loadingMore, onLoadMore]);

    const items = virtualizer.getVirtualItems();

    return (
        <div className="space-y-0">
            <div
                ref={parentRef}
                className={`overflow-y-auto hide-scrollbar ${containerClassName}`}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {items.map((virtualItem) => (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            {renderItem(commentary[virtualItem.index], virtualItem.index)}
                        </div>
                    ))}
                </div>

                {/* Loading indicator at bottom */}
                {loadingMore && (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                        <LoaderCircle className="w-4 h-4 animate-spin mr-2" />
                        <span className="text-sm">Loading more...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
