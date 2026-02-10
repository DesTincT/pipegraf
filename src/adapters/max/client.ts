import { Bot } from '@maxhub/max-bot-api';

export interface CreateMaxBotApiOptions {
  token: string;
}

export function createMaxBotApi({ token }: CreateMaxBotApiOptions) {
  const bot = new Bot(token);
  return bot.api;
}
