import type { OpenClawConfig } from "../../../config/config.js";
import type { DmPolicy } from "../../../config/types.js";
import type { WizardPrompter } from "../../../wizard/prompts.js";
import type { ChannelOnboardingAdapter, ChannelOnboardingDmPolicy } from "../onboarding-types.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../../routing/session-key.js";
import { listWeChatAccountIds, resolveWeChatAccount } from "../../../wechat/accounts.js";
import { addWildcardAllowFrom, promptAccountId } from "./helpers.js";

const channel = "wechat" as const;

function setWeChatDmPolicy(cfg: OpenClawConfig, dmPolicy: DmPolicy): OpenClawConfig {
  const allowFrom =
    dmPolicy === "open" ? addWildcardAllowFrom(cfg.channels?.wechat?.allowFrom) : undefined;
  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      wechat: {
        ...cfg.channels?.wechat,
        dmPolicy,
        ...(allowFrom ? { allowFrom } : {}),
      },
    },
  } as OpenClawConfig;
}

async function noteWeChatApiUrlHelp(prompter: WizardPrompter): Promise<void> {
  await prompter.note(
    [
      "Enter your WeChat robot service API base URL.",
      "Example: http://localhost:50000",
      "This is the external WeChat robot service that connects to WeChat.",
      "",
      "Make sure the service is running and accessible from this machine.",
    ].join("\n"),
    "WeChat API URL",
  );
}

async function noteWeChatJwtTokenHelp(prompter: WizardPrompter): Promise<void> {
  await prompter.note(
    [
      "Enter the JWT token for authenticating with the WeChat service.",
      "Get this by calling POST /user/validate with your CAS ticket",
      "at your WeChat robot service API endpoint.",
      "",
      "The token will be used as a Bearer token in API requests.",
    ].join("\n"),
    "WeChat JWT Token",
  );
}

async function noteWeChatWcIdHelp(prompter: WizardPrompter): Promise<void> {
  await prompter.note(
    [
      "Enter your bot's WeChat ID (机器人的微信ID，对应API中的 wId 参数).",
      "This is the bot's own WeChat ID (starts with wxid_).",
      "You can find this in the WeChat service API response or logs.",
      "",
      "Example: wxid_1234567890abcdef",
    ].join("\n"),
    "WeChat Bot ID (wId parameter)",
  );
}

async function promptWeChatAllowFrom(params: {
  cfg: OpenClawConfig;
  prompter: WizardPrompter;
  accountId: string;
}): Promise<OpenClawConfig> {
  const { cfg, prompter, accountId } = params;
  const resolved = resolveWeChatAccount({ cfg, accountId });
  const existingAllowFrom = resolved.allowFrom ?? [];

  await prompter.note(
    [
      "Enter the WeChat IDs (wxid) allowed to send DMs to the bot.",
      "Separate multiple IDs with commas or newlines.",
      "",
      "Example: wxid_user1, wxid_user2",
    ].join("\n"),
    "WeChat allowlist",
  );

  const parseInput = (value: string) =>
    value
      .split(/[\n,;]+/g)
      .map((entry) => entry.trim())
      .filter(Boolean);

  let resolvedIds: string[] = [];
  while (resolvedIds.length === 0) {
    const entry = await prompter.text({
      message: "WeChat allowFrom (wxid strings)",
      placeholder: "wxid_1234567890",
      initialValue: existingAllowFrom[0] ? String(existingAllowFrom[0]) : undefined,
      validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
    });
    resolvedIds = parseInput(String(entry));
  }

  const merged = [
    ...existingAllowFrom.map((item) => String(item).trim()).filter(Boolean),
    ...resolvedIds,
  ];
  const unique = [...new Set(merged)];

  if (accountId === DEFAULT_ACCOUNT_ID) {
    return {
      ...cfg,
      channels: {
        ...cfg.channels,
        wechat: {
          ...((cfg.channels?.wechat as Record<string, unknown>) ?? {}),
          enabled: true,
          dmPolicy: "allowlist",
          allowFrom: unique,
        },
      },
    } as OpenClawConfig;
  }

  return {
    ...cfg,
    channels: {
      ...cfg.channels,
      wechat: {
        ...((cfg.channels?.wechat as Record<string, unknown>) ?? {}),
        enabled: true,
        accounts: {
          ...((cfg.channels?.wechat?.accounts as Record<string, unknown>) ?? {}),
          [accountId]: {
            ...((cfg.channels?.wechat?.accounts?.[accountId] as Record<string, unknown>) ?? {}),
            enabled:
              (cfg.channels?.wechat?.accounts?.[accountId] as Record<string, unknown> | undefined)
                ?.enabled ?? true,
            dmPolicy: "allowlist",
            allowFrom: unique,
          },
        },
      },
    },
  } as OpenClawConfig;
}

