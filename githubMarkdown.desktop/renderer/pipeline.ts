import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkGithubAlerts from "remark-github-alerts";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { React } from "@webpack/common";
import type { ReactNode } from "react";
import { githubSanitizeSchema } from "./sanitize";

export interface RenderOptions {
  enableMath: boolean;
  enableMermaid: boolean;
}

export async function renderMarkdown(
  source: string,
  opts: RenderOptions,
): Promise<ReactNode> {
  const { Fragment, createElement } = React;
  const jsx = (type: any, props: any, key?: any) =>
    createElement(type, key !== undefined ? { ...props, key } : props);
  const jsxs = jsx;

  let mermaidPlugin: any = null;
  if (opts.enableMermaid) {
    const mod = await import("remark-mermaidjs");
    mermaidPlugin = mod.default;
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubAlerts)
    .use(opts.enableMath ? [remarkMath] : [])
    .use(opts.enableMermaid && mermaidPlugin ? [mermaidPlugin] : [])
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, githubSanitizeSchema)
    .use(rehypeSlug, { prefix: "user-content-" })
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(opts.enableMath ? [rehypeKatex] : []);

  const tree = processor.parse(source);
  const hast = await processor.run(tree);

  return toJsxRuntime(hast as any, {
    Fragment,
    jsx: jsx as any,
    jsxs: jsxs as any,
  });
}
