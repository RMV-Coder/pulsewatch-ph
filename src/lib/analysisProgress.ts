type Progress = { total: number; processed: number };

// In-memory progress store. Note: reset on server restart.
const progressStore = new Map<string, Progress>();

export function initProgress(runId: string, total: number) {
  progressStore.set(runId, { total, processed: 0 });
}

export function incrementProgress(runId: string) {
  const p = progressStore.get(runId);
  if (p) {
    p.processed = Math.min(p.total, p.processed + 1);
    progressStore.set(runId, p);
  }
}

export function getProgress(runId: string): Progress | null {
  return progressStore.get(runId) || null;
}

export function setProgressProcessed(runId: string, processed: number) {
  const p = progressStore.get(runId);
  if (p) {
    p.processed = Math.min(p.total, processed);
    progressStore.set(runId, p);
  }
}

export function clearProgress(runId: string) {
  progressStore.delete(runId);
}
