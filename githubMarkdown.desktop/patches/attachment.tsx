import { MdAttachment, type DiscordAttachment } from "../components/MdAttachment";
import { settings } from "../settings";

interface AccessoryProps {
  message: {
    attachments?: DiscordAttachment[];
  };
}

const MD_RE = /\.(md|markdown)$/i;

export function MdAttachmentAccessory({ message }: AccessoryProps) {
  if (!settings.store.enableMdAttachments) return null;
  const atts = message.attachments?.filter(a => MD_RE.test(a.filename)) ?? [];
  if (atts.length === 0) return null;

  return (
    <>
      {atts.map(a => (
        <MdAttachment
          key={a.id}
          attachment={a}
          defaultMode={settings.store.defaultView as "rendered" | "raw"}
          enableMath={settings.store.enableMath}
          enableMermaid={settings.store.enableMermaid}
        />
      ))}
    </>
  );
}
