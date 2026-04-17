import { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

// Extends rehype-sanitize default (GitHub-aligned) with GFM + heading-id support.
export const githubSanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow task-list checkbox input
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      ["type", "checkbox"],
      "checked",
      "disabled",
    ],
    // Allow class on code blocks for highlight.js/shiki output
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./, /^hljs/, /^shiki/]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", /^hljs-/, /^katex/, /^shiki/]],
    div: [...(defaultSchema.attributes?.div ?? []), ["className", /^markdown-alert/, /^mermaid/, /^katex/]],
    // Allow svg for mermaid
    svg: ["xmlns", "viewBox", "width", "height", "fill", "stroke", "class"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "input",
    "svg", "g", "path", "rect", "circle", "line", "polygon", "polyline", "text", "tspan", "defs", "marker",
    "math", "semantics", "mrow", "mi", "mn", "mo", "annotation",
  ],
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "tel", "discord"],
    src: ["http", "https", "data"],
  },
};
