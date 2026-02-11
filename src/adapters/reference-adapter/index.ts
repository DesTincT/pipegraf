import type { Adapter, AdapterContext, CommandResult } from '../../core/contracts.js';
import { getNestedRecord, getNumber, isRecord } from '../../utils/index.js';

export type ReferenceAdapterReply = (ctx: { update: unknown }, text: string, extra?: unknown) => Promise<unknown>;

function getMessage(update: unknown): Record<string, unknown> | undefined {
  return getNestedRecord(update, 'message');
}

function getCallbackQuery(update: unknown): Record<string, unknown> | undefined {
  return getNestedRecord(update, 'callback_query');
}

function getInlineQuery(update: unknown): Record<string, unknown> | undefined {
  return getNestedRecord(update, 'inline_query');
}

function getMessageTextFromUpdate(update: unknown): string | undefined {
  const msg = getMessage(update);
  if (!msg) return undefined;
  const text = msg['text'];
  return typeof text === 'string' ? text : undefined;
}

function getCallbackDataFromUpdate(update: unknown): string | undefined {
  const cq = getCallbackQuery(update);
  if (!cq) return undefined;

  const payload = cq['payload'];
  if (typeof payload === 'string') return payload;
  if (isRecord(payload)) {
    const action = payload['action'];
    if (typeof action === 'string') return action;
  }

  const data = cq['data'];
  return typeof data === 'string' ? data : undefined;
}

function getCommandFromUpdate(update: unknown): CommandResult | undefined {
  const text = getMessageTextFromUpdate(update);
  if (text === undefined) return undefined;
  if (!text.startsWith('/')) return undefined;

  const tokenEnd = text.search(/\s/);
  const token = tokenEnd === -1 ? text : text.slice(0, tokenEnd);
  const raw = token.slice(1);
  if (!raw) return undefined;

  const [name] = raw.split('@', 1);
  if (!name) return undefined;

  const payload = tokenEnd === -1 ? '' : text.slice(tokenEnd).trim();
  return { name, payload };
}

function getChatIdFromUpdate(update: unknown): number | undefined {
  if (!isRecord(update)) return undefined;

  const direct = getNumber(update['chat_id']);
  if (direct !== undefined) return direct;

  const message = getMessage(update);
  if (!isRecord(message)) return undefined;

  const recipient = message['recipient'];
  if (!isRecord(recipient)) return undefined;

  const chatId = recipient['chat_id'];
  return getNumber(chatId);
}

function getUserIdFromUpdate(update: unknown): number | undefined {
  if (!isRecord(update)) return undefined;

  const direct = getNumber(update['user_id']);
  if (direct !== undefined) return direct;

  const user = update['user'];
  if (isRecord(user)) {
    const fromUser = getNumber(user['user_id']);
    if (fromUser !== undefined) return fromUser;
  }

  const message = getMessage(update);
  if (!isRecord(message)) return undefined;

  const sender = message['sender'];
  if (!isRecord(sender)) return undefined;

  return getNumber(sender['user_id']);
}

function getUpdateIdFromUpdate(update: unknown): number | string | undefined {
  if (!isRecord(update)) return undefined;
  const value = update['update_id'];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return undefined;
}

export function createReferenceAdapter(reply: ReferenceAdapterReply): Adapter {
  return {
    createContext(update: unknown): AdapterContext {
      const messageText = getMessageTextFromUpdate(update);
      const callbackData = getCallbackDataFromUpdate(update);
      const command = getCommandFromUpdate(update);
      const chatId = getChatIdFromUpdate(update);
      const userId = getUserIdFromUpdate(update);

      return {
        update,
        messageText,
        callbackData,
        command,
        chatId,
        userId,
        message: getMessage(update),
        callbackQuery: getCallbackQuery(update),
        inlineQuery: getInlineQuery(update),
      };
    },

    reply(ctx, text, extra) {
      return reply(ctx, text, extra);
    },

    getUpdateId: getUpdateIdFromUpdate,
    getMessageText: getMessageTextFromUpdate,
    getCommand: getCommandFromUpdate,
    getCallbackData: getCallbackDataFromUpdate,
    getChatId: getChatIdFromUpdate,
    getUserId: getUserIdFromUpdate,
  };
}