async function promptWeChatAllowFromForAccount(params: {
  cfg: OpenClawConfig;
  prompter: WizardPrompter;
  accountId?: string;
}): Promise<OpenClawConfig> {
  const accountIdResolved =
    params.accountId && normalizeAccountId(params.accountId)
      ? (normalizeAccountId(params.accountId) ?? DEFAULT_ACCOUNT_ID)
      : (listWeChatAccountIds(params.cfg)[0] ?? DEFAULT_ACCOUNT_ID);
  return promptWeChatAllowFrom({
    cfg: params.cfg,
    prompter: params.prompter,
    accountId: accountIdResolved,
  });
}

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "WeChat",
  channel,
  policyKey: "channels.wechat.dmPolicy",
  allowFromKey: "channels.wechat.allowFrom",
  getCurrent: (cfg) => cfg.channels?.wechat?.dmPolicy ?? "allowlist",
  setPolicy: (cfg, policy) => setWeChatDmPolicy(cfg, policy),
  promptAllowFrom: promptWeChatAllowFromForAccount,
};

/** Resolve default WeChat account ID */
function resolveDefaultWeChatAccountId(cfg: OpenClawConfig): string {
  const ids = listWeChatAccountIds(cfg);
  return ids[0] ?? DEFAULT_ACCOUNT_ID;
}

