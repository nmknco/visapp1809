export const MINIMAP_PERROW = 3;
export const FILTER_PANEL_WIDTH = 300;
export const MINIMAP_MAR = 3; // margin around svg (used as padding of container)
export const MINIMAP_PAD = 3; // margin inside svg for data points
export const SCROLL_WIDTH = 20;

export const MINIMAP_D = (FILTER_PANEL_WIDTH - 2 - 8 - 8 - SCROLL_WIDTH - MINIMAP_MAR * 2 * MINIMAP_PERROW) / MINIMAP_PERROW;

export const MINIMAP_D_PREVIEW = 50;

export const CHARTCONFIG = {
  pad: {t: 40, r: 40, b: 160, l: 160},
  svgW: 720,
  svgH: 720
};

export const SLIDERW = 200;
export const SLIDERH = 8;
export const SLIDERHANDLESZIE = 16;