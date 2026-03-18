import { definePluginSettings } from "@api/Settings"
import { OptionType } from "@utils/types"
import { DragAndDropBehavior } from "./types"

export const settings = definePluginSettings({
  plickoKey: {
    type: OptionType.STRING,
    description: "Plicko key",
    default: ""
  },
  endpoint: {
    type: OptionType.STRING,
    description: "Plicko endpoint URL",
    default: "http://localhost:8742"
  },
  dragAndDropBehavior: {
    type: OptionType.SELECT,
    description: "How should the drag-and-drop file upload behave?",
    options: [
      {
        label: "Always upload to discord",
        value: DragAndDropBehavior.AlwaysDiscord
      },
      {
        label: "Always upload to plicko",
        value: DragAndDropBehavior.AlwaysPlicko
      },
      {
        label: "Choose per upload",
        value: DragAndDropBehavior.Choose,
      },
      {
        label: "Automatic (based off of Nitro limits)",
        value: DragAndDropBehavior.Automatic,
        default: true
      }
    ]
  }
})
