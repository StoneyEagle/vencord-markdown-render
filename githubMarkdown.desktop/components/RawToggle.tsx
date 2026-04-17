export type ViewMode = "rendered" | "raw";

export interface RawToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function RawToggle({ mode, onChange }: RawToggleProps) {
  const cls = (m: ViewMode) =>
    `vc-ghmd-toggle-btn${mode === m ? " vc-ghmd-toggle-active" : ""}`;
  return (
    <div className="vc-ghmd-toggle">
      <button className={cls("rendered")} onClick={() => onChange("rendered")}>Rendered</button>
      <button className={cls("raw")} onClick={() => onChange("raw")}>Raw</button>
    </div>
  );
}
