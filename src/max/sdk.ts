import type { Message, Update } from '@maxhub/max-bot-api/types';

export type MaxBotApi = {
  sendMessageToChat: (chatId: number, text: string) => Promise<Message>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
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

export type ReplyTarget = {
  chatId: number;
};

export function getReplyTargetFromUpdate(update: unknown): ReplyTarget | undefined {
  const chatId = getChatIdFromUpdate(update);
  if (chatId === undefined) return undefined;
  return { chatId };
}

export type SendReplyParams = {
  target: ReplyTarget;
  text: string;
};

export async function sendReply(api: MaxBotApi, { target, text }: SendReplyParams): Promise<Message> {
  return await api.sendMessageToChat(target.chatId, text);
}

// Compile-time guard: keep aligned with official SDK types.
export type _MaxSdkUpdate = Update;

