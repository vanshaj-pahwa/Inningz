'use client';

import { useEffect, useRef, useState } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  enabled = true,
}: SwipeOptions) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      setSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const deltaX = e.touches[0].clientX - startX.current;
      const deltaY = e.touches[0].clientY - startY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        const progress = Math.min(Math.abs(deltaX) / threshold, 1);
        setSwipeProgress(progress);
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const deltaX = e.changedTouches[0].clientX - startX.current;
      const deltaY = e.changedTouches[0].clientY - startY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      startX.current = null;
      startY.current = null;
      setSwiping(false);
      setSwipeDirection(null);
      setSwipeProgress(0);
    };

    // Mouse events for laptop/desktop testing
    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      startX.current = e.clientX;
      startY.current = e.clientY;
      isDragging.current = true;
      setSwiping(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || startX.current === null || startY.current === null) return;

      const deltaX = e.clientX - startX.current;
      const deltaY = e.clientY - startY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        const progress = Math.min(Math.abs(deltaX) / threshold, 1);
        setSwipeProgress(progress);
        setSwipeDirection(deltaX > 0 ? 'right' : 'left');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current || startX.current === null || startY.current === null) return;

      const deltaX = e.clientX - startX.current;
      const deltaY = e.clientY - startY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      startX.current = null;
      startY.current = null;
      isDragging.current = false;
      setSwiping(false);
      setSwipeDirection(null);
      setSwipeProgress(0);
    };

    // Keyboard events for easy testing
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft' && onSwipeRight) {
        onSwipeRight(); // Left arrow = go to previous (swipe right)
      } else if (e.key === 'ArrowRight' && onSwipeLeft) {
        onSwipeLeft(); // Right arrow = go to next (swipe left)
      }
    };

    // Touch events
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse events
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  return { swiping, swipeDirection, swipeProgress };
}
