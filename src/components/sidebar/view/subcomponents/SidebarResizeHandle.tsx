import { useCallback, useEffect, useRef } from 'react';

type SidebarResizeHandleProps = {
  width: number;
  onWidthChange: (next: number) => void;
  onReset?: () => void;
  minWidth: number;
  maxWidth: number;
  ariaLabel?: string;
};

export default function SidebarResizeHandle({
  width,
  onWidthChange,
  onReset,
  minWidth,
  maxWidth,
  ariaLabel = 'Resize sidebar',
}: SidebarResizeHandleProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const stopDragging = useCallback(() => {
    if (!draggingRef.current) {
      return;
    }
    draggingRef.current = false;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) {
        return;
      }
      const delta = event.clientX - startXRef.current;
      onWidthChange(startWidthRef.current + delta);
    };

    const handleMouseUp = () => stopDragging();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      stopDragging();
    };
  }, [onWidthChange, stopDragging]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    startXRef.current = event.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onWidthChange(width - step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onWidthChange(width + step);
    }
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className="group absolute top-0 right-0 z-10 flex h-full w-1.5 -translate-x-1/2 cursor-col-resize items-center justify-center hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="h-12 w-px bg-border/0 transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary/60" />
    </div>
  );
}
