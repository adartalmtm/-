import type { WorkspacePayload } from '../types/suppliers';
import type { OfflineSyncOperationInput } from './apiClient';

const CACHE_PREFIX = 'al_eqfal_ws_cache_';
const QUEUE_PREFIX = 'al_eqfal_sync_queue_';
const SESSION_UID_KEY = 'al_eqfal_session_uid';

export function getActiveSessionUserIdHint(): string | null {
  try {
    return sessionStorage.getItem(SESSION_UID_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionUserIdHint(userId: string | null): void {
  try {
    if (userId) {
      sessionStorage.setItem(SESSION_UID_KEY, userId);
    } else {
      sessionStorage.removeItem(SESSION_UID_KEY);
    }
  } catch {
    // Ignore storage error
  }
}

export function getCachedWorkspace(userId: string): WorkspacePayload | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspacePayload;
  } catch {
    return null;
  }
}

export function setCachedWorkspace(workspace: WorkspacePayload): void {
  const userId = workspace.session.userId;
  setActiveSessionUserIdHint(userId);
  try {
    localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(workspace));
  } catch {
    // Ignore quota errors
  }
}

export function clearCachedWorkspace(userId: string): void {
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${userId}`);
  } catch {
    // Ignore storage errors
  }
}

export function getPendingQueue(userId: string): OfflineSyncOperationInput[] {
  try {
    const raw = localStorage.getItem(`${QUEUE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineSyncOperationInput[]) : [];
  } catch {
    return [];
  }
}

export function setPendingQueue(userId: string, queue: OfflineSyncOperationInput[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(`${QUEUE_PREFIX}${userId}`);
    } else {
      localStorage.setItem(`${QUEUE_PREFIX}${userId}`, JSON.stringify(queue));
    }
  } catch {
    // Ignore storage errors
  }
}

export function enqueueOfflineMutation(
  userId: string,
  operation: OfflineSyncOperationInput
): OfflineSyncOperationInput[] {
  const current = getPendingQueue(userId);
  const next = [...current, operation];
  setPendingQueue(userId, next);
  return next;
}

export function clearSyncedOperations(userId: string, processedIds: Set<string>): OfflineSyncOperationInput[] {
  const current = getPendingQueue(userId);
  const remaining = current.filter((op) => !processedIds.has(op.clientOpId));
  setPendingQueue(userId, remaining);
  return remaining;
}
