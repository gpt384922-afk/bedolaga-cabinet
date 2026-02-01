import { useCallback, useRef } from 'react';
import { useTelegramSDK } from './useTelegramSDK';

/**
 * Hook to manage Telegram vertical swipes during drag-and-drop operations.
 * Disables Telegram's swipe-to-close gesture while dragging to prevent conflicts.
 *
 * Usage with @dnd-kit:
 * ```tsx
 * const { onDragStart, onDragEnd } = useTelegramDnd();
 *
 * <DndContext
 *   onDragStart={(e) => {
 *     onDragStart();
 *     // your drag start logic
 *   }}
 *   onDragEnd={(e) => {
 *     onDragEnd();
 *     // your drag end logic
 *   }}
 * >
 * ```
 */
export function useTelegramDnd() {
  const { disableVerticalSwipes, enableVerticalSwipes, isTelegramWebApp } = useTelegramSDK();
  const isDraggingRef = useRef(false);

  const onDragStart = useCallback(() => {
    if (isTelegramWebApp && !isDraggingRef.current) {
      isDraggingRef.current = true;
      disableVerticalSwipes();
    }
  }, [isTelegramWebApp, disableVerticalSwipes]);

  const onDragEnd = useCallback(() => {
    if (isTelegramWebApp && isDraggingRef.current) {
      isDraggingRef.current = false;
      enableVerticalSwipes();
    }
  }, [isTelegramWebApp, enableVerticalSwipes]);

  const onDragCancel = useCallback(() => {
    if (isTelegramWebApp && isDraggingRef.current) {
      isDraggingRef.current = false;
      enableVerticalSwipes();
    }
  }, [isTelegramWebApp, enableVerticalSwipes]);

  return {
    onDragStart,
    onDragEnd,
    onDragCancel,
    isTelegramWebApp,
  };
}
