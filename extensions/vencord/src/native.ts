import axios from "axios";
import { dialog } from "electron";
import * as fs from "fs";
import mime from "mime-types";
import path from "path";
import { FileEntry, FilePayload, UploadFilesResponse } from "./types";

async function uploadFile(
  endpoint: string,
  plickoKey: string,
  file: FilePayload,
) {
  try {
    const presignResponse = await axios.post(
      `${endpoint}/v1/uploads/presign`,
      {
        filename: file.name,
        content_type: file.contentType,
        size_bytes: file.buffer.length,
      },
      {
        headers: {
          "x-api-key": plickoKey,
        },
      },
    );

    const uploadResponse = await axios.put(
      presignResponse.data.url,
      file.buffer,
      {
        headers: presignResponse.data.include_headers,
      },
    );

    const confirmResponse = await axios.post(
      `${endpoint}/v1/uploads/confirm`,
      {
        s3_object_key: presignResponse.data.s3_object_key,
      },
      { headers: { "x-api-key": plickoKey } },
    );

    return confirmResponse.data.public_uri;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw new Error(
        `Axios error with uploading single file: \nBody:\n${e.response?.data}\nStatus:\n${e.response?.status}`,
      );
    } else {
      throw new Error(`Failed uploading single file: ${e}`);
    }
  }
}

export async function uploadFiles(
  _: unknown,
  endpoint: string,
  plickoKey: string,
  files: FilePayload[],
): Promise<UploadFilesResponse> {
  const uploadPromises = files.map((file) =>
    uploadFile(endpoint, plickoKey, file),
  );
  const results = await Promise.allSettled(uploadPromises);
  const publicUris: Map<string, string> = new Map();
  const errors: Map<string, string> = new Map();

  results.forEach((res, idx) => {
    if (res.status == "fulfilled") {
      publicUris.set(files[idx].name, res.value);
    } else {
      console.error(
        `Upload failed for file #${idx} (${files[idx].name}): ${res.reason}`,
      );
      errors.set(files[idx].name, `${res.reason}`);
    }
  });

  const entries: Map<string, FileEntry | null> = new Map();

  for (const [filename, uri] of publicUris.entries()) {
    entries.set(filename, { filename, url: uri });
  }

  return {
    entries: entries,
    errors: errors,
  };
}

export async function pickAndUploadFiles(
  _: unknown,
  endpoint: string,
  plickoKey: string,
): Promise<UploadFilesResponse> {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "All Files", extensions: ["*"] }],
  });

  if (result.canceled) return { errors: new Map(), entries: new Map() };
  if (result.filePaths.length > 5)
    throw new Error("I don't think you want to upload that many files");

  const files: FilePayload[] = [];
  for (const filePath of result.filePaths) {
    const file = await fs.promises.readFile(filePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    files.push({
      name: path.basename(filePath),
      contentType: contentType,
      buffer: file,
    });
  }

  try {
    const response = await uploadFiles(null, endpoint, plickoKey, files);
    return response;
  } catch (e) {
    console.error(`Failed to upload files: ${e}`);
    throw new Error(`Failed to upload files: ${e}`);
  }
}

export async function getStorageSize(
  _: unknown,
  endpoint: string,
  plickoKey: string,
): Promise<number> {
  // TODO: reimplement
  return 0;
}
