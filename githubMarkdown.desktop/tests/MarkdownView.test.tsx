import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MarkdownView } from "../components/MarkdownView";

describe("MarkdownView", () => {
  it("renders provided markdown", async () => {
    const { container } = render(
      <MarkdownView source="# Hello" enableMath={false} enableMermaid={false} />
    );
    await waitFor(() => {
      expect(container.querySelector("h1")).not.toBeNull();
    });
    expect(container.querySelector(".vc-ghmd-root")).not.toBeNull();
  });

  it("re-renders when source changes", async () => {
    const { container, rerender } = render(
      <MarkdownView source="# A" enableMath={false} enableMermaid={false} />
    );
    await waitFor(() => expect(container.textContent).toContain("A"));
    rerender(<MarkdownView source="# B" enableMath={false} enableMermaid={false} />);
    await waitFor(() => expect(container.textContent).toContain("B"));
  });

  it("shows error fallback when pipeline throws", async () => {
    // Pass a value that the pipeline cannot handle gracefully
    const { container } = render(
      <MarkdownView source={42 as unknown as string} enableMath={false} enableMermaid={false} />
    );
    await waitFor(() => {
      expect(container.textContent).toMatch(/failed to render/i);
    });
  });
});
