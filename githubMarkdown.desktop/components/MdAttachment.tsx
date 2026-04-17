import { useEffect, useState } from "react";
import { MarkdownView } from "./MarkdownView";
import { RawToggle, type ViewMode } from "./RawToggle";

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
}

export interface MdAttachmentProps {
  attachment: DiscordAttachment;
  defaultMode: ViewMode;
  enableMath: boolean;
  enableMermaid: boolean;
}

const cache = new Map<string, string>();
export function clearMdCache() { cache.clear(); }

export function MdAttachment({ attachment, defaultMode, enableMath, enableMermaid }: MdAttachmentProps) {
  const [source, setSource] = useState<string | null>(cache.get(attachment.id) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    if (cache.has(attachment.id)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(attachment.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        cache.set(attachment.id, text);
        if (!cancelled) setSource(text);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [attachment.id, attachment.url]);

  if (error) return (
    <div className="vc-ghmd-attachment vc-ghmd-error">
      Could not load {attachment.filename}: {error}
    </div>
  );

  if (source == null) return (
    <div className="vc-ghmd-attachment vc-ghmd-loading">
      Loading {attachment.filename}…
    </div>
  );

  return (
    <div className="vc-ghmd-attachment">
      <div className="vc-ghmd-attachment-header">
        <span className="vc-ghmd-filename">{attachment.filename}</span>
        <RawToggle mode={mode} onChange={setMode} />
      </div>
      {mode === "rendered"
        ? <MarkdownView source={source} enableMath={enableMath} enableMermaid={enableMermaid} />
        : <pre className="vc-ghmd-raw"><code>{source}</code></pre>}
    </div>
  );
}
