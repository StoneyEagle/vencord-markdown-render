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
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
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
  let processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubAlerts);

  if (opts.enableMath) processor = processor.use(remarkMath);

  if (opts.enableMermaid) {
    // Mermaid plugin must run on mdast before remark-rehype.
    const { default: remarkMermaidjs } = await import("remark-mermaidjs");
    processor = processor.use(remarkMermaidjs);
  }

  processor = processor
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, githubSanitizeSchema)
    .use(rehypeSlug, { prefix: "user-content-" })
    .use(rehypeAutolinkHeadings, { behavior: "append" })
    .use(rehypeHighlight, { detect: true, ignoreMissing: true });

  if (opts.enableMath) processor = processor.use(rehypeKatex);

  const tree = processor.parse(source);
  const hast = await processor.run(tree);

  return toJsxRuntime(hast as any, {
    Fragment,
    jsx: jsx as any,
    jsxs: jsxs as any,
  });
}
