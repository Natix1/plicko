export interface FileEntry {
  url: string;
  filename: string;
}

export interface FilePayload {
  name: string;
  contentType: string;
  buffer: Uint8Array;
}

export enum UploadProvider {
  Discord,
  Plicko,
  None,
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
  Choose,
  Automatic,
}
