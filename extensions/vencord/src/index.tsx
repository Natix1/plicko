/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { DraftStore, Menu, SelectedChannelStore, showToast, Toasts } from "@webpack/common";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { definePluginSettings } from "@api/Settings";
import { getStorageSize } from "./native";
import { sendBotMessage } from "@api/Commands";

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

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function displayUri(uri: string): string {
  if (uri.endsWith(".png") ||
    uri.endsWith(".jpg") ||
    uri.endsWith(".jpeg") ||
    uri.endsWith(".webp") ||
    uri.endsWith(".gif") ||
    uri.endsWith(".svg") ||
    uri.endsWith(".mp4") ||
    uri.endsWith(".webm") ||
    uri.endsWith(".mov")) {
    return uri
  } else {
    return ` [Attachment](${uri})`
  }
}

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
            const data = await Native.uploadFile(settings.store.endpoint, settings.store.plickoKey);
            const urls = data.urls;
            const new_size_bytes = data.new_storage_size_bytes;

            if (urls.length == 0) return;

            const text = DraftStore.getDraft(SelectedChannelStore.getChannelId(), 0);
            let urlsString = "\n";

            if (text.length == 0 && urls.length == 1) {
              urlsString = displayUri(urls[0]);
            } else {
              for (const url of urls) {
                urlsString += `[Attachment](${url})\n`;
              }
            }

            insertTextIntoChatInputBox(urlsString)
            if (new_size_bytes > 0) {
              sendBotMessage(SelectedChannelStore.getChannelId(), {
                content: `-# New storage size: **${humanBytes(new_size_bytes)}**`,
              })
            }
          } catch (err) {
            let error = err as Error;
            showToast(`Something went wrong while uploading: ${error.message}`, Toasts.Type.FAILURE);
            console.error("Fetch failed:", error.cause);
          }
        }}
      />)
    }
  }
});
