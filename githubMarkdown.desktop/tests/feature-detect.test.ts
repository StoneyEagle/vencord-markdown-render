import { describe, it, expect } from "vitest";
import { hasGfmFeature } from "../renderer/featureDetect";

describe("hasGfmFeature", () => {
  it("returns false for plain text", () => {
    expect(hasGfmFeature("hello world")).toBe(false);
  });

  it("returns false for single pipe character", () => {
    expect(hasGfmFeature("use a | to separate")).toBe(false);
  });

  it("detects a GFM table", () => {
    expect(hasGfmFeature("| a | b |\n| - | - |\n| 1 | 2 |")).toBe(true);
  });

  it("detects a task list", () => {
    expect(hasGfmFeature("- [ ] todo\n- [x] done")).toBe(true);
  });

  it("detects a NOTE alert", () => {
    expect(hasGfmFeature("> [!NOTE]\n> hi")).toBe(true);
  });

  it("detects all alert kinds", () => {
    for (const k of ["NOTE", "TIP", "WARNING", "CAUTION", "IMPORTANT"]) {
      expect(hasGfmFeature(`> [!${k}]\n> x`)).toBe(true);
    }
  });

  it("detects block math", () => {
    expect(hasGfmFeature("$$\nx=1\n$$")).toBe(true);
  });

  it("detects inline math", () => {
    expect(hasGfmFeature("inline $x^2$ math")).toBe(true);
    expect(hasGfmFeature("formula $E = mc^2$")).toBe(true);
  });

  it("does not confuse currency for math", () => {
    expect(hasGfmFeature("costs $5 to make")).toBe(false);
    expect(hasGfmFeature("only $100")).toBe(false);
  });

  it("detects mermaid fence", () => {
    expect(hasGfmFeature("```mermaid\ngraph TD\nA-->B\n```")).toBe(true);
  });

  it("detects footnote reference", () => {
    expect(hasGfmFeature("see [^1]\n\n[^1]: note")).toBe(true);
  });

  it("ignores standard fenced code block", () => {
    expect(hasGfmFeature("```js\nconst x = 1\n```")).toBe(false);
  });
});
