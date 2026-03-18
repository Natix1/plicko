export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function displayUri(uri: string, fileName: string): string {
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
