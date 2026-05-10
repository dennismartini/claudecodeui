import { useEffect, useRef, useState } from 'react';

import { useWebSocket } from '../contexts/WebSocketContext';

type AttentionMessage = {
  kind?: string;
  type?: string;
  sessionId?: string | null;
  requestId?: string | null;
};

/**
 * Tracks which sessions are currently blocked waiting on the user — permission
 * prompts or interactive tools (AskUserQuestion / ExitPlanMode).
 *
 * Kept at the AppContent level so the tab strip can show "needs attention"
 * dots on tabs the user isn't currently looking at.
 */
export function useSessionAttention() {
  const { latestMessage } = useWebSocket() as { latestMessage: AttentionMessage | null };
  const [attentionSessions, setAttentionSessions] = useState<Set<string>>(new Set());

  // Keyed by requestId so we can reverse-lookup the session when a request is
  // cancelled/answered without needing the cancel message to repeat sessionId.
  const requestSessionRef = useRef<Map<string, string>>(new Map());
  const lastProcessedRef = useRef<AttentionMessage | null>(null);

  useEffect(() => {
    if (!latestMessage) return;
    if (lastProcessedRef.current === latestMessage) return;
    lastProcessedRef.current = latestMessage;

    const kind = latestMessage.kind;
    const sessionId = latestMessage.sessionId;
    const requestId = latestMessage.requestId;

    if (kind === 'permission_request' && sessionId && requestId) {
      requestSessionRef.current.set(requestId, sessionId);
      setAttentionSessions((prev) => {
        if (prev.has(sessionId)) return prev;
        const next = new Set(prev);
        next.add(sessionId);
        return next;
      });
      return;
    }

    if (kind === 'permission_cancelled' && requestId) {
      const owningSessionId = requestSessionRef.current.get(requestId) || sessionId;
      requestSessionRef.current.delete(requestId);
      if (owningSessionId) {
        // Only clear the session-level flag if no other request from the same
        // session is still pending.
        const stillPending = [...requestSessionRef.current.values()].some((id) => id === owningSessionId);
        if (!stillPending) {
          setAttentionSessions((prev) => {
            if (!prev.has(owningSessionId)) return prev;
            const next = new Set(prev);
            next.delete(owningSessionId);
            return next;
          });
        }
      }
      return;
    }

    // Turn finished — drop any lingering attention flag for that session and
    // forget the request → session mapping for its outstanding requests.
    if (kind === 'complete' && sessionId) {
      for (const [reqId, sid] of requestSessionRef.current.entries()) {
        if (sid === sessionId) requestSessionRef.current.delete(reqId);
      }
      setAttentionSessions((prev) => {
        if (!prev.has(sessionId)) return prev;
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }, [latestMessage]);

  return { attentionSessions };
}
