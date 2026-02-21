import type { OpenClawConfig } from "../config/config.js";
import type { WeChatSendResult } from "./types.js";
import type { ResolvedWeChatAccount } from "./types.js";
import { resolveWeChatAccount } from "./accounts.js";
import { WeChatClient } from "./client.js";

export type WeChatSendOpts = {
  accountId?: string;
};

/**
 * Send text message via WeChat API
 */
export async function sendWeChatText(
  cfg: OpenClawConfig,
  to: string,
  text: string,
  opts: WeChatSendOpts = {},
): Promise<WeChatSendResult> {
  const account = resolveWeChatAccount({ cfg, accountId: opts.accountId });
  const targetReceiver = to || account.receiver || account.wcId;

  const client = new WeChatClient({
    baseUrl: account.apiUrl,
    jwtToken: account.jwtToken,
    wcId: account.wcId,
    maxRetries: account.sendMaxRetries,
  });

  await client.sendTextMessage(targetReceiver, text);

  // Return a result similar to TelegramSendResult
  return {
    messageId: `wx-${Date.now()}`,
    chatId: targetReceiver,
  };
}

/**
 * Send image(s) via WeChat API
 */
export async function sendWeChatImages(
  cfg: OpenClawConfig,
  to: string,
  images: Blob[],
  opts: WeChatSendOpts = {},
): Promise<WeChatSendResult> {
  const account = resolveWeChatAccount({ cfg, accountId: opts.accountId });
  const targetReceiver = to || account.receiver || account.wcId;

  const client = new WeChatClient({
    baseUrl: account.apiUrl,
    jwtToken: account.jwtToken,
    wcId: account.wcId,
    maxRetries: account.sendMaxRetries,
  });

  await client.sendImages(targetReceiver, images);

  return {
    messageId: `wx-img-${Date.now()}`,
    chatId: targetReceiver,
  };
}

/**
 * Send file(s) via WeChat API
 */
export async function sendWeChatFiles(
  cfg: OpenClawConfig,
  to: string,
  files: Blob[],
  opts: WeChatSendOpts = {},
): Promise<WeChatSendResult> {
  const account = resolveWeChatAccount({ cfg, accountId: opts.accountId });
  const targetReceiver = to || account.receiver || account.wcId;

  const client = new WeChatClient({
    baseUrl: account.apiUrl,
    jwtToken: account.jwtToken,
    wcId: account.wcId,
    maxRetries: account.sendMaxRetries,
  });

  await client.sendFiles(targetReceiver, files);

  return {
    messageId: `wx-file-${Date.now()}`,
    chatId: targetReceiver,
  };
}
