import axios from "axios";
import { dialog } from "electron";
import ExifTransformer from "exif-be-gone";
import mime from "mime-types";
import * as fs from "node:fs/promises";
import { Readable } from "node:stream";
import path from "path";
import { FileEntry, FilePayload, UploadFilesResponse } from "./types";

async function generateCleanPayload(file: FilePayload): Promise<FilePayload> {
  const supportedContentTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/jxl",
    "application/pdf",
  ];

  if (!supportedContentTypes.includes(file.contentType)) {
    return file;
  }

  const cleanStream = Readable.from(file.buffer).pipe(new ExifTransformer());
  const chunks: Buffer[] = [];

  for await (const chunk of cleanStream) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    name: file.name,
    contentType: file.contentType,
    buffer: Buffer.concat(chunks),
  };
}

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
  rawFiles: FilePayload[],
): Promise<UploadFilesResponse> {
  const cleanFiles = await Promise.all(
    rawFiles.map((f) => generateCleanPayload(f)),
  );
  const uploadPromises = cleanFiles.map((file) =>
    uploadFile(endpoint, plickoKey, file),
  );
  const results = await Promise.allSettled(uploadPromises);
  const publicUris: Map<string, string> = new Map();
  const errors: Map<string, string> = new Map();

  results.forEach((res, idx) => {
    if (res.status == "fulfilled") {
      publicUris.set(cleanFiles[idx].name, res.value);
    } else {
      console.error(
        `Upload failed for file #${idx} (${cleanFiles[idx].name}): ${res.reason}`,
      );
      errors.set(cleanFiles[idx].name, `${res.reason}`);
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
    const rawBytes = await fs.readFile(filePath);
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    files.push({
      name: path.basename(filePath),
      contentType: contentType,
      buffer: rawBytes,
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
