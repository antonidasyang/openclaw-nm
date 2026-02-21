import type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
  MarkdownConfig,
  OutboundRetryConfig,
} from "./types.base.js";
import type { DmConfig } from "./types.messages.js";
import type { GroupToolPolicyBySenderConfig, GroupToolPolicyConfig } from "./types.tools.js";

export type WeChatActionConfig = {
  // Reserved for future action configurations
};

export type WeChatAccountConfig = {
  /** Optional display name for this account (used in CLI/UI lists). */
  name?: string;
  /** Optional provider capability tags used for agent/runtime guidance. */
  capabilities?: string[];
  /** Markdown formatting overrides (tables). */
  markdown?: MarkdownConfig;
  /**
   * Controls how WeChat direct chats (DMs) are handled:
   * - "allowlist" (default): only allow senders in allowFrom
   * - "open": allow all inbound DMs (requires allowFrom to include "*")
   * - "disabled": ignore all inbound DMs
   */
  dmPolicy?: DmPolicy;
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
   * WeChat Bot ID (机器人的微信ID).
   * This is the bot's own WeChat ID (starts with wxid_).
   * Maps to the 'wId' parameter in the send API.
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
  connectionMode?: "webhook" | "websocket";
  /**
   * Webhook URL to register with the WeChat service (only used in webhook mode).
   * Defaults to http://localhost:3000/webhooks/wechat if not specified.
   */
  webhookUrl?: string;
  /**
   * Optional secret for webhook verification.
   * If set, X-WeChat-Secret header must match this value.
   */
  webhookSecret?: string;
  /** DM allowlist (wxid strings). */
  allowFrom?: string[];
  /** Optional allowlist for WeChat group senders (chatroomId strings). */
  groupAllowFrom?: string[];
  /**
   * Controls how group messages are handled:
   * - "open": groups bypass allowFrom, only mention-gating applies
   * - "disabled": block all group messages entirely
   * - "allowlist" (default): only allow group messages from senders in groupAllowFrom
   */
  groupPolicy?: GroupPolicy;
  /** Max group messages to keep as history context (0 disables). */
  historyLimit?: number;
  /** Max DM turns to keep as history context. */
  dmHistoryLimit?: number;
  /** Per-DM config overrides keyed by user ID. */
  dms?: Record<string, DmConfig>;
  /** Outbound text chunk size (chars). Default: 4000. */
  textChunkLimit?: number;
  /** Disable block streaming for this account. */
  blockStreaming?: boolean;
  /** Merge streamed block replies before sending. */
  blockStreamingCoalesce?: BlockStreamingCoalesceConfig;
  /** Retry policy for outbound WeChat API calls. */
  retry?: OutboundRetryConfig;
  /**
   * Max retry attempts for sending messages (default: 5).
   * Set to 0 to disable retries.
   */
  sendMaxRetries?: number;
  /** Optional tool policy overrides for groups. */
  tools?: GroupToolPolicyConfig;
  /** Per-sender tool policy in groups. */
  toolsBySender?: GroupToolPolicyBySenderConfig;
  /**
   * Whether to require @mention in groups to trigger responses.
   * Default: true (require @bot to respond in groups).
   */
  requireMentionInGroups?: boolean;
  /** Per-group configuration overrides. */
  groups?: Record<string, WeChatGroupConfig>;
  /** Per-action tool gating (default: true for all). */
  actions?: WeChatActionConfig;
  /**
   * Per-channel outbound response prefix override.
   */
  responsePrefix?: string;
  /**
   * WebSocket reconnection options (only used in websocket mode).
   */
  wsReconnect?: {
    /** Reconnect interval in milliseconds (default: 5000). */
    intervalMs?: number;
    /** Maximum reconnect attempts before giving up (default: 10). */
    maxAttempts?: number;
    /** Heartbeat interval in milliseconds (default: 30000). */
    heartbeatMs?: number;
  };
};

export type WeChatGroupConfig = {
  requireMention?: boolean;
  /** Per-group override for group message policy (open|disabled|allowlist). */
  groupPolicy?: GroupPolicy;
  /** Optional tool policy overrides for this group. */
  tools?: GroupToolPolicyConfig;
  toolsBySender?: GroupToolPolicyBySenderConfig;
  /** If false, disable the bot for this group. */
  enabled?: boolean;
  /** Optional allowlist for group senders (wxid strings). */
  allowFrom?: string[];
  /** Optional system prompt snippet for this group. */
  systemPrompt?: string;
};

export type WeChatConfig = {
  /** Optional per-account WeChat configuration (multi-account). */
  accounts?: Record<string, WeChatAccountConfig>;
} & WeChatAccountConfig;
