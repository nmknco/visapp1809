export const ItemTypes = {
  ATTRIBUTE: 'attribute',
};

export const MINIMAP_PERROW = 3;
export const RIGHT_PANEL_WIDTH = 300;
export const MINIMAP_MAR = 2; // margin around svg (used as padding of container)
export const MINIMAP_PAD = 3; // margin inside svg for data points
export const SCROLL_WIDTH = 20;

export const MINIMAP_D = (
  RIGHT_PANEL_WIDTH - 2 - 8 - 8 - SCROLL_WIDTH - MINIMAP_MAR * 2 * MINIMAP_PERROW) / MINIMAP_PERROW;