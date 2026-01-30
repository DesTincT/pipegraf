import { Bot } from '@maxhub/max-bot-api';

import type { MaxBotApi } from './sdk.js';

export type CreateMaxBotApiOptions = {
  token: string;
};

export function createMaxBotApi({ token }: CreateMaxBotApiOptions): MaxBotApi {
  const bot = new Bot(token);
  return bot.api;
}

