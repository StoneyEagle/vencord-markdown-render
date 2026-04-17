import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { RawToggle } from "../components/RawToggle";

describe("RawToggle", () => {
  it("renders both mode buttons", () => {
    const { getByText } = render(<RawToggle mode="rendered" onChange={() => {}} />);
    expect(getByText("Rendered")).not.toBeNull();
    expect(getByText("Raw")).not.toBeNull();
  });

  it("calls onChange with 'raw' when Raw clicked", () => {
    const onChange = vi.fn();
    const { getByText } = render(<RawToggle mode="rendered" onChange={onChange} />);
    fireEvent.click(getByText("Raw"));
    expect(onChange).toHaveBeenCalledWith("raw");
  });

  it("marks current mode as active", () => {
    const { getByText } = render(<RawToggle mode="raw" onChange={() => {}} />);
    expect(getByText("Raw").className).toContain("vc-ghmd-toggle-active");
    expect(getByText("Rendered").className).not.toContain("vc-ghmd-toggle-active");
  });
});
