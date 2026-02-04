import { describe, expect, it } from 'vitest';

import { Maxgraf } from '../src/core/maxgraf.js';

describe('Maxgraf sugar API', () => {
  it('start/help are aliases for slash commands', async () => {
    const calls: string[] = [];
    const bot = new Maxgraf({ sender: async () => undefined });

    bot.start(async () => {
      calls.push('start');
    });

    bot.help(async () => {
      calls.push('help');
    });

    await bot.handleUpdate({ message: { text: '/start' } });
    await bot.handleUpdate({ message: { text: '/help' } });

    expect(calls).toEqual(['start', 'help']);
  });

  it('Maxgraf.reply returns middleware that calls ctx.reply(text, extra)', async () => {
    const calls: { text: string; extra: unknown }[] = [];
    const extra = { notify: false };

    const bot = new Maxgraf({
      sender: async (_ctx, text, extra2) => {
        calls.push({ text, extra: extra2 });
      },
    });

    bot.use(Maxgraf.reply('hi', extra));

    await bot.handleUpdate({ message: { text: 'anything' } });

    expect(calls).toEqual([{ text: 'hi', extra }]);
  });

  it('hears/command sugar registers Composer routing without importing Composer', async () => {
    const calls: string[] = [];
    const bot = new Maxgraf({ sender: async () => undefined });

    bot.hears('hi', async () => {
      calls.push('hears');
    });

    bot.command('hipster', async () => {
      calls.push('command');
    });

    await bot.handleUpdate({ message: { text: 'hi' } });
    await bot.handleUpdate({ message: { text: '/hipster' } });

    expect(calls).toEqual(['hears', 'command']);
  });
});
