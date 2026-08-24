import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BASE_WIDTH = 375; // iPhone standard baseline

/**
 * Responsive font scaling. Scales a design-time font size against the
 * current device width, with a moderating factor so it doesn't scale
 * linearly (and get huge/tiny) on very large or very small screens.
 */
export function rf(size: number, factor = 0.3): number {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const scaled = size + (scale * size - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
}
