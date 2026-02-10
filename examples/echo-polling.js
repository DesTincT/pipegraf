import { Bot, Composer } from '../dist/index.js';

const bot = new Bot({
  sender: async (_ctx, text) => console.log(`reply: ${text}`),
});

bot.use(
  Composer.on('text', async (ctx) => {
    const text = ctx.messageText;
    if (text) {
      await ctx.reply(text);
    }
  }),
);

const controller = bot.startPolling({
  intervalMs: 100,
  getUpdates: async ({ offset, signal }) => {
    if (signal.aborted) return [];
    const updates = [
      { update_id: 1, chat_id: 1, message: { text: 'hello' } },
      { update_id: 2, chat_id: 1, message: { text: 'world' } },
    ];
    let cursor = 0;
    if (offset !== undefined) {
      while (cursor < updates.length && updates[cursor].update_id < offset) cursor += 1;
    }
    const batch = updates.slice(cursor, cursor + 1);
    cursor += batch.length;
    return batch;
  },
});

setTimeout(() => {
  void controller.stop().then(() => {
    console.log('stopped');
  });
}, 1000);
