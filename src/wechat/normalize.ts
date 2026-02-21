import type { WeChatMessageContext, WeChatWebhookMessage } from "./types.js";

/**
 * Parse WeChat webhook message into OpenClaw message context
 */
export function parseWeChatMessage(message: WeChatWebhookMessage): WeChatMessageContext {
  const { messageType, wcId, account, data } = message;

  // Determine chat type based on messageType and data
  const isGroup = Boolean(data.fromGroup || (messageType >= 5 && messageType % 2 === 1));

  return {
    messageType: messageType as WeChatMessageContext["messageType"],
    wcId,
    account,
    fromUser: data.fromUser,
    fromGroup: data.fromGroup,
    content: data.content,
    nickName: data.nickName,
    self: data.self ?? false,
    atlist: data.atlist ?? [],
    chatType: isGroup ? "group" : "direct",
    url: data.url,
    thumbUrl: data.thumbUrl,
    filename: data.filename,
    filesize: data.filesize,
    duration: data.duration,
  };
}

/**
 * Convert WeChat message context to OpenClaw MsgContext format
 */
export function toMsgContext(
  wechat: WeChatMessageContext,
  wcId: string,
): {
  channel: string;
  from: string;
  to: string;
  content: string;
  chatType: string;
  senderName?: string;
  replyToId?: string;
  messageThreadId?: string;
  messageType?: string;
  self?: string;
} {
  const chatType = wechat.chatType === "group" ? "group" : "direct";

  return {
    channel: "wechat",
    from: wechat.fromUser || wechat.account,
    to: wechat.fromGroup || wcId,
    content: wechat.content ?? "",
    chatType,
    senderName: wechat.nickName,
    replyToId: undefined,
    messageThreadId: wechat.fromGroup,
    messageType: String(wechat.messageType),
    self: String(wechat.self),
  };
}

/**
 * Check if message is a text message
 */
export function isTextMessage(messageType: number): boolean {
  return messageType === 1 || messageType === 5;
}

/**
 * Check if message is an image message
 */
export function isImageMessage(messageType: number): boolean {
  return messageType === 3 || messageType === 7;
}

/**
 * Check if message is a file/document message
 */
export function isFileMessage(messageType: number): boolean {
  return messageType === 6 || messageType === 2006;
}

/**
 * Check if message is a voice message
 */
export function isVoiceMessage(messageType: number): boolean {
  return messageType === 34;
}

/**
 * Check if message is a video message
 */
export function isVideoMessage(messageType: number): boolean {
  return messageType === 43 || messageType === 62;
}

/**
 * Get message type label
 */
export function getMessageTypeLabel(messageType: number): string {
  switch (messageType) {
    case 1:
      return "private text";
    case 3:
      return "private image";
    case 5:
      return "group text";
    case 7:
      return "group image";
    case 34:
      return "voice";
    case 43:
    case 62:
      return "video";
    case 47:
      return "emoji";
    case 49:
      return "link";
    case 6:
    case 2006:
      return "file";
    default:
      return `type ${messageType}`;
  }
}
