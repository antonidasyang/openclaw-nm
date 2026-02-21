import type { WeChatSubscriptionNotify } from "./types.js";

/** Connection mode for WeChat service */
export type WeChatConnectionMode = "webhook" | "websocket";

/** Base transport interface for WeChat communication */
export interface WeChatTransport {
  /** Connection mode */
  readonly mode: WeChatConnectionMode;

  /** Connect to the service */
  connect(opts: { onMessage: (notify: WeChatSubscriptionNotify) => void }): Promise<void>;

  /** Disconnect from the service */
  disconnect(): Promise<void>;

  /** Check if connected */
  isConnected(): boolean;
}

/** Configuration for WeChat transport */
export type WeChatTransportConfig = {
  /** API base URL (for HTTP/WebSocket) */
  baseUrl: string;
  /** JWT bearer token */
  jwtToken: string;
  /** WeChat client ID (bot's wxid) */
  wcId: string;
  /** Connection mode */
  mode?: WeChatConnectionMode;
  /** Webhook URL (only for webhook mode when client is receiving pushes) */
  webhookUrl?: string;
  /** Secret for webhook verification (optional) */
  webhookSecret?: string;
  /** WebSocket connection options (for future use) */
  wsOptions?: {
    /** Reconnect interval in milliseconds */
    reconnectIntervalMs?: number;
    /** Heartbeat interval in milliseconds */
    heartbeatIntervalMs?: number;
    /** Maximum reconnect attempts */
    maxReconnectAttempts?: number;
  };
};
