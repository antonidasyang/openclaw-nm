/** WeChat channel integration for OpenClaw
 *
 * This module provides WeChat integration through an external WeChat robot service API.
 * The service supports:
 * - Sending text/image/file messages
 * - Receiving messages via webhook subscriptions (replyType: 3)
 * - Managing subscriptions and monitoring
 *
 * Connection modes:
 * - "webhook" (default): WeChat service pushes messages to a webhook endpoint
 * - "websocket": OpenClaw connects to WeChat service via WebSocket (future)
 *
 * Configuration example:
 * ```yaml
 * channels:
 *   wechat:
 *     apiUrl: http://localhost:50000
 *     jwtToken: "your-jwt-token"
 *     wcId: "wxid_your_bot_id"
 *     receiver: "wxid_target_id"
 *     connectionMode: "webhook"  # or "websocket"
 *     webhookUrl: "http://localhost:3000/webhooks/wechat"
 *     webhookSecret: "optional-secret"
 *     allowFrom: ["wxid_allowed_user"]
 *     dmPolicy: "allowlist"
 *     groupPolicy: "allowlist"
 * ```
 */

export * from "./accounts.js";
export * from "./client.js";
export * from "./normalize.js";
export * from "./plugin.js";
export * from "./send.js";
export * from "./types.js";
export * from "./webhook.js";
export * from "./transport/index.js";
