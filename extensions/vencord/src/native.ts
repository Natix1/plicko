import { dialog } from "electron";
import * as fs from "fs";
import FormData from "form-data";
import axios from "axios";
import path from "path";
import { FilePayload, UploadResponse } from "./types";

export async function uploadFiles(
  _: unknown,
  endpoint: string,
  plickoKey: string,
  files: FilePayload[]
): Promise<UploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", Buffer.from(file.buffer), {
      filename: file.name,
    });
  }

  const response = await axios.post(`${endpoint}/v1/uploads`, formData, {
    headers: {
      ...formData.getHeaders(),
      "x-plicko-key": plickoKey,
    }
  });

  const urls: string[] = response.data.urls;
  return {
    new_storage_size_bytes: response.data.new_storage_size_bytes,
    entries: urls.map((url, index) => ({
      url,
      filename: files[index]?.name ?? "(attachment)",
    })),
  };
}

export async function pickAndUploadFiles(_: unknown, endpoint: string, plickoKey: string): Promise<UploadResponse> {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "All Files", extensions: ["*"] }]
  });

  if (result.canceled) return { entries: [], new_storage_size_bytes: -1 };
  if (result.filePaths.length > 5) throw new Error("I don't think you want to upload that many files");

  const files: FilePayload[] = [];
  for (const filePath of result.filePaths) {
    const file = await fs.promises.readFile(filePath);
    files.push({
      name: path.basename(filePath),
      buffer: file
    })
  }

  return await uploadFiles(null, endpoint, plickoKey, files);
}

export async function getStorageSize(_: unknown, endpoint: string, plickoKey: string): Promise<number> {
  const response = await axios.get(`${endpoint}/v1/metadata/storage-total`, {
    headers: {
      "x-plicko-key": plickoKey
    }
  });

  return response.data.bytes
}
