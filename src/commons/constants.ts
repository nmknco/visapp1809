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

export const DEFAULT_DOT_COLOR = 'hsl(0, 0%, 60%)'; // #999999
export const DEFAULT_DOT_SIZE = 7;
export const DEFAULT_DOT_SIZE_RANGE: Readonly<[number, number]> = [3, 15];
export const MAX_DOT_SIZE_RANGE: Readonly<[number, number]> = [2, 30];
export const DEFAULT_BAR_COLOR = 'hsl(0, 0%, 60%)';
export const DEFAULT_BAR_SIZE = 30;
export const DEFAULT_BAR_SIZE_RANGE: Readonly<[number, number]> = [10, 64];
export const MAX_BAR_SIZE_RANGE: Readonly<[number, number]> = [5, 128];
export const BAR_PADDING = 20;
export const BAR_XBORDER_W = 3;
