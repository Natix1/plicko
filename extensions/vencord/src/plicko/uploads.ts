import { insertTextIntoChatInputBox } from "@utils/discord";
import {
  ChannelStore,
  DraftStore,
  DraftType,
  SelectedChannelStore,
  showToast,
  Toasts,
  UploadHandler,
  UserStore,
} from "@webpack/common";
import { displayUri } from "../general/utils";
import { settings } from "../settings";
import { FileEntry, FilePayload } from "../types";
import { Native } from "./nativeBridge";

const MEBIBYTE_BYTES = 2 ** 20;

/*
 * Stores how much a user can upload in MiB
 * Relevant sources: https://docs.discord.com/developers/resources/user#user-object-premium-types
 *                   https://discord.com/nitro
 *
 */
const MAX_UPLOAD_SIZES = {
  0: MEBIBYTE_BYTES * 10, // Non-Nitro
  1: MEBIBYTE_BYTES * 50, // Nitro classic
  2: MEBIBYTE_BYTES * 500, // Nitro
  3: MEBIBYTE_BYTES * 50, // Nitro basic
};

export function handleUploadResponse(entries: FileEntry[]) {
  if (entries.length == 0) return;

  const text = DraftStore.getDraft(SelectedChannelStore.getChannelId(), 0);
  let urlsString = "\n";

  if (text.length == 0 && entries.length == 1) {
    urlsString = displayUri(entries[0].url, entries[0].filename);
  } else {
    for (const entry of entries) {
      console.log(entry.filename, entry.url);
      urlsString += `[${entry.filename}](${entry.url})\n`;
    }
  }

  insertTextIntoChatInputBox(urlsString);
  // TODO: REIMPLEMENT
  // if (new_size_bytes > 0) {
  //   sendBotMessage(SelectedChannelStore.getChannelId(), {
  //     content: `-# New storage size: **${humanBytes(new_size_bytes)}**`,
  //   });
  // }
}

export async function filesToFilePayloads(
  files: File[],
): Promise<FilePayload[]> {
  const filePayloads: FilePayload[] = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      contentType: file.type,
      buffer: await file.bytes(),
    })),
  );

  return filePayloads;
}

export async function tryUploadAndInsert() {
  try {
    const data = await Native.pickAndUploadFiles(
      settings.store.endpoint,
      settings.store.plickoKey,
    );
    handleUploadResponse(data);
  } catch (err) {
    console.log(err);
    let error = err as Error;
    showToast(
      `Something went wrong while uploading: ${error.message}`,
      Toasts.Type.FAILURE,
    );
    console.error("Fetch failed:", error.cause);
  }
}

export async function uploadFilesToPlicko(files: File[]) {
  const result = await Native.uploadFiles(
    settings.store.endpoint,
    settings.store.plickoKey,
    await filesToFilePayloads(files),
  );
  handleUploadResponse(result);
}

export function uploadFilesToDiscord(files: File[]) {
  const channelId = SelectedChannelStore.getChannelId();
  UploadHandler.promptToUpload(
    files,
    ChannelStore.getChannel(channelId),
    DraftType.ChannelMessage,
  );
}

export function getMaxUploadSizeForCurrentUser(): number {
  const currentUser = UserStore.getCurrentUser();
  const premiumType = currentUser.premiumType || 0;
  const maxUploadSize = MAX_UPLOAD_SIZES[premiumType] || MAX_UPLOAD_SIZES[0];

  console.log("Max upload size for the current user: ", maxUploadSize);
  return maxUploadSize;
}
