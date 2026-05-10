import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';
import SessionProviderLogo from '../llm-logo-provider/SessionProviderLogo';
import type { SessionTab } from '../../hooks/useOpenSessionTabs';
import type { Project } from '../../types/app';

type ConversationTabsProps = {
  tabs: SessionTab[];
  activeSessionId: string | null;
  projects: Project[];
  attentionSessions?: Set<string>;
  processingSessions?: Set<string>;
  onSelectTab: (tab: SessionTab) => void;
  onCloseTab: (sessionId: string) => void;
};

const projectLabelFor = (projects: Project[], projectId: string): string => {
  const project = projects.find((p) => p.projectId === projectId);
  return project?.displayName || project?.projectId || '';
};

export default function ConversationTabs({
  tabs,
  activeSessionId,
  projects,
  attentionSessions,
  processingSessions,
  onSelectTab,
  onCloseTab,
}: ConversationTabsProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!activeRef.current) return;
    activeRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeSessionId]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border/50 bg-background/60 px-2 py-1 backdrop-blur-sm">
      {tabs.map((tab) => {
        const isActive = tab.sessionId === activeSessionId;
        const projectLabel = projectLabelFor(projects, tab.projectId);
        const needsAttention = Boolean(attentionSessions?.has(tab.sessionId));
        const isProcessing = Boolean(processingSessions?.has(tab.sessionId));
        return (
          <div
            key={tab.sessionId}
            className={cn(
              'group relative flex h-7 max-w-[220px] flex-shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 text-xs transition-colors',
              isActive
                ? 'border-border/70 bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
              needsAttention && !isActive && 'border-amber-400/60 bg-amber-50/40 text-foreground dark:border-amber-500/40 dark:bg-amber-900/15',
            )}
          >
            <button
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onSelectTab(tab)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              title={
                needsAttention
                  ? `Waiting for your input — ${projectLabel ? projectLabel + ' — ' : ''}${tab.title}`
                  : `${projectLabel ? projectLabel + ' — ' : ''}${tab.title}`
              }
            >
              <span className="relative flex h-3 w-3 flex-shrink-0 items-center justify-center">
                <SessionProviderLogo provider={tab.provider} className="h-3 w-3" />
                {needsAttention && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                )}
                {!needsAttention && isProcessing && (
                  <span className="absolute -right-1 -top-1 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </span>
              <span className="truncate">{tab.title || 'Untitled session'}</span>
              {projectLabel && (
                <span className="hidden truncate text-[10px] text-muted-foreground/70 lg:inline">
                  {projectLabel}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.sessionId);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              aria-label="Close tab"
              className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm transition-opacity',
                isActive
                  ? 'opacity-70 hover:bg-accent hover:opacity-100'
                  : 'opacity-0 group-hover:opacity-70 hover:bg-accent hover:opacity-100',
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
