type PollingBot = {
  startPolling(options: {
    intervalMs?: number;
    getUpdates: (params: { offset?: number; signal: AbortSignal }) => Promise<readonly unknown[]>;
  }): {
    stop(): Promise<void>;
  };
};

type MockUpdate = {
  update_id: number;
};

type MockPollingController = {
  stop(): Promise<void>;
};

type MockPollingOptions = {
  intervalMs?: number;
};

export function startMockPolling<TUpdate extends MockUpdate>(
  bot: PollingBot,
  updates: readonly TUpdate[],
  options: MockPollingOptions = {},
): MockPollingController {
  const intervalMs = options.intervalMs ?? 100;
  let cursor = 0;
  const getUpdateId = (update: TUpdate): number => update.update_id;

  const transport = bot.startPolling({
    intervalMs,
    getUpdates: async ({ offset, signal }) => {
      if (signal.aborted) return [];
      if (offset !== undefined) {
        while (cursor < updates.length && getUpdateId(updates[cursor]) < offset) {
          cursor += 1;
        }
      }
      const batch = cursor < updates.length ? [updates[cursor]] : [];
      cursor += batch.length;
      return batch;
    },
  });

  return {
    stop: (): Promise<void> => transport.stop(),
  };
}
