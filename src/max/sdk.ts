import type { Message, Update } from '@maxhub/max-bot-api/types';
import { getNumber, isRecord } from '../utils/index.js';

export interface MaxBotApi {
  sendMessageToChat: (chatId: number, text: string, extra?: Record<string, unknown>) => Promise<Message>;
}

function asExtra(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  if (Array.isArray(value)) return undefined;
  return value;
}

// Verified from @maxhub/max-bot-api Update types:
// - many updates include top-level `chat_id: number`
// - message updates include `message.recipient.chat_id: number | null`
export function getChatIdFromUpdate(update: unknown): number | undefined {
  if (!isRecord(update)) return undefined;

  const direct = getNumber(update['chat_id']);
  if (direct !== undefined) return direct;

  const message = update['message'];
  if (!isRecord(message)) return undefined;

  const recipient = message['recipient'];
  if (!isRecord(recipient)) return undefined;

  const chatId = recipient['chat_id'];
  return getNumber(chatId);
}

export interface ReplyTarget {
  chatId: number;
}

export function getReplyTargetFromUpdate(update: unknown): ReplyTarget | undefined {
  const chatId = getChatIdFromUpdate(update);
  if (chatId === undefined) return undefined;
  return { chatId };
}

export interface SendReplyParams {
  target: ReplyTarget;
  text: string;
  extra?: unknown;
}

export async function sendReply(api: MaxBotApi, { target, text, extra }: SendReplyParams): Promise<Message> {
  return await api.sendMessageToChat(target.chatId, text, asExtra(extra));
}

// Compile-time guard: keep aligned with official SDK types.
export type _MaxSdkUpdate = Update;
