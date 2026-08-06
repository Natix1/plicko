import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CloudUploadIcon } from "@components/index";
import { Menu, React } from "@webpack/common";
import { tryUploadAndInsert } from "./uploads";

export const TextAreaContextPatch: NavContextMenuPatchCallback = (children, args) => {
  children.unshift(<Menu.MenuItem
    id="upload-plicko-text-area"
    label="Upload to plicko"
    action={async () => {
      await tryUploadAndInsert();
    }}
  />);
};

export const ChannelAttachPatch: NavContextMenuPatchCallback = (children, args) => {
  children.splice(1, 0, <Menu.MenuItem
    id="upload-plicko-channel-attach"
    label="Upload to plicko"
    iconLeft={CloudUploadIcon}
    action={async () => {
      await tryUploadAndInsert();
    }}
  />)
};
