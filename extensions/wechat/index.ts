import type { ChannelPlugin, OpenClawPluginApi } from "../../dist/plugin-sdk/index.js";
import { emptyPluginConfigSchema } from "../../dist/plugin-sdk/index.js";
import { wechatPlugin } from "../../dist/plugin-sdk/index.js";

const plugin = {
  id: "wechat",
  name: "WeChat",
  description: "WeChat channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerChannel({ plugin: wechatPlugin as ChannelPlugin });
  },
};

export default plugin;
