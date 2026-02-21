import type { WeChatTransport, WeChatTransportConfig } from "../transport.js";
import type { WeChatSubscriptionNotify } from "../types.js";

/**
 * Webhook transport for receiving WeChat messages
 * The WeChat service pushes messages to a configured endpoint
 */
export class WeChatWebhookTransport implements WeChatTransport {
  readonly mode = "webhook" as const;
  private config: WeChatTransportConfig;
  private onMessageCallback?: (notify: WeChatSubscriptionNotify) => void;
  private connected = false;

  constructor(config: WeChatTransportConfig) {
    this.config = config;
  }

  /** In webhook mode, "connecting" means registering the webhook URL with the WeChat service */
  async connect(opts: { onMessage: (notify: WeChatSubscriptionNotify) => void }): Promise<void> {
    this.onMessageCallback = opts.onMessage;
    this.connected = true;
    // The actual webhook registration is done via the subscription API
    // This transport just stores the callback to be used by the webhook handler
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.onMessageCallback = undefined;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Handle incoming webhook message (called by webhook handler) */
  handleWebhookMessage(notify: WeChatSubscriptionNotify): void {
    if (this.onMessageCallback && this.connected) {
      this.onMessageCallback(notify);
    }
  }

  /** Get the webhook URL to register with the WeChat service */
  getWebhookUrl(): string {
    return this.config.webhookUrl ?? "";
  }

  /** Verify webhook secret if configured */
  verifySecret(providedSecret?: string): boolean {
    if (!this.config.webhookSecret) {
      return true; // No verification required
    }
    return providedSecret === this.config.webhookSecret;
  }
}
