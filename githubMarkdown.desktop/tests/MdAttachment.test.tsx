import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { MdAttachment, clearMdCache } from "../components/MdAttachment";

const fakeAttachment = {
  id: "a1",
  filename: "doc.md",
  url: "https://example.test/doc.md",
  size: 20,
};

beforeEach(() => {
  clearMdCache();
  global.fetch = vi.fn(async () =>
    new Response("# hello", { status: 200 })
  ) as any;
});

describe("MdAttachment", () => {
  it("fetches and renders markdown", async () => {
    const { container } = render(
      <MdAttachment
        attachment={fakeAttachment as any}
        defaultMode="rendered"
        enableMath
        enableMermaid={false}
      />
    );
    await waitFor(() => expect(container.querySelector("h1")).not.toBeNull());
    expect((global.fetch as any)).toHaveBeenCalledWith(fakeAttachment.url);
  });

  it("toggles to raw view", async () => {
    const { container, findByText } = render(
      <MdAttachment
        attachment={fakeAttachment as any}
        defaultMode="rendered"
        enableMath
        enableMermaid={false}
      />
    );
    await waitFor(() => expect(container.querySelector("h1")).not.toBeNull());
    fireEvent.click(await findByText("Raw"));
    await waitFor(() => expect(container.querySelector("pre")).not.toBeNull());
    expect(container.textContent).toContain("# hello");
  });

  it("caches by attachment id — second render doesn't refetch", async () => {
    const { unmount } = render(
      <MdAttachment attachment={fakeAttachment as any} defaultMode="rendered" enableMath={false} enableMermaid={false} />
    );
    await waitFor(() => expect((global.fetch as any).mock.calls.length).toBe(1));
    unmount();
    render(
      <MdAttachment attachment={fakeAttachment as any} defaultMode="rendered" enableMath={false} enableMermaid={false} />
    );
    // still 1
    expect((global.fetch as any).mock.calls.length).toBe(1);
  });

  it("shows error banner when fetch fails", async () => {
    (global.fetch as any) = vi.fn(async () => new Response("", { status: 500 }));
    clearMdCache();
    const { container } = render(
      <MdAttachment attachment={fakeAttachment as any} defaultMode="rendered" enableMath={false} enableMermaid={false} />
    );
    await waitFor(() => expect(container.textContent).toMatch(/could not load/i));
  });
});
