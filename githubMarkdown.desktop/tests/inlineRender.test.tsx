import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { makeInlineRenderer } from "../renderer/inlineRender";

describe("makeInlineRenderer", () => {
  it("returns an array containing a single React element", () => {
    const renderer = makeInlineRenderer({ enableMath: false, enableMermaid: false });
    const result = renderer("- [ ] do thing", {});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });

  it("the element renders GFM content into the DOM", async () => {
    const renderer = makeInlineRenderer({ enableMath: false, enableMermaid: false });
    const [element] = renderer("- [ ] do thing", {});
    const { container } = render(element);
    await waitFor(() => {
      expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
    });
  });
});
