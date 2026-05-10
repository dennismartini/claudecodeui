import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Sidebar from '../sidebar/view/Sidebar';
import SidebarResizeHandle from '../sidebar/view/subcomponents/SidebarResizeHandle';
import MainContent from '../main-content/view/MainContent';
import CommandPalette from '../command-palette/CommandPalette';
import ConversationTabs from '../conversation-tabs/ConversationTabs';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { PaletteOpsProvider, usePaletteOpsRegister } from '../../contexts/PaletteOpsContext';
import { useDeviceSettings } from '../../hooks/useDeviceSettings';
import { useSessionProtection } from '../../hooks/useSessionProtection';
import { useProjectsState } from '../../hooks/useProjectsState';
import { useUiPreferences } from '../../hooks/useUiPreferences';
import {
  useSidebarWidth,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
} from '../../hooks/useSidebarWidth';
import { useOpenSessionTabs, type SessionTab } from '../../hooks/useOpenSessionTabs';
import { useSessionAttention } from '../../hooks/useSessionAttention';
import { getAllSessions } from '../sidebar/utils/utils';

export default function AppContent() {
  return (
    <PaletteOpsProvider>
      <AppContentInner />
    </PaletteOpsProvider>
  );
}

function AppContentInner() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { t } = useTranslation('common');
  const { isMobile } = useDeviceSettings({ trackPWA: false });
  const { ws, sendMessage, latestMessage, isConnected } = useWebSocket();
  const wasConnectedRef = useRef(false);
  const { preferences } = useUiPreferences();
  const { width: sidebarWidth, setWidth: setSidebarWidth, resetWidth: resetSidebarWidth } = useSidebarWidth();
  const isSidebarVisibleDesktop = preferences.sidebarVisible;

  const {
    activeSessions,
    processingSessions,
    markSessionAsActive,
    markSessionAsInactive,
    markSessionAsProcessing,
    markSessionAsNotProcessing,
  } = useSessionProtection();

  const {
    projects,
    selectedProject,
    selectedSession,
    activeTab,
    sidebarOpen,
    isLoadingProjects,
    externalMessageUpdate,
    newSessionTrigger,
    setActiveTab,
    setSidebarOpen,
    setIsInputFocused,
    setShowSettings,
    openSettings,
    refreshProjectsSilently,
    sidebarSharedProps,
    handleNewSession,
    handleSessionSelect,
    handleSessionDelete,
    handleProjectDelete,
  } = useProjectsState({
    sessionId,
    navigate,
    latestMessage,
    isMobile,
    activeSessions,
  });

  const { tabs, openTab, closeTab, removeTab, removeTabsForProject, updateTabTitle } = useOpenSessionTabs();
  const { attentionSessions } = useSessionAttention();

  // Mirror the active session into the tab strip. We open a tab on every
  // selectedSession change (the hook focuses an existing tab if it's already
  // open, so this is idempotent).
  useEffect(() => {
    if (!selectedSession?.id || !selectedSession.__provider) return;
    const projectId =
      selectedSession.__projectId ||
      selectedProject?.projectId;
    if (!projectId) return;
    const title =
      (typeof selectedSession.summary === 'string' && selectedSession.summary.trim()) ||
      (typeof selectedSession.name === 'string' && selectedSession.name.trim()) ||
      'New session';
    openTab({
      sessionId: selectedSession.id,
      projectId,
      provider: selectedSession.__provider,
      title,
    });
  }, [
    selectedSession?.id,
    selectedSession?.__projectId,
    selectedSession?.__provider,
    selectedSession?.summary,
    selectedSession?.name,
    selectedProject?.projectId,
    openTab,
  ]);

  // When the projects payload refreshes (e.g. server-pushed summary update),
  // sync any matching tab titles so renamed sessions reflect everywhere.
  useEffect(() => {
    if (tabs.length === 0 || projects.length === 0) return;
    for (const tab of tabs) {
      const project = projects.find((p) => p.projectId === tab.projectId);
      if (!project) continue;
      const session = getAllSessions(project).find((s) => String(s.id) === tab.sessionId);
      if (!session) continue;
      const nextTitle =
        (typeof session.summary === 'string' && session.summary.trim()) ||
        (typeof session.name === 'string' && session.name.trim()) ||
        tab.title;
      if (nextTitle !== tab.title) {
        updateTabTitle(tab.sessionId, nextTitle);
      }
    }
  }, [projects, tabs, updateTabTitle]);

  const handleTabSelect = useCallback(
    (tab: SessionTab) => {
      const project = projects.find((p) => p.projectId === tab.projectId);
      if (project) {
        const session = getAllSessions(project).find((s) => String(s.id) === tab.sessionId);
        if (session) {
          handleSessionSelect({ ...session, __provider: tab.provider, __projectId: tab.projectId });
          return;
        }
      }
      // Fall back to a synthetic session if the projects payload hasn't caught
      // up yet — the URL-driven effect in useProjectsState will hydrate the
      // real one once it loads.
      handleSessionSelect({
        id: tab.sessionId,
        summary: tab.title,
        __provider: tab.provider,
        __projectId: tab.projectId,
      });
    },
    [handleSessionSelect, projects],
  );

  const handleTabClose = useCallback(
    (sessionIdToClose: string) => {
      const nextActive = closeTab(sessionIdToClose, selectedSession?.id ?? null);
      if (sessionIdToClose !== selectedSession?.id) {
        return;
      }
      if (nextActive) {
        const replacement = tabs.find((t) => t.sessionId === nextActive);
        if (replacement) {
          handleTabSelect(replacement);
          return;
        }
      }
      navigate('/');
    },
    [closeTab, handleTabSelect, navigate, selectedSession?.id, tabs],
  );

  // Wrap the project/session delete callbacks so the tab strip stays in sync.
  const sidebarSharedPropsWithTabs = useMemo(
    () => ({
      ...sidebarSharedProps,
      onSessionDelete: (deletedSessionId: string) => {
        removeTab(deletedSessionId);
        handleSessionDelete(deletedSessionId);
      },
      onProjectDelete: (deletedProjectId: string) => {
        removeTabsForProject(deletedProjectId);
        handleProjectDelete(deletedProjectId);
      },
    }),
    [handleProjectDelete, handleSessionDelete, removeTab, removeTabsForProject, sidebarSharedProps],
  );

  usePaletteOpsRegister({
    openSettings,
    refreshProjects: refreshProjectsSilently,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || message.type !== 'notification:navigate') {
        return;
      }

      if (typeof message.provider === 'string' && message.provider.trim()) {
        localStorage.setItem('selected-provider', message.provider);
      }

      setActiveTab('chat');
      setSidebarOpen(false);
      void refreshProjectsSilently();

      if (typeof message.sessionId === 'string' && message.sessionId) {
        navigate(`/session/${message.sessionId}`);
        return;
      }

      navigate('/');
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [navigate, refreshProjectsSilently, setActiveTab, setSidebarOpen]);

  // Permission recovery: query pending permissions on WebSocket reconnect or session change
  useEffect(() => {
    const isReconnect = isConnected && !wasConnectedRef.current;

    if (isReconnect) {
      wasConnectedRef.current = true;
    } else if (!isConnected) {
      wasConnectedRef.current = false;
    }

    if (isConnected && selectedSession?.id) {
      sendMessage({
        type: 'get-pending-permissions',
        sessionId: selectedSession.id
      });
    }
  }, [isConnected, selectedSession?.id, sendMessage]);

  // Adjust the app container to stay above the virtual keyboard on iOS Safari.
  // On Chrome for Android the layout viewport already shrinks when the keyboard opens,
  // so inset-0 adjusts automatically. On iOS the layout viewport stays full-height and
  // the keyboard overlays it — we use the Visual Viewport API to track keyboard height
  // and apply it as a CSS variable that shifts the container's bottom edge up.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // Only resize matters — keyboard open/close changes vv.height.
      // Do NOT listen to scroll: on iOS Safari, scrolling content changes
      // vv.offsetTop which would make --keyboard-height fluctuate during
      // normal scrolling, causing the container to bounce up and down.
      const kb = Math.max(0, window.innerHeight - vv.height);
      document.documentElement.style.setProperty('--keyboard-height', `${kb}px`);
    };
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return (
    <div className="fixed inset-0 flex bg-background" style={{ bottom: 'var(--keyboard-height, 0px)' }}>
      {!isMobile ? (
        <div
          className="relative h-full flex-shrink-0 border-r border-border/50"
          style={isSidebarVisibleDesktop ? { width: `${sidebarWidth}px` } : undefined}
        >
          <Sidebar {...sidebarSharedPropsWithTabs} />
          {isSidebarVisibleDesktop && (
            <SidebarResizeHandle
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onReset={resetSidebarWidth}
              minWidth={SIDEBAR_MIN_WIDTH}
              maxWidth={SIDEBAR_MAX_WIDTH}
            />
          )}
        </div>
      ) : (
        <div
          className={`fixed inset-0 z-50 flex transition-all duration-150 ease-out ${sidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
        >
          <button
            className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-150 ease-out"
            onClick={(event) => {
              event.stopPropagation();
              setSidebarOpen(false);
            }}
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setSidebarOpen(false);
            }}
            aria-label={t('versionUpdate.ariaLabels.closeSidebar')}
          />
          <div
            className={`relative h-full w-[85vw] max-w-sm transform border-r border-border/40 bg-card transition-transform duration-150 ease-out sm:w-80 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <Sidebar {...sidebarSharedPropsWithTabs} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationTabs
          tabs={tabs}
          activeSessionId={selectedSession?.id ?? null}
          projects={projects}
          attentionSessions={attentionSessions}
          processingSessions={processingSessions}
          onSelectTab={handleTabSelect}
          onCloseTab={handleTabClose}
        />
        <MainContent
          selectedProject={selectedProject}
          selectedSession={selectedSession}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ws={ws}
          sendMessage={sendMessage}
          latestMessage={latestMessage}
          isMobile={isMobile}
          onMenuClick={() => setSidebarOpen(true)}
          isLoading={isLoadingProjects}
          onInputFocusChange={setIsInputFocused}
          onSessionActive={markSessionAsActive}
          onSessionInactive={markSessionAsInactive}
          onSessionProcessing={markSessionAsProcessing}
          onSessionNotProcessing={markSessionAsNotProcessing}
          processingSessions={processingSessions}
          onNavigateToSession={(targetSessionId: string, options) =>
            navigate(`/session/${targetSessionId}`, { replace: Boolean(options?.replace) })
          }
          onShowSettings={() => setShowSettings(true)}
          externalMessageUpdate={externalMessageUpdate}
          newSessionTrigger={newSessionTrigger}
        />
      </div>

      <CommandPalette
        selectedProject={selectedProject}
        onStartNewChat={handleNewSession}
        onOpenSettings={() => openSettings()}
        onShowTab={setActiveTab}
      />
    </div>
  );
}
