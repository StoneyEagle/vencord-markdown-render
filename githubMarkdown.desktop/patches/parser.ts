import { hasGfmFeature } from "../renderer/featureDetect";

export interface ParserPatchOptions {
  render: (source: string, state: any) => unknown;
  enableMath: boolean;
  enableMermaid: boolean;
}

interface PatchTarget {
  parse: (content: string, inline?: boolean, state?: any) => unknown;
  __ghmdOriginalParse?: (content: string, inline?: boolean, state?: any) => unknown;
}

export function installParserPatch(target: PatchTarget, opts: ParserPatchOptions): void {
  if (target.__ghmdOriginalParse) return;
  const original = target.parse;
  target.__ghmdOriginalParse = original;
  target.parse = (content: string, inline?: boolean, state?: any) => {
    try {
      if (typeof content === "string" && hasGfmFeature(content)) {
        return opts.render(content, state);
      }
    } catch (e) {
      console.error("[GithubMarkdown] render failed, falling back:", e);
    }
    return original.call(target, content, inline, state);
  };
}

export function uninstallParserPatch(target: PatchTarget): void {
  if (!target.__ghmdOriginalParse) return;
  target.parse = target.__ghmdOriginalParse;
  delete target.__ghmdOriginalParse;
}
