import { Attribute } from './Attribute'


class PlotConfigEntry {
  readonly attribute: Attribute;
  readonly useCustomScale?: boolean;
  constructor(attribute: Attribute, useCustomScale: boolean = false) {
    this.attribute = attribute;
    this.useCustomScale = useCustomScale;
  }
}

export { PlotConfigEntry };