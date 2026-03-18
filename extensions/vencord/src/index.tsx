/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { showToast, Toasts } from "@webpack/common";
import { getProviderChoice } from "./components/PlickoConfirmModal";
import { ChannelAttachPatch, TextAreaContextPatch } from "./plicko/patches";
import { getMaxUploadSizeForCurrentUser, uploadFilesToDiscord, uploadFilesToPlicko } from "./plicko/uploads";
import { settings } from "./settings";
import { DragAndDropBehavior, UploadProvider } from "./types";

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
        uploadFilesToDiscord(files);
        break;

      case DragAndDropBehavior.AlwaysPlicko:
        await uploadFilesToPlicko(files);
        break;

      case DragAndDropBehavior.Choose:
        await this.pickUploadProvider(files);
        break;

      case DragAndDropBehavior.Automatic:
        let totalSizeBytes = 0;
        const limit = getMaxUploadSizeForCurrentUser();

        for (const file of files) {
          totalSizeBytes += file.size;
        }

        if (totalSizeBytes < limit) {
          uploadFilesToDiscord(files);
        } else {
          await uploadFilesToPlicko(files);
        }

        break;
    }
  },

  async pickUploadProvider(files: File[]) {
    const provider = await getProviderChoice();
    switch (provider) {
      case UploadProvider.None: break;
      case UploadProvider.Plicko:
        await uploadFilesToPlicko(files);
        break;
      case UploadProvider.Discord:
        uploadFilesToDiscord(files);
        break;
    }
  },
});
