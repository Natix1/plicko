import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Paragraph } from "@components/Paragraph";
import { Heading } from "@components/Heading";
import { Button } from "@components/Button";
import { PlickoConfirmModalProps, UploadProvider } from "./types";

function PlickoConfirmModal({ onDiscord, onPlicko, onDiscard, props }: PlickoConfirmModalProps) {
  return (
    <ModalRoot {...props}>
      <ModalHeader>
        <div style={{ display: "flex", width: "100%", height: "100%" }}>
          <Heading style={{ flexGrow: 1 }}>Plicko</Heading>
          <ModalCloseButton onClick={onDiscard} />
        </div>
      </ModalHeader>
      <ModalContent>
        <Paragraph>Please pick which platform to upload to! (you can set the default action in settings)</Paragraph>
      </ModalContent>
      <ModalFooter>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", width: "100%" }}>
          <Button style={{ background: "#2b6ffb" }} onClick={onDiscord}>Discord</Button>
          <Button style={{ background: "#9b2bfb" }} onClick={onPlicko}>Plicko</Button>
        </div>
      </ModalFooter>
    </ModalRoot>
  );
}

export function pickUploadProvider(): Promise<UploadProvider> {
  return new Promise(resolve => {
    openModal(props => {
      const close = (provider: UploadProvider) => {
        props.onClose();
        resolve(provider);
      };

      return (
        <PlickoConfirmModal
          props={props}
          onDiscord={() => close(UploadProvider.Discord)}
          onPlicko={() => close(UploadProvider.Plicko)}
          onDiscard={() => close(UploadProvider.None)}
        />
      );
    });
  });
}
