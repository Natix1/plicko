/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { DraftStore, Menu, SelectedChannelStore, showToast, Toasts } from "@webpack/common";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { definePluginSettings } from "@api/Settings";

const Native = VencordNative.pluginHelpers.PlickoVencord as PluginNative<typeof import("./native")>;
const settings = definePluginSettings({
  plickoKey: {
    type: OptionType.STRING,
    description: "Plicko key",
    default: ""
  },
  endpoint: {
    type: OptionType.STRING,
    description: "Plicko endpoint URL",
    default: "http://localhost:8742"
  }
})

export default definePlugin({
  name: "PlickoVencord",
  description: "Plicko integration for vencord",
  authors: [{ name: "Nathan", id: 955090007335530506n }],
  settings,
  contextMenus: {
    "textarea-context": (children, args) => {
      children.unshift(<Menu.MenuItem
        id="upload-plicko"
        label="Upload to plicko"
        action={async () => {
          try {
            const urls = await Native.uploadFile(settings.store.endpoint, settings.store.plickoKey);
            if (urls.length == 0) return;

            const text = DraftStore.getDraft(SelectedChannelStore.getChannelId(), 0);
            let urlsString = "\n";

            if (text.length == 0 && urls.length == 1) {
              urlsString = urls[0];
            } else {
              for (const url of urls) {
                urlsString += `[Attachment](${url})\n`;
              }
            }

            insertTextIntoChatInputBox(urlsString)
          } catch (err) {
            let error = err as Error;
            showToast(`Something went wrong: ${error.message}`, Toasts.Type.FAILURE);
            console.error("Fetch failed:", error.cause);
          }
        }}
      />)
    }
  }
});
