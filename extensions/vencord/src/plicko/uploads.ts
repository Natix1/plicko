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
import { FilePayload, UploadFilesResponse } from "../types";
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

export function handleUploadResponse(response: UploadFilesResponse) {
  if (response.entries.size == 0 && response.errors.size == 0) return;
  for (const [filename, error] of response.errors.entries()) {
    const errMsg = `Failed uploading file ${filename}: ${error}`;
    console.error(errMsg);
    showToast(errMsg, "failure");
  }

  if (response.entries.size == 0 && response.errors.size > 0) {
    return;
  }

  const text = DraftStore.getDraft(SelectedChannelStore.getChannelId(), 0);
  let urlsString = "\n";

  if (text.length == 0 && response.entries.size == 1) {
    const [filename, entry] = Array.from(response.entries)[0];
    if (entry == null) {
      const errMsg = `Failed uploading file ${filename}, server returned nothing`;
      console.error(errMsg);
      showToast(errMsg, "failure");
      return;
    }

    urlsString = displayUri(entry.url, entry.filename);
  } else {
    for (const entry of response.entries.values()) {
      if (entry === null) continue;

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
  try {
    const result = await Native.uploadFiles(
      settings.store.endpoint,
      settings.store.plickoKey,
      await filesToFilePayloads(files),
    );
    handleUploadResponse(result);
  } catch (e) {
    console.error(`Failed uploading files to plicko: ${e}`);
    throw e;
  }
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
