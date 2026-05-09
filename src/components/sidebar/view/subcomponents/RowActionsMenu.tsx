import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MoreHorizontal } from 'lucide-react';

import { cn } from '../../../../lib/utils';

export type RowAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  danger?: boolean;
};

export type RowActionsMenuHandle = {
  /** Programmatically open the menu (used by right-click handlers). */
  open: () => void;
};

type RowActionsMenuProps = {
  actions: RowAction[];
  triggerLabel: string;
  triggerSize?: 'sm' | 'md';
  triggerClassName?: string;
  /**
   * Visible when collapsed (no hover). When false, the trigger is hidden until
   * the parent group is hovered or the menu is open. Defaults to false to
   * match the previous "appears on hover" behavior.
   */
  alwaysVisible?: boolean;
};

/**
 * Compact dropdown menu used by sidebar rows (workspace and session items).
 * Replaces the inline trash/edit icons that used to appear on hover.
 *
 * Trigger: a ⋯ button. Right-click on the row can also open it via the
 * imperative `open()` method on the forwarded ref.
 */
const RowActionsMenu = forwardRef<RowActionsMenuHandle, RowActionsMenuProps>(function RowActionsMenu(
  { actions, triggerLabel, triggerSize = 'md', triggerClassName, alwaysVisible = false },
  ref,
) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
  }), []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  const triggerSizeClass = triggerSize === 'sm' ? 'h-5 w-5' : 'h-6 w-6';
  const iconSizeClass = triggerSize === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((previous) => !previous);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        title={triggerLabel}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          'flex items-center justify-center rounded transition-all duration-200 hover:bg-accent',
          triggerSizeClass,
          alwaysVisible || isOpen
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 touch:opacity-100',
          triggerClassName,
        )}
      >
        <MoreHorizontal className={cn(iconSizeClass, 'text-muted-foreground')} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-border/70 bg-popover py-1 text-xs text-foreground shadow-lg"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                close();
                action.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-accent',
                action.danger && 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
              )}
            >
              <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center">
                {action.icon}
              </span>
              <span className="truncate">{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default RowActionsMenu;
