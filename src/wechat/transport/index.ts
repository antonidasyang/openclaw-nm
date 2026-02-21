import type { WeChatTransport, WeChatTransportConfig } from "../transport.js";
import { WeChatWebhookTransport } from "./webhook.js";
import { WeChatWebSocketTransport } from "./websocket.js";

/**
 * Factory for creating WeChat transport instances
 * Supports both webhook and WebSocket modes
 */
export function createWeChatTransport(config: WeChatTransportConfig): WeChatTransport {
  const mode = config.mode ?? "webhook";

  switch (mode) {
    case "websocket":
      return new WeChatWebSocketTransport(config);
    case "webhook":
    default:
      return new WeChatWebhookTransport(config);
  }
}

export { WeChatTransport, WeChatTransportConfig };
export { WeChatWebhookTransport } from "./webhook.js";
export { WeChatWebSocketTransport } from "./websocket.js";
