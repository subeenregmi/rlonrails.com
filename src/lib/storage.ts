import { CURRICULUM } from "./curriculum";
import { emptyProgress, isValidProgress, type Progress, sanitizeProgress } from "./progress";

export const STORAGE_KEY = "rl-underground.progress";

function readStorage(): Progress {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    return isValidProgress(parsed) ? sanitizeProgress(CURRICULUM, parsed) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

let cached: Progress | null = null;
const listeners = new Set<() => void>();

export const progressStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): Progress {
    cached ??= readStorage();
    return cached;
  },
  getServerSnapshot: (): Progress | null => null,
};

export function saveProgress(progress: Progress) {
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  cached = progress;
  for (const listener of listeners) listener();
}
