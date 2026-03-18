export interface Entry {
  url: string
  filename: string
}

export interface UploadResponse {
  entries: Entry[],
  new_storage_size_bytes: number
}

export interface FilePayload {
  name: string;
  buffer: Uint8Array;
}

export enum UploadProvider {
  Discord,
  Plicko,
  None
}

export interface PlickoConfirmModalProps {
  onDiscord: () => void;
  onPlicko: () => void;
  onDiscard: () => void;
  props: any;
}

export enum DragAndDropBehavior {
  AlwaysDiscord,
  AlwaysPlicko,
  Choose
}
