import { describe, it, expect, vi } from "vitest";
import { installParserPatch, uninstallParserPatch } from "../patches/parser";

interface MockParser { parse: (content: string, inline?: boolean, state?: any) => any; }

function makeParser(): MockParser {
  return { parse: vi.fn((c: string) => ({ type: "original", content: c })) };
}

describe("installParserPatch", () => {
  it("passes plain messages through to original parse", () => {
    const p = makeParser();
    installParserPatch(p as any, {
      render: () => "GFM",
      enableMath: false,
      enableMermaid: false,
    });
    const result = p.parse("just words");
    expect(result).toEqual({ type: "original", content: "just words" });
    uninstallParserPatch(p as any);
  });

  it("delegates when GFM feature detected", () => {
    const p = makeParser();
    installParserPatch(p as any, {
      render: (src) => ({ type: "gfm", src }),
      enableMath: false,
      enableMermaid: false,
    });
    const result = p.parse("- [ ] task");
    expect(result).toEqual({ type: "gfm", src: "- [ ] task" });
    uninstallParserPatch(p as any);
  });

  it("falls back to original if renderer throws", () => {
    const p = makeParser();
    installParserPatch(p as any, {
      render: () => { throw new Error("boom"); },
      enableMath: false,
      enableMermaid: false,
    });
    const result = p.parse("- [ ] task");
    expect(result).toEqual({ type: "original", content: "- [ ] task" });
    uninstallParserPatch(p as any);
  });

  it("uninstall restores original parse", () => {
    const p = makeParser();
    const original = p.parse;
    installParserPatch(p as any, {
      render: () => "GFM",
      enableMath: false,
      enableMermaid: false,
    });
    expect(p.parse).not.toBe(original);
    uninstallParserPatch(p as any);
    expect(p.parse).toBe(original);
  });
});
