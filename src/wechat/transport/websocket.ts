import type { WeChatTransport, WeChatTransportConfig } from "../transport.js";
import type { WeChatSubscriptionNotify } from "../types.js";

/**
 * WebSocket transport for receiving WeChat messages
 * Connects to the WeChat service and listens for incoming messages
 *
 * NOTE: This is a placeholder implementation for future WebSocket support.
 * The WeChat service needs to expose a WebSocket endpoint for this to work.
 */
export class WeChatWebSocketTransport implements WeChatTransport {
  readonly mode = "websocket" as const;
  private config: WeChatTransportConfig;
  private ws?: WebSocket;
  private onMessageCallback?: (notify: WeChatSubscriptionNotify) => void;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private reconnectAttempts = 0;

  // Default options
  private readonly reconnectIntervalMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly maxReconnectAttempts: number;

  constructor(config: WeChatTransportConfig) {
    this.config = config;
    this.reconnectIntervalMs = config.wsOptions?.reconnectIntervalMs ?? 5000;
    this.heartbeatIntervalMs = config.wsOptions?.heartbeatIntervalMs ?? 30000;
    this.maxReconnectAttempts = config.wsOptions?.maxReconnectAttempts ?? 10;
  }

  async connect(opts: { onMessage: (notify: WeChatSubscriptionNotify) => void }): Promise<void> {
    this.onMessageCallback = opts.onMessage;
    await this.connectWebSocket();
  }

  private async connectWebSocket(): Promise<void> {
    // Convert HTTP URL to WebSocket URL
    const wsUrl = this.config.baseUrl.replace(/^http/, "ws");
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[wechat] WebSocket connected to ${wsUrl}`);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        // Convert WebSocket message to subscription notify format
        const notify: WeChatSubscriptionNotify = this.adaptWebSocketMessage(data);
        if (this.onMessageCallback) {
          this.onMessageCallback(notify);
        }
      } catch (err) {
        console.error("[wechat] Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("[wechat] WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("[wechat] WebSocket disconnected");
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws = ws;
  }

  private adaptWebSocketMessage(data: unknown): WeChatSubscriptionNotify {
    // Adapt the WebSocket message format to the subscription notify format
    // This depends on the actual WebSocket message format from the WeChat service
    return {
      message: data as any, // TODO: Parse based on actual format
      keyword: undefined,
    };
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[wechat] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[wechat] Scheduling reconnect in ${this.reconnectIntervalMs}ms (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket().catch((err) => {
        console.error("[wechat] Reconnect failed:", err);
      });
    }, this.reconnectIntervalMs);
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
