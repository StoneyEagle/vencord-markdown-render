import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
  enableInlineGfm: {
    type: OptionType.BOOLEAN,
    description: "Render GFM features (tables, task lists, alerts, math, mermaid) in chat messages.",
    default: true,
  },
  enableMdAttachments: {
    type: OptionType.BOOLEAN,
    description: "Render .md file attachments inline with a Raw/Rendered toggle.",
    default: true,
  },
  defaultView: {
    type: OptionType.SELECT,
    description: "Default view mode for .md attachments.",
    options: [
      { label: "Rendered", value: "rendered", default: true },
      { label: "Raw", value: "raw" },
    ],
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
  followDiscordTheme: {
    type: OptionType.BOOLEAN,
    description: "Automatically match Discord's light/dark theme.",
    default: true,
  },
});
