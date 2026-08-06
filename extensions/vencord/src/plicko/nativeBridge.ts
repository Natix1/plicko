import { PluginNative } from "@utils/types";

export const Native = VencordNative.pluginHelpers.PlickoVencord as PluginNative<
  typeof import("../native")
>;
