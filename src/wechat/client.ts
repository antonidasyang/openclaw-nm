import type { WeChatApiResponse, WeChatSendMessageRequest } from "./types.js";
import { formatErrorMessage } from "../infra/errors.js";

/** WeChat API client for calling external WeChat robot service */
export class WeChatClient {
  private baseUrl: string;
  private jwtToken: string;
  private readonly wcId: string;
  private readonly maxRetries: number;

  constructor(opts: { baseUrl: string; jwtToken: string; wcId: string; maxRetries?: number }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.jwtToken = opts.jwtToken;
    this.wcId = opts.wcId;
    this.maxRetries = opts.maxRetries ?? 5;
  }

  /** Sleep for retry delay */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Send text message with retry */
  async sendTextMessage(receiver: string, message: string): Promise<void> {
    const payload: WeChatSendMessageRequest = {
      wId: this.wcId,
      wcId: receiver,
      msg: message,
    };

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.request<unknown>("/wechat/send_message", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (response.successful) {
          return;
        }

        // If not successful, store error and retry
        lastError = new Error(`WeChat send failed: ${response.message || "Unknown error"}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      // Wait before retry (exponential backoff: 1s, 2s, 4s, ...)
      if (attempt < this.maxRetries) {
        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }

    throw lastError || new Error("WeChat send failed: max retries exceeded");
  }

  /** Send image(s) */
  async sendImages(
    receiver: string,
    images: Blob[],
  ): Promise<WeChatApiResponse<Array<{ originalName: string; storeName: string }>>> {
    const formData = new FormData();
    for (const image of images) {
      formData.append("images", image);
    }
    formData.append("wcId", this.wcId);
    formData.append("receiver", receiver);

    return this.request("/wechat/send_images", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  /** Send file(s) */
  async sendFiles(
    receiver: string,
    files: Blob[],
  ): Promise<WeChatApiResponse<Array<{ originalName: string; storeName: string }>>> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("wcId", this.wcId);
    formData.append("receiver", receiver);

    return this.request("/wechat/send_files", {
      method: "POST",
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  /** Get WeChat user list */
  async getWechatList(): Promise<WeChatApiResponse<WeChatUser[]>> {
    return this.request("/wechat/list", {
      method: "GET",
    });
  }

  /** Create subscription for webhook notification */
  async createSubscription(opts: {
    fromUsers?: string[];
    fromGroups?: string[];
    keyword?: string;
    webhookUrl: string;
    messageTypes?: string[];
  }): Promise<WeChatApiResponse<{ id: string }>> {
    const payload = {
      wechatUserId: this.wcId,
      ...(opts.fromUsers ? { fromUsers: opts.fromUsers } : {}),
      ...(opts.fromGroups ? { fromGroups: opts.fromGroups } : {}),
      ...(opts.keyword ? { keyword: opts.keyword } : {}),
      replyType: 3, // RT_NOTIFY - push to webhook
      content: opts.webhookUrl,
      ...(opts.messageTypes ? { messageTypes: opts.messageTypes } : {}),
    };

    return this.request("/subscription/save", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /** Delete subscription */
  async deleteSubscription(subscriptionId: string): Promise<WeChatApiResponse<void>> {
    return this.request(`/subscription/delete/${subscriptionId}`, {
      method: "DELETE",
    });
  }

  /** Get subscriptions */
  async getSubscriptions(): Promise<WeChatApiResponse<WeChatSubscription[]>> {
    return this.request("/subscription/list", {
      method: "GET",
    });
  }

  /** Generic API request method */
  private async request<T>(
    path: string,
    opts: {
      method: string;
      body?: string | FormData;
      headers?: Record<string, string>;
    },
  ): Promise<WeChatApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: this.jwtToken,
      ...opts.headers,
    };

    try {
      const response = await fetch(url, {
        method: opts.method,
        headers,
        body: opts.body,
      });

      const data = (await response.json()) as WeChatApiResponse<T>;
      return data;
    } catch (err) {
      throw new Error(`WeChat API request to ${path} failed: ${formatErrorMessage(err)}`, {
        cause: err,
      });
    }
  }
}

/** User info from WeChat list API */
export type WeChatUser = {
  wcId: string;
  wId: string;
  nickname: string;
  platformId: string;
  online: boolean;
  deviceType: string;
  area: string;
  friends: WeChatFriend[];
  chatrooms: WeChatChatroom[];
};

export type WeChatFriend = {
  wxid: string;
  nickname: string;
  remark: string;
};

export type WeChatChatroom = {
  chatroomId: string;
  nickname: string;
};

export type WeChatSubscription = {
  id: string;
  wechatUserId: string;
  fromUsers: string[];
  fromGroups: string[];
  keyword: string;
  replyType: number;
  content: string;
  messageTypes: string[];
};
