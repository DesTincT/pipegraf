import { Composer, Maxgraf } from '../dist/index.js';

const bot = new Maxgraf({
  sender: async (_ctx, text) => {
    // Transport-provided sender goes here; example just logs.
    console.log(`reply: ${text}`);
  },
});

bot.use(
  Composer.on('text', async (ctx) => {
    const text = ctx.messageText;
    if (text) {
      await ctx.reply(text);
    }
  }),
);

const updates = [
  { update_id: 1, message: { text: 'hello' } },
  { update_id: 2, message: { text: 'world' } },
];

let cursor = 0;

const controller = bot.startPolling({
  intervalMs: 100,
  getUpdates: async ({ offset, signal }) => {
    if (signal.aborted) return [];

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
