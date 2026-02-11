import type { OnUpdate, Transport } from '../core/contracts.js';

export type PollingGetUpdates = (params: { offset?: number; signal: AbortSignal }) => Promise<readonly unknown[]>;

export interface PollingOptions {
  getUpdates: PollingGetUpdates;
  intervalMs?: number;
  dedupe?: {
    getUpdateId?: (update: unknown) => number | undefined;
    getKey?: (update: unknown) => string | number | undefined;
    ttlMs?: number;
    maxSize?: number;
  };
}

export interface PollingController extends Transport {
  isRunning(): boolean;
}

function defaultGetKey(
  update: unknown,
  getUpdateId: (update: unknown) => number | undefined,
): string | number | undefined {
  const id = getUpdateId(update);
  return id === undefined ? undefined : id;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve();
    };

    signal.addEventListener('abort', onAbort);
  });
}

function cleanupDedupeStore(store: Map<string | number, number>, now: number, maxSize: number): void {
  for (const [id, expiresAt] of store) {
    if (expiresAt <= now) {
      store.delete(id);
    }
  }

  while (store.size > maxSize) {
    const first = store.keys().next();
    if (first.done) break;
    store.delete(first.value);
  }
}

export function createPollingTransport(options: PollingOptions): PollingController {
  const intervalMs = options.intervalMs ?? 250;
  const getUpdateId = options.dedupe?.getUpdateId ?? (() => undefined);
  const getKey = options.dedupe?.getKey ?? ((u) => defaultGetKey(u, getUpdateId));
  const ttlMs = options.dedupe?.ttlMs ?? 60_000;
  const maxSize = options.dedupe?.maxSize ?? 1_000;
  const dedupeEnabled = ttlMs > 0 && maxSize > 0;

  const abortController = new AbortController();
  let running = false;
  let onUpdateHandler: OnUpdate | undefined;
  let loopPromise: Promise<void> | undefined;

  let lastUpdateId: number | undefined;
  const seen = new Map<string | number, number>();
  let nextCleanupAt = 0;

  return {
    start(onUpdate: OnUpdate): void {
      if (onUpdateHandler) {
        throw new Error('Transport already started');
      }
      onUpdateHandler = onUpdate;
      running = true;

      loopPromise = (async () => {
        const onUpdate = onUpdateHandler!;
        while (!abortController.signal.aborted) {
          const offset = lastUpdateId === undefined ? undefined : lastUpdateId + 1;

          let updates: readonly unknown[];
          try {
            updates = await options.getUpdates({ offset, signal: abortController.signal });
          } catch (_err) {
            if (abortController.signal.aborted) break;
            throw _err;
          }

          for (const update of updates) {
            const id = getUpdateId(update);
            if (id !== undefined) {
              lastUpdateId = lastUpdateId === undefined ? id : Math.max(lastUpdateId, id);
            }

            const key = getKey(update);

            if (dedupeEnabled && key !== undefined) {
              const now = Date.now();
              if (now >= nextCleanupAt) {
                cleanupDedupeStore(seen, now, maxSize);
                nextCleanupAt = now + ttlMs;
              }

              const expiresAt = seen.get(key);
              if (expiresAt !== undefined && expiresAt > now) {
                continue;
              }
            }

            await onUpdate(update);

            if (dedupeEnabled && key !== undefined) {
              const now = Date.now();
              seen.set(key, now + ttlMs);
              if (seen.size > maxSize) {
                cleanupDedupeStore(seen, now, maxSize);
              }
            }
          }

          if (abortController.signal.aborted) break;
          await sleep(intervalMs, abortController.signal);
        }
      })().finally(() => {
        running = false;
      });
    },
    stop: async (): Promise<void> => {
      if (!running || !loopPromise) return;
      abortController.abort();
      await loopPromise;
    },
    isRunning: (): boolean => running,
  };
}

export function createPollingController(
  bot: { handleUpdate: (update: unknown) => Promise<unknown> },
  options: PollingOptions,
): PollingController {
  const transport = createPollingTransport(options);
  transport.start((update) => bot.handleUpdate(update));
  return transport;
}
