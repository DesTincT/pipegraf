export type PollingGetUpdates = (params: { offset?: number; signal: AbortSignal }) => Promise<readonly unknown[]>;

export type PollingOptions = {
  getUpdates: PollingGetUpdates;
  intervalMs?: number;
  dedupe?: {
    getUpdateId?: (update: unknown) => number | undefined;
  };
};

export type PollingController = {
  stop: () => Promise<void>;
  isRunning: () => boolean;
};

export type UpdateHandler = {
  handleUpdate: (update: unknown) => Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultGetUpdateId(update: unknown): number | undefined {
  if (!isRecord(update)) return undefined;
  const value = update['update_id'];
  return typeof value === 'number' ? value : undefined;
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

export function createPollingController(bot: UpdateHandler, options: PollingOptions): PollingController {
  const intervalMs = options.intervalMs ?? 250;
  const getUpdateId = options.dedupe?.getUpdateId ?? defaultGetUpdateId;

  const abortController = new AbortController();
  let running = true;

  let lastUpdateId: number | undefined;

  const loop = (async () => {
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
        await bot.handleUpdate(update);

        const id = getUpdateId(update);
        if (id !== undefined) {
          lastUpdateId = lastUpdateId === undefined ? id : Math.max(lastUpdateId, id);
        }
      }

      if (abortController.signal.aborted) break;
      await sleep(intervalMs, abortController.signal);
    }
  })().finally(() => {
    running = false;
  });

  return {
    stop: async () => {
      if (!running) return;
      abortController.abort();
      await loop;
    },
    isRunning: () => running,
  };
}

