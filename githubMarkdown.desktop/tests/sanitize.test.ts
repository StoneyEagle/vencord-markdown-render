import { describe, it, expect } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { githubSanitizeSchema } from "../renderer/sanitize";

async function run(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, githubSanitizeSchema)
    .use(rehypeStringify)
    .process(md);
  return String(file);
}

describe("githubSanitizeSchema", () => {
  it("strips <script> tags", async () => {
    const out = await run("hi <script>alert(1)</script>");
    expect(out).not.toContain("<script");
  });

  it("strips inline event handlers", async () => {
    const out = await run('<a href="#" onclick="x()">hi</a>');
    expect(out).not.toContain("onclick");
  });

  it("strips javascript: URLs", async () => {
    const out = await run('[x](javascript:alert(1))');
    expect(out).not.toMatch(/href="javascript:/i);
  });

  it("keeps task list checkboxes", async () => {
    const out = await run("- [x] done");
    expect(out).toContain('type="checkbox"');
    expect(out).toContain("checked");
  });

  it("keeps table structure", async () => {
    const out = await run("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(out).toContain("<table>");
    expect(out).toContain("<th>");
  });

  it("keeps heading id attributes (for anchors)", async () => {
    const out = await run('<h2 id="foo">Foo</h2>');
    expect(out).toContain('id="user-content-foo"');
  });
});
