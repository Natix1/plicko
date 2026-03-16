import { dialog } from "electron";
import path from "path";
import * as fs from "fs";

export async function uploadFile(_, endpoint: string, plickoKey: string): Promise<string[]> {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "All Files",
        extensions: ["*"]
      }
    ]
  });

  if (result.canceled) return [];
  if (result.filePaths.length > 5) {
    throw new Error("I don't think you want to upload that many files")
  }

  const formData = new FormData();
  for (const filePath of result.filePaths) {
    const buffer = await fs.promises.readFile(filePath);
    const blob = new Blob([buffer]);
    formData.append("files", blob, path.basename(filePath));
  }

  const response = await fetch(`${endpoint}/uploads`, {
    method: "POST",
    headers: {
      "x-plicko-key": plickoKey
    },
    body: formData
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Non-200 status. Json: ${JSON.stringify(json)}`)
  }

  return json.urls
}
