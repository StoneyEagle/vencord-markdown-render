// Ambient stubs so the plugin type-checks outside a Vencord checkout.
// Inside the Vencord tree these are provided by real modules — our stubs
// are shadowed.
declare module "@utils/types" {
  export const enum OptionType { BOOLEAN, SELECT, STRING, NUMBER, BIGINT }
  export interface PluginAuthor { name: string; id: bigint; }
  export function definePlugin<T>(p: T): T;
  export type StartAt = "Init" | "WebpackReady" | "DOMContentLoaded";
}
declare module "@api/Settings" {
  export function definePluginSettings<T>(t: T): { store: Record<string, any> };
}
declare module "@api/MessageAccessories" {
  export function addMessageAccessory(name: string, fn: (props: any) => any, priority?: number): void;
  export function removeMessageAccessory(name: string): void;
}
declare module "@webpack/common" {
  export const Parser: {
    parse: (content: string, inline?: boolean, state?: any) => any;
    parseTopic: (content: string, inline?: boolean, state?: any) => any;
  } | undefined;
}