export const wechatOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = listWeChatAccountIds(cfg).some((accountId) => {
      const account = resolveWeChatAccount({ cfg, accountId });
      return Boolean(account.apiUrl && account.jwtToken && account.wcId);
    });
    return {
      channel,
      configured,
      statusLines: [`WeChat: ${configured ? "configured" : "needs API URL, JWT token, and wcId"}`],
      selectionHint: configured ? "configured" : "custom WeChat integration",
      quickstartScore: configured ? 5 : 20,
    };
  },
  configure: async ({
    cfg,
    prompter,
    accountOverrides,
    shouldPromptAccountIds,
    forceAllowFrom,
  }) => {
    const wechatOverride = accountOverrides.wechat?.trim();
    const defaultWeChatAccountId = resolveDefaultWeChatAccountId(cfg);
    let wechatAccountId = wechatOverride
      ? normalizeAccountId(wechatOverride)
      : defaultWeChatAccountId;

    if (shouldPromptAccountIds && !wechatOverride) {
      wechatAccountId = await promptAccountId({
        cfg,
        prompter,
        label: "WeChat",
        currentId: wechatAccountId,
        listAccountIds: listWeChatAccountIds,
        defaultAccountId: defaultWeChatAccountId,
      });
    }

    let next = cfg;
    const resolvedAccount = resolveWeChatAccount({ cfg: next, accountId: wechatAccountId });
    const accountConfigured = Boolean(
      resolvedAccount.apiUrl && resolvedAccount.jwtToken && resolvedAccount.wcId,
    );

    let apiUrl: string | null = null;
    let jwtToken: string | null = null;
    let wcId: string | null = null;
    let receiver: string | null = null;

    if (!accountConfigured) {
      await noteWeChatApiUrlHelp(prompter);
    }

    // Prompt for API URL
    const hasApiUrl = Boolean(resolvedAccount.apiUrl);
    if (hasApiUrl) {
      const keep = await prompter.confirm({
        message: "WeChat API URL already configured. Keep it?",
        initialValue: true,
      });
      if (!keep) {
        apiUrl = String(
          await prompter.text({
            message: "Enter WeChat API base URL",
            placeholder: "http://localhost:50000",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
      }
    } else {
      await noteWeChatApiUrlHelp(prompter);
      apiUrl = String(
        await prompter.text({
          message: "Enter WeChat API base URL",
          placeholder: "http://localhost:50000",
          validate: (value) => (value?.trim() ? undefined : "Required"),
        }),
      ).trim();
    }

    // Prompt for JWT token
    const hasJwtToken = Boolean(resolvedAccount.jwtToken);
    if (hasJwtToken) {
      const keep = await prompter.confirm({
        message: "WeChat JWT token already configured. Keep it?",
        initialValue: true,
      });
      if (!keep) {
        await noteWeChatJwtTokenHelp(prompter);
        jwtToken = String(
          await prompter.text({
            message: "Enter WeChat JWT token",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
      }
    } else {
      await noteWeChatJwtTokenHelp(prompter);
      jwtToken = String(
        await prompter.text({
          message: "Enter WeChat JWT token",
          validate: (value) => (value?.trim() ? undefined : "Required"),
        }),
      ).trim();
    }

    // Prompt for wcId
    const hasWcId = Boolean(resolvedAccount.wcId);
    if (hasWcId) {
      const keep = await prompter.confirm({
        message: "WeChat Bot ID (wcId) already configured. Keep it?",
        initialValue: true,
      });
      if (!keep) {
        await noteWeChatWcIdHelp(prompter);
        wcId = String(
          await prompter.text({
            message: "Enter WeChat Bot ID (wcId)",
            placeholder: "wxid_1234567890abcdef",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
      }
    } else {
      await noteWeChatWcIdHelp(prompter);
      wcId = String(
        await prompter.text({
          message: "Enter WeChat Bot ID (wcId)",
          placeholder: "wxid_1234567890abcdef",
          validate: (value) => (value?.trim() ? undefined : "Required"),
        }),
      ).trim();
    }

    // Prompt for optional receiver
    const hasReceiver = Boolean(resolvedAccount.receiver);
    const shouldPromptReceiver = !hasReceiver || accountConfigured;

    if (shouldPromptReceiver) {
      const useDefaultReceiver = await prompter.confirm({
        message: "Set a default receiver for WeChat messages? (optional)",
        initialValue: false,
      });
      if (useDefaultReceiver) {
        await prompter.note(
          [
            "Enter the default receiver WeChat ID.",
            "This can be a user wxid (wxid_*) or a group chatroom (*@chatroom).",
          ].join("\n"),
          "WeChat default receiver",
        );
        receiver = String(
          await prompter.text({
            message: "Enter default receiver (optional)",
            placeholder: "wxid_target_id",
          }),
        ).trim();
      }
    }

    // Build config
    const baseConfig: Record<string, unknown> = {
      enabled: true,
      ...(apiUrl !== null ? { apiUrl } : {}),
      ...(jwtToken !== null ? { jwtToken } : {}),
      ...(wcId !== null ? { wcId } : {}),
      ...(receiver !== null && receiver ? { receiver } : {}),
    };

    if (wechatAccountId === DEFAULT_ACCOUNT_ID) {
      next = {
        ...next,
        channels: {
          ...next.channels,
          wechat: {
            ...((next.channels?.wechat as Record<string, unknown>) ?? {}),
            ...baseConfig,
          },
        },
      } as OpenClawConfig;
    } else {
      next = {
        ...next,
        channels: {
          ...next.channels,
          wechat: {
            ...((next.channels?.wechat as Record<string, unknown>) ?? {}),
            enabled: true,
            accounts: {
              ...((next.channels?.wechat?.accounts as Record<string, unknown>) ?? {}),
              [wechatAccountId]: {
                ...((next.channels?.wechat?.accounts?.[wechatAccountId] as Record<
                  string,
                  unknown
                >) ?? {}),
                ...baseConfig,
              },
            },
          },
        },
      } as OpenClawConfig;
    }

    if (forceAllowFrom) {
      next = await promptWeChatAllowFrom({
        cfg: next,
        prompter,
        accountId: wechatAccountId,
      });
    }

    return { cfg: next, accountId: wechatAccountId };
  },
  dmPolicy,
  disable: (cfg) =>
    ({
      ...cfg,
      channels: {
        ...cfg.channels,
        wechat: { ...((cfg.channels?.wechat as Record<string, unknown>) ?? {}), enabled: false },
      },
    }) as OpenClawConfig,
};
