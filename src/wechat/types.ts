import type { DmPolicy, GroupPolicy } from "../config/types.base.js";
import type {
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
} from "../config/types.tools.js";
import type { WeChatConnectionMode } from "./transport.js";

/** WeChat message type mapping */
export type WeChatMessageType =
  | 1 // private text
  | 3 // private image
  | 5 // group text
  | 7 // group image
  | 34 // voice
  | 43 // video
  | 47 // emoji
  | 49 // link
  | 62 // video
  | 2006; // file

/** Webhook notification message from WeChat service */
export type WeChatWebhookMessage = {
  messageType: number;
  wcId: string;
  account: string;
  data: WeChatMessageData;
};

export type WeChatMessageData = {
  content?: string;
  fromUser?: string;
  fromGroup?: string;
  nickName?: string;
  self?: boolean;
  atlist?: string[];
  timestamp?: number;
  url?: string;
  thumbUrl?: string;
  filename?: string;
  filesize?: number;
  duration?: number;
};

/** Subscription notification payload (replyType: 3) */
export type WeChatSubscriptionNotify = {
  message: WeChatWebhookMessage;
  keyword?: string;
};

/** Send message request */
export type WeChatSendMessageRequest = {
  wId: string; // 机器人 ID
  wcId: string; // 收件人 ID
  msg: string; // 消息内容
};

/** API response wrapper */
export type WeChatApiResponse<T = unknown> = {
  successful: boolean;
  result?: T;
  message?: string;
};

/** Parsed message context for OpenClaw */
export type WeChatMessageContext = {
  messageType: WeChatMessageType;
  wcId: string;
  account: string;
  fromUser?: string;
  fromGroup?: string;
  content?: string;
  nickName?: string;
  self?: boolean;
  atlist?: string[];
  chatType: "direct" | "group";
  url?: string;
  thumbUrl?: string;
  filename?: string;
  filesize?: number;
  duration?: number;
};

/** WeChat account configuration */
export type WeChatAccountConfig = {
  /** Optional display name for this account */
  name?: string;
  /** Optional provider capability tags used for agent/runtime guidance. */
  capabilities?: string[];
  /** If false, do not start this WeChat account. Default: true. */
  enabled?: boolean;
  /**
   * WeChat robot service API base URL.
   * Example: http://localhost:50000
   */
  apiUrl: string;
  /**
   * JWT Bearer token for API authentication.
   * Get this by calling POST /user/validate with your CAS ticket.
   */
  jwtToken: string;
  /**
   * WeChat client ID (the bot's own wxid).
   * This identifies which WeChat account sends messages.
   */
  wcId: string;
  /**
   * Default receiver for sending messages.
   * Can be a user wxid (wxid_*) or a group chatroom (*@chatroom).
   * Can be overridden per request.
   */
  receiver?: string;
  /**
   * Connection mode for receiving messages.
   * - "webhook" (default): WeChat service pushes messages to a webhook endpoint
   * - "websocket": OpenClaw connects to WeChat service via WebSocket
   */
  connectionMode?: WeChatConnectionMode;
  /**
   * Optional secret for webhook verification (only used in webhook mode).
   * If set, X-WeChat-Secret header must match this value.
   */
  webhookSecret?: string;
  /**
   * Webhook URL to register with the WeChat service (only used in webhook mode).
   * Defaults to http://localhost:3000/webhooks/wechat if not specified.
   */
  webhookUrl?: string;
  /** DM allowlist (wxid strings). */
  allowFrom?: string[];
  /** Optional allowlist for WeChat group senders (chatroomId strings). */
  groupAllowFrom?: string[];
  /**
   * Controls how WeChat direct chats (DMs) are handled:
   * - "allowlist" (default): only allow senders in allowFrom
   * - "open": allow all inbound DMs (requires allowFrom to include "*")
   * - "disabled": ignore all inbound DMs
   */
  dmPolicy?: DmPolicy;
  /**
   * Controls how group messages are handled:
   * - "open": groups bypass allowFrom, only mention-gating applies
   * - "disabled": block all group messages entirely
   * - "allowlist" (default): only allow group messages from senders in groupAllowFrom
   */
  groupPolicy?: GroupPolicy;
  /** Whether to require @mention in groups to trigger responses. */
  requireMentionInGroups?: boolean;
  /** Max group messages to keep as history context (0 disables). */
  historyLimit?: number;
  /** Max DM turns to keep as history context. */
  dmHistoryLimit?: number;
  /** Per-group configuration overrides. */
  groups?: Record<string, WeChatGroupConfig>;
  /**
   * Max retry attempts for sending messages (default: 5).
   * Set to 0 to disable retries.
   */
  sendMaxRetries?: number;
  /**
   * WebSocket reconnection options (only used in websocket mode).
   */
  wsReconnect?: {
    /** Reconnect interval in milliseconds (default: 5000) */
    intervalMs?: number;
    /** Maximum reconnect attempts before giving up (default: 10) */
    maxAttempts?: number;
    /** Heartbeat interval in milliseconds (default: 30000) */
    heartbeatMs?: number;
  };
};

