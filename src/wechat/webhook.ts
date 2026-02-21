import type { Request, Response, NextFunction } from "express";
import type { RuntimeEnv } from "../runtime.js";
import type { WeChatWebhookTransport } from "./transport/webhook.js";
import type { WeChatSubscriptionNotify } from "./types.js";
import { defaultRuntime } from "../runtime.js";

/** Options for WeChat webhook middleware */
export interface WeChatWebhookOptions {
  /** Secret token to verify webhook requests (optional) */
  secret?: string;
  /** Transport instance for handling messages */
  transport: WeChatWebhookTransport;
  /** Runtime logger */
  runtime?: RuntimeEnv;
}

/**
 * Create Express middleware for WeChat webhook
 * Handles POST requests from WeChat robot service (subscription replyType: 3)
 */
export function createWeChatWebhookMiddleware(
  options: WeChatWebhookOptions,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { secret, transport, runtime = defaultRuntime } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Verify secret if configured
      if (secret) {
        const providedSecret = req.headers["x-wechat-secret"];
        if (providedSecret !== secret) {
          runtime.log?.("wechat: webhook secret validation failed");
          res.status(401).json({ error: "Invalid secret" });
          return;
        }
      }

      // Parse request body
      let notify: WeChatSubscriptionNotify;
      try {
        notify = req.body as WeChatSubscriptionNotify;
      } catch {
        res.status(400).json({ error: "Invalid JSON body" });
        return;
      }

      // Validate basic structure
      if (!notify.message || typeof notify.message !== "object") {
        res.status(400).json({ error: "Missing message object" });
        return;
      }

      const { message } = notify;
      if (!message.messageType || !message.wcId || !message.account) {
        res.status(400).json({ error: "Invalid message format" });
        return;
      }

      // Log received message
      const chatType = message.data?.fromGroup ? "group" : "direct";
      const content = message.data?.content ?? "";
      const sender = message.data?.nickName ?? message.data?.fromUser ?? message.account;
      runtime.log?.(
        `wechat: received ${chatType} message from ${sender}: ${content.slice(0, 50)}${content.length > 50 ? "..." : ""}`,
      );

      // Respond immediately (async processing)
      res.status(200).json({ status: "ok" });

      // Forward message to transport
      transport.handleWebhookMessage(notify);
    } catch (err) {
      runtime.error?.(`wechat webhook error: ${String(err)}`);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}

/**
 * Start WeChat webhook - returns path and handler for Express registration
 */
export interface StartWeChatWebhookOptions {
  /** Transport instance */
  transport: WeChatWebhookTransport;
  /** Secret for webhook verification (optional) */
  secret?: string;
  /** Webhook path (default: /webhooks/wechat) */
  path?: string;
  /** Runtime logger */
  runtime?: RuntimeEnv;
}

export function startWeChatWebhook(options: StartWeChatWebhookOptions): {
  path: string;
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
} {
  const path = options.path ?? "/webhooks/wechat";
  const handler = createWeChatWebhookMiddleware({
    secret: options.secret,
    transport: options.transport,
    runtime: options.runtime,
  });

  return { path, handler };
}
