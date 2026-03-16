import { dialog } from "electron";
import path from "path";
import * as fs from "fs";
import FormData from "form-data";
import axios from "axios";

export async function uploadFile(_, endpoint: string, plickoKey: string): Promise<{ urls: string[], new_storage_size_bytes: number }> {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "All Files", extensions: ["*"] }]
  });

  if (result.canceled) return { urls: [], new_storage_size_bytes: -1 };
  if (result.filePaths.length > 5) throw new Error("I don't think you want to upload that many files");

  const formData = new FormData();
  for (const filePath of result.filePaths) {
    formData.append("files", fs.createReadStream(filePath), path.basename(filePath));
  }

  const response = await axios.post(`${endpoint}/uploads`, formData, {
    headers: {
      ...formData.getHeaders(),
      "x-plicko-key": plickoKey,
    }
  });

  return response.data;
}

export async function getStorageSize(endpoint: string, plickoKey: string): Promise<number> {
  const response = await axios.get(`${endpoint}/metadata/storage-total`, {
    headers: {
      "x-plicko-key": plickoKey
    }
  });

  return response.data.bytes
}
