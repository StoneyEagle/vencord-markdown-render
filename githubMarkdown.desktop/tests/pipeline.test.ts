import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { renderMarkdown } from "../renderer/pipeline";

async function render(md: string): Promise<string> {
  const node = await renderMarkdown(md, { enableMath: true, enableMermaid: false });
  return renderToString(node as any);
}

describe("renderMarkdown", () => {
  it("renders a table with GFM classes", async () => {
    const html = await render("| a | b |\n|---|---|\n| 1 | 2 |");
    expect(html).toContain("<table");
    expect(html).toContain("<th>a</th>");
  });

  it("renders task list with disabled checkboxes", async () => {
    const html = await render("- [x] done\n- [ ] todo");
    expect(html).toMatch(/<input[^>]+type="checkbox"[^>]+checked/);
    expect(html).toContain("disabled");
  });

  it("renders alert block with markdown-alert class", async () => {
    const html = await render("> [!NOTE]\n> important");
    expect(html).toMatch(/class="[^"]*markdown-alert[^"]*note/);
  });

  it("renders footnote reference and definition", async () => {
    const html = await render("see [^1]\n\n[^1]: note text");
    expect(html).toContain('href="#user-content-fn-1"');
    expect(html).toContain("note text");
  });

  it("renders inline math via katex", async () => {
    const html = await render("inline $x^2$ math");
    expect(html).toContain("katex");
  });

  it("renders heading with autolink anchor", async () => {
    const html = await render("## Hello World");
    expect(html).toMatch(/<h2[^>]+id="user-content-hello-world"/);
    expect(html).toContain('href="#hello-world"');
  });

  it("passes plain paragraph through", async () => {
    const html = await render("just words");
    expect(html).toContain("<p>just words</p>");
  });

  it("sanitizes dangerous HTML", async () => {
    const html = await render("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("onerror");
  });
});