export type WeChatGroupConfig = {
  requireMention?: boolean;
  /** Per-group override for group message policy (open|disabled|allowlist). */
  groupPolicy?: GroupPolicy;
  /** Optional tool policy overrides for this group. */
  tools?: GroupToolPolicyConfig;
  /** Per-sender tool policy in groups. */
  toolsBySender?: GroupToolPolicyBySenderConfig;
  /** If false, disable the bot for this group. */
  enabled?: boolean;
  /** Optional allowlist for group senders (wxid strings). */
  allowFrom?: string[];
  /** Optional system prompt snippet for this group. */
  systemPrompt?: string;
};

/** WeChat channel configuration */
export type WeChatConfig = {
  /** Optional per-account WeChat configuration (multi-account). */
  accounts?: Record<string, WeChatAccountConfig>;
} & WeChatAccountConfig;

/** Resolved WeChat account (after config parsing) */
export type ResolvedWeChatAccount = {
  /** Unique account identifier */
  accountId: string;
  /** Display name */
  name?: string;
  /** Whether enabled */
  enabled: boolean;
  /** API base URL */
  apiUrl: string;
  /** JWT token */
  jwtToken: string;
  /** WeChat client ID */
  wcId: string;
  /** Default receiver */
  receiver?: string;
  /** Connection mode */
  connectionMode: WeChatConnectionMode;
  /** Webhook URL (only used in webhook mode) */
  webhookUrl?: string;
  /** Webhook secret */
  webhookSecret?: string;
  /** DM allowlist */
  allowFrom?: string[];
  /** Group allowlist */
  groupAllowFrom?: string[];
  /** DM policy */
  dmPolicy: DmPolicy;
  /** Group policy */
  groupPolicy: GroupPolicy;
  /** Require mention in groups */
  requireMentionInGroups?: boolean;
  /** History limit */
  historyLimit: number;
  /** DM history limit */
  dmHistoryLimit: number;
  /** Groups configuration */
  groups?: Record<string, WeChatGroupConfig>;
  /** Max retry attempts for sending messages (default: 5) */
  sendMaxRetries: number;
  /** WebSocket reconnection options (only used in websocket mode) */
  wsReconnect?: {
    intervalMs: number;
    maxAttempts: number;
    heartbeatMs: number;
  };
};

/** WeChat channel data stored in runtime state */
export type WeChatChannelData = {
  accountId: string;
  wcId: string;
  webhookUrl?: string;
  subscriptionId?: string;
  connectedAt?: number;
  lastMessageAt?: number;
};

/** Result of sending a message via WeChat */
export type WeChatSendResult = {
  messageId: string;
  chatId: string;
};
