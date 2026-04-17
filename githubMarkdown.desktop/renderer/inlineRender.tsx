import type { ReactElement } from "react";
import { MarkdownView } from "../components/MarkdownView";

export interface InlineRendererOptions {
  enableMath: boolean;
  enableMermaid: boolean;
}

export function makeInlineRenderer(opts: InlineRendererOptions) {
  return (source: string, _state: unknown): ReactElement[] => {
    return [
      <MarkdownView
        key="vc-ghmd-inline"
        source={source}
        enableMath={opts.enableMath}
        enableMermaid={opts.enableMermaid}
        className="vc-ghmd-inline"
      />,
    ];
  };
}
