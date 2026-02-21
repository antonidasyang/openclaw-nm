import type { ChannelAccountSnapshot } from "../channels/plugins/types.js";
import type { OpenClawConfig } from "../config/config.js";
import type { WeChatConnectionMode } from "./transport.js";
import type {
  ResolvedWeChatAccount,
  WeChatAccountConfig,
  WeChatChannelData,
  WeChatConfig,
} from "./types.js";

/** Resolve account from config */
export function resolveWeChatAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedWeChatAccount {
  const { cfg, accountId } = params;
  const channel = cfg.channels?.wechat as WeChatConfig | undefined;

  // Determine which account to use
  const selectedAccountId =
    accountId && channel?.accounts?.[accountId]
      ? accountId
      : channel?.accounts
        ? Object.keys(channel.accounts)[0]
        : undefined;

  const accountConfig = (selectedAccountId && channel?.accounts?.[selectedAccountId]) || channel;

  const apiUrl = accountConfig?.apiUrl?.trim() ?? "";
  const jwtToken = accountConfig?.jwtToken?.trim() ?? "";
  const wcId = accountConfig?.wcId?.trim() ?? "";
  const connectionMode: WeChatConnectionMode = accountConfig?.connectionMode ?? "webhook";

  return {
    accountId: selectedAccountId ?? "default",
    name: accountConfig?.name?.trim(),
    enabled: accountConfig?.enabled !== false,
    apiUrl,
    jwtToken,
    wcId,
    receiver: accountConfig?.receiver?.trim(),
    connectionMode,
    webhookUrl: accountConfig?.webhookUrl?.trim(),
    webhookSecret: accountConfig?.webhookSecret?.trim(),
    allowFrom: accountConfig?.allowFrom ?? [],
    groupAllowFrom: accountConfig?.groupAllowFrom ?? [],
    dmPolicy: accountConfig?.dmPolicy ?? "allowlist",
    groupPolicy: accountConfig?.groupPolicy ?? "allowlist",
    requireMentionInGroups: accountConfig?.requireMentionInGroups,
    historyLimit: accountConfig?.historyLimit ?? 20,
    dmHistoryLimit: accountConfig?.dmHistoryLimit ?? 50,
    sendMaxRetries: accountConfig?.sendMaxRetries ?? 5,
    wsReconnect: {
      intervalMs: accountConfig?.wsReconnect?.intervalMs ?? 5000,
      maxAttempts: accountConfig?.wsReconnect?.maxAttempts ?? 10,
      heartbeatMs: accountConfig?.wsReconnect?.heartbeatMs ?? 30000,
    },
  };
}

/** List all WeChat account IDs */
export function listWeChatAccountIds(cfg: OpenClawConfig): string[] {
  const channel = cfg.channels?.wechat as WeChatConfig | undefined;
  if (!channel) {
    return [];
  }
  if (channel.accounts) {
    return Object.keys(channel.accounts);
  }
  // Single account mode
  if (channel.apiUrl && channel.jwtToken && channel.wcId) {
    return ["default"];
  }
  return [];
}

/** Describe account for status snapshot */
export function describeWeChatAccount(
  account: ResolvedWeChatAccount,
  runtime?: {
    connected?: boolean;
    lastMessageAt?: number;
    error?: string;
  },
): ChannelAccountSnapshot {
  return {
    accountId: account.accountId,
    name: account.name,
    enabled: account.enabled,
    configured: true,
    linked: true,
    running: runtime?.connected ?? false,
    connected: runtime?.connected ?? false,
    lastMessageAt: runtime?.lastMessageAt ?? null,
    lastError: runtime?.error ?? null,
    baseUrl: account.apiUrl,
    // WeChat-specific (in meta)
    wcId: account.wcId,
    receiver: account.receiver,
    allowFrom: account.allowFrom,
  } as ChannelAccountSnapshot;
}
