import { useEffect, useState, type ReactNode } from "react";
import { renderMarkdown } from "../renderer/pipeline";

export interface MarkdownViewProps {
  source: string;
  enableMath: boolean;
  enableMermaid: boolean;
  className?: string;
}

export function MarkdownView({ source, enableMath, enableMermaid, className }: MarkdownViewProps) {
  const [node, setNode] = useState<ReactNode>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const rendered = await renderMarkdown(source, { enableMath, enableMermaid });
        if (!cancelled) setNode(rendered);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [source, enableMath, enableMermaid]);

  if (error) {
    return (
      <div className="vc-ghmd-root vc-ghmd-error">
        <strong>Failed to render markdown:</strong> {error}
      </div>
    );
  }

  return <div className={`vc-ghmd-root ${className ?? ""}`}>{node}</div>;
}
