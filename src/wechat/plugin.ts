import type {
  ChannelAccountSnapshot,
  ChannelConfigAdapter,
  ChannelGatewayAdapter,
  ChannelGroupAdapter,
  ChannelOutboundAdapter,
  ChannelPlugin,
} from "../channels/plugins/types.js";
import type { OpenClawConfig } from "../config/config.js";
import type { WeChatSubscriptionNotify } from "./types.js";
import type { ResolvedWeChatAccount } from "./types.js";
import { wechatOnboardingAdapter } from "../channels/plugins/onboarding/wechat.js";
import { describeWeChatAccount, listWeChatAccountIds, resolveWeChatAccount } from "./accounts.js";
import { WeChatClient } from "./client.js";
import { toMsgContext, parseWeChatMessage } from "./normalize.js";
import { sendWeChatText } from "./send.js";

const WECHAT_TEXT_CHUNK_LIMIT = 4000;

/** WeChat channel plugin implementation */
export const wechatPlugin: ChannelPlugin<ResolvedWeChatAccount> = {
  id: "wechat",
  meta: {
    id: "wechat",
    label: "WeChat",
    selectionLabel: "WeChat (Robot API)",
    detailLabel: "WeChat Robot",
    docsPath: "/channels/wechat",
    docsLabel: "wechat",
    blurb: "custom WeChat robot service integration with webhook support.",
    systemImage: "chat.bubble",
    order: 5,
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    media: true,
    reactions: false,
    polls: false,
    edit: false,
    unsend: false,
    reply: false,
    effects: false,
    groupManagement: false,
    threads: false,
    nativeCommands: false,
    blockStreaming: true,
  },

  // Config adapter
  config: {
    listAccountIds: (cfg: OpenClawConfig) => listWeChatAccountIds(cfg),
    resolveAccount: (cfg: OpenClawConfig, accountId?: string | null) =>
      resolveWeChatAccount({ cfg, accountId }),
    isEnabled: (account) => account.enabled,
    isConfigured: (account) => {
      return Boolean(
        account.apiUrl && account.jwtToken && account.wcId && (account.receiver || account.wcId),
      );
    },
    disabledReason: (account) => {
      if (!account.enabled) {
        return "Account is disabled";
      }
      if (!account.apiUrl) {
        return "API URL not configured";
      }
      if (!account.jwtToken) {
        return "JWT token not configured";
      }
      if (!account.wcId) {
        return "WeChat ID not configured";
      }
      return "Not configured";
    },
    describeAccount: (account) => describeWeChatAccount(account),
  },

  // Gateway adapter (for starting/stopping webhook subscriptions)
  gateway: {
    startAccount: async (ctx) => {
      const { account, runtime, cfg } = ctx;
      const client = new WeChatClient({
        baseUrl: account.apiUrl,
        jwtToken: account.jwtToken,
        wcId: account.wcId,
        maxRetries: account.sendMaxRetries,
      });

      // Build webhook URL from Gateway config
      const gwConfig = cfg.gateway ?? {};
      const port = gwConfig.port ?? 18789;
      const bind = gwConfig.bind ?? "loopback";
      const host =
        bind === "loopback"
          ? "127.0.0.1"
          : bind === "custom"
            ? (gwConfig.customBindHost ?? "localhost")
            : "localhost";
      const defaultWebhookUrl = `http://${host}:${port}/webhooks/wechat`;
      const webhookUrl = account.webhookUrl || defaultWebhookUrl;

      // Get existing subscriptions
      const subsResponse = await client.getSubscriptions();
      if (subsResponse.successful && subsResponse.result) {
        // Check if we already have a subscription for this account
        const existingSub = subsResponse.result.find(
          (s) => s.wechatUserId === account.wcId && s.replyType === 3,
        );

        if (existingSub) {
          runtime.log?.(`wechat: subscription exists (${existingSub.id})`);
          // Update webhook URL if it changed
          if (existingSub.content !== webhookUrl) {
            // Only delete if we have a valid subscription ID
            if (existingSub.id) {
              try {
                await client.deleteSubscription(existingSub.id);
                runtime.log?.(
                  `wechat: deleted old subscription ${existingSub.id} to update webhook URL`,
                );
              } catch (err) {
                runtime.log?.(`wechat: failed to delete old subscription: ${String(err)}`);
              }
            }
          } else {
            return;
          }
        }
      }

      try {
        const createResponse = await client.createSubscription({
          // Listen to all messages
          keyword: ".*",
          webhookUrl,
          messageTypes: ["私聊文本", "群文本", "私聊图片", "群图片"],
        });

        if (createResponse.successful && createResponse.result) {
          runtime.log?.(
            `wechat: created subscription ${createResponse.result.id} for ${account.wcId}, webhook: ${webhookUrl}`,
          );
        }
      } catch (err) {
        runtime.error?.(`wechat: failed to create subscription: ${String(err)}`);
        throw err;
      }
    },

    stopAccount: async (ctx) => {
      const { account, runtime } = ctx;
      // Optionally delete subscription when stopping
      // For now, we keep it to avoid losing messages during restarts
      runtime.log?.(`wechat: stopping account ${account.accountId}`);
    },
  },

  // Outbound adapter (for sending messages)
  outbound: {
    deliveryMode: "gateway",
    textChunkLimit: WECHAT_TEXT_CHUNK_LIMIT,
    sendText: async (ctx) => {
      const { cfg, to, text, accountId } = ctx;
      const account = resolveWeChatAccount({ cfg, accountId });
      const receiver = (to ?? account.receiver) || account.wcId;

      const result = await sendWeChatText(cfg, receiver, text, {
        accountId: accountId ?? undefined,
      });

      return {
        channel: "wechat",
        messageId: result.messageId,
        chatId: result.chatId,
        toJid: result.chatId,
      };
    },

    sendMedia: async (ctx) => {
      const { cfg, to, mediaUrl, accountId } = ctx;
      const account = resolveWeChatAccount({ cfg, accountId });
      const receiver = (to ?? account.receiver) || account.wcId;
      const client = new WeChatClient({
        baseUrl: account.apiUrl,
        jwtToken: account.jwtToken,
        wcId: account.wcId,
        maxRetries: account.sendMaxRetries,
      });

      if (!mediaUrl) {
        throw new Error("No media URL provided");
      }

      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentType = blob.type ?? "";

      const messageId = contentType.startsWith("image/")
        ? `wx-img-${Date.now()}`
        : `wx-file-${Date.now()}`;

      // Determine if it's an image or file
      if (contentType.startsWith("image/")) {
        await client.sendImages(receiver, [blob]);
      } else {
        await client.sendFiles(receiver, [blob]);
      }

      return {
        channel: "wechat",
        messageId,
        chatId: receiver,
        toJid: receiver,
      };
    },

    sendPoll: async (ctx) => {
      const { cfg, to, poll, accountId } = ctx;
      const account = resolveWeChatAccount({ cfg, accountId });
      const receiver = (to ?? account.receiver) || account.wcId;

      if (!poll) {
        throw new Error("Poll data is required");
      }

      // Format poll as text
      const pollText = poll.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");

      const result = await sendWeChatText(cfg, receiver, pollText, {
        accountId: accountId ?? undefined,
      });

      return {
        messageId: result.messageId,
        toJid: result.chatId,
      };
    },
  },

  // Group adapter (for mention gating in group chats)
  groups: {
    resolveRequireMention: ({ cfg, accountId }) => {
      const account = resolveWeChatAccount({ cfg, accountId });
      // Check group-specific config or use default
      return account.requireMentionInGroups ?? true;
    },
  },

  // Messaging adapter (for target normalization)
  messaging: {
    normalizeTarget: (raw) => {
      const trimmed = raw?.trim();
      // WeChat IDs can be wxid_*, or chatroom@chatroom format
      if (!trimmed) {
        return undefined;
      }
      return trimmed;
    },
    targetResolver: {
      looksLikeId: (raw) => {
        const trimmed = raw?.trim() ?? "";
        // wxid format or chatroom@chatroom format
        return trimmed.startsWith("wxid_") || trimmed.includes("@chatroom") || trimmed.length >= 6;
      },
      hint: "WeChat ID (wxid_*) or group chat ID (*@chatroom)",
    },
  },

  // Onboarding adapter (for interactive setup)
  onboarding: wechatOnboardingAdapter,
};

/** Message handler for webhook notifications */
export async function handleWeChatWebhookMessage(
  notify: WeChatSubscriptionNotify,
  cfg: OpenClawConfig,
  onMessage: (context: {
    channel: string;
    from: string;
    to: string;
    content: string;
    chatType: string;
    senderName?: string;
    replyToId?: string;
  }) => Promise<void>,
): Promise<void> {
  const parsed = parseWeChatMessage(notify.message);
  const msgContext = toMsgContext(parsed, parsed.wcId);

  // Skip own messages
  if (parsed.self) {
    return;
  }

  await onMessage({
    channel: msgContext.channel,
    from: msgContext.from ?? "",
    to: msgContext.to ?? "",
    content: msgContext.content ?? "",
    chatType: msgContext.chatType ?? "direct",
    senderName: parsed.nickName ?? "",
    replyToId: msgContext.replyToId,
  });
}
