/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { ChannelStore, DraftStore, DraftType, Forms, Menu, SelectedChannelStore, showToast, Toasts, UploadHandler } from "@webpack/common";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { sendBotMessage } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CloudUploadIcon } from "@components/Icons";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Button } from "@components/Button";
import { definePluginSettings } from "@api/Settings";
import { pickUploadProvider } from "./PlickoConfirmModal";
import { UploadProvider, FilePayload, Entry, UploadResponse, DragAndDropBehavior } from "./types";

// @ts-ignore
const Native = VencordNative.pluginHelpers.PlickoVencord as PluginNative<typeof import("./native")>;

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function displayUri(uri: string, fileName: string): string {
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
    return ` [${fileName}](${uri})`
  }
}

function handleUploadResponse(uploadResponse: UploadResponse) {
  const new_size_bytes = uploadResponse.new_storage_size_bytes;

  if (uploadResponse.entries.length == 0) return;

  const text = DraftStore.getDraft(SelectedChannelStore.getChannelId(), 0);
  let urlsString = "\n";

  if (text.length == 0 && uploadResponse.entries.length == 1) {
    urlsString = displayUri(uploadResponse.entries[0].url, uploadResponse.entries[0].filename);
  } else {
    for (const entry of uploadResponse.entries) {
      console.log(entry.filename, entry.url);
      urlsString += `[${entry.filename}](${entry.url})\n`;
    }
  }

  insertTextIntoChatInputBox(urlsString)
  if (new_size_bytes > 0) {
    sendBotMessage(SelectedChannelStore.getChannelId(), {
      content: `-# New storage size: **${humanBytes(new_size_bytes)}**`,
    })
  }
}

async function filesToFilePayloads(files: File[]): Promise<FilePayload[]> {
  const filePayloads: FilePayload[] = await Promise.all(
    files.map(async file => ({
      name: file.name,
      buffer: await file.bytes()
    }))
  );

  return filePayloads;
}

async function tryUploadAndInsert() {
  try {
    const data = await Native.pickAndUploadFiles(settings.store.endpoint, settings.store.plickoKey);
    handleUploadResponse(data);
  } catch (err) {
    let error = err as Error;
    showToast(`Something went wrong while uploading: ${error.message}`, Toasts.Type.FAILURE);
    console.error("Fetch failed:", error.cause);
  }
}

const TextAreaContextPatch: NavContextMenuPatchCallback = (children, args) => {
  children.unshift(<Menu.MenuItem
    id="upload-plicko-text-area"
    label="Upload to plicko"
    action={async () => {
      await tryUploadAndInsert();
    }}
  />);
};

const ChannelAttachPatch: NavContextMenuPatchCallback = (children, args) => {
  children.splice(1, 0, <Menu.MenuItem
    id="upload-plicko-channel-attach"
    label="Upload to plicko"
    iconLeft={CloudUploadIcon}
    action={async () => {
      await tryUploadAndInsert();
    }}
  />)
};

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
  },
  dragAndDropBehavior: {
    type: OptionType.SELECT,
    description: "How should the drag-and-drop file upload behave?",
    options: [
      {
        label: "Always upload to discord",
        value: DragAndDropBehavior.AlwaysDiscord
      },
      {
        label: "Always upload to plicko",
        value: DragAndDropBehavior.AlwaysPlicko
      },
      {
        label: "Choose per upload",
        value: DragAndDropBehavior.Choose,
        default: true
      }
    ]
  }
})

export default definePlugin({
  name: "PlickoVencord",
  description: "Plicko integration for vencord",
  authors: [{ name: "Nathan", id: 955090007335530506n }],
  settings,
  contextMenus: {
    "textarea-context": TextAreaContextPatch,
    "channel-attach": ChannelAttachPatch
  },
  patches: [{
    find: "UploadArea",
    replacement: {
      match: /(this.props.onDrop\((\i)\.files\))/,
      replace: "$self.interceptOnDrop($2)"
    }
  }],

  interceptOnDrop(dataTransfer: DataTransfer) {
    const files: File[] = Array.from(dataTransfer.files);
    this.handleDrop(files).catch((err) => {
      let error = err as Error;
      showToast(`Something went wrong while uploading: ${error.message}`, Toasts.Type.FAILURE);
      console.error("Handling drop failed:", error.cause);
    });
  },

  async handleDrop(files: File[]) {
    switch (settings.store.dragAndDropBehavior) {
      case DragAndDropBehavior.AlwaysDiscord:
        this.uploadFilesDiscord(files);
        break;

      case DragAndDropBehavior.AlwaysPlicko:
        const result = await Native.uploadFiles(settings.store.endpoint, settings.store.plickoKey, await filesToFilePayloads(files));
        handleUploadResponse(result);
        break;

      case DragAndDropBehavior.Choose:
        await this.pickUploadProvider(files);
        break;
    }
  },

  async pickUploadProvider(files: File[]) {
    const provider = await pickUploadProvider();
    switch (provider) {
      case UploadProvider.None: break;
      case UploadProvider.Plicko:
        const result = await Native.uploadFiles(settings.store.endpoint, settings.store.plickoKey, await filesToFilePayloads(files));
        handleUploadResponse(result);

        break;
      case UploadProvider.Discord:
        this.uploadFilesDiscord(files);
        break;
    }
  },

  uploadFilesDiscord(files: File[]) {
    const channelId = SelectedChannelStore.getChannelId();
    UploadHandler.promptToUpload(files, ChannelStore.getChannel(channelId), DraftType.ChannelMessage);
  }
});
