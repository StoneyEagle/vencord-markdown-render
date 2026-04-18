import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
  enableInlineGfm: {
    type: OptionType.BOOLEAN,
    description: "Render GFM features (tables, task lists, alerts, math, mermaid) in chat messages.",
    default: true,
  },
  enableMath: {
    type: OptionType.BOOLEAN,
    description: "Render LaTeX math via KaTeX.",
    default: true,
  },
  enableMermaid: {
    type: OptionType.BOOLEAN,
    description: "Render mermaid code fences as diagrams.",
    default: true,
  },
  defaultView: {
    type: OptionType.SELECT,
    description: "Default view when opening a .md file preview.",
    options: [
      { label: "Rendered", value: "rendered", default: true },
      { label: "Raw", value: "raw" },
    ],
  },
});
