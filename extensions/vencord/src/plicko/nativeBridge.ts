import { PluginNative } from "@utils/types";

// @ts-ignore
export const Native = VencordNative.pluginHelpers.PlickoVencord as PluginNative<typeof import("../native")>;
