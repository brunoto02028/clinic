import { Image, type ImageStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

/**
 * The BPR logo — the same artwork the site serves, not a redrawing of it.
 *
 * The welcome screen used to approximate the mark with three hand-built
 * `View`s in the BA One pillar colours (work blue / health green / community
 * amber). That was never the brand: the real mark is moss-toned and sits above
 * a "bpr" wordmark. Drift like that is what a shared asset prevents.
 *
 * Two variants ship because the app mixes grounds. The default now follows the
 * theme, which is what `Screen` paints: ink artwork on the light tone, bone on
 * the dark one. The sign-in screens used to pass `tone="ink"` outright — correct
 * while one palette existed, and an invisible logo the day the dark tone shipped
 * (Bruno's phone, 26/09/2026).
 *
 * `tone` stays overridable because a handful of screens paint their own dark
 * ground regardless of the theme — the welcome screen, the lock overlay, the
 * privacy cover. The theme cannot tell you what a hardcoded parent View is
 * doing, so those keep saying it.
 */
export interface LogoProps {
  /**
   * `ink` for light grounds, `bone` for dark ones. Omit it and the logo follows
   * the theme — only pass it on a ground that ignores the theme.
   */
  tone?: "ink" | "bone";
  /** Rendered height in px; width follows the artwork's own ratio. */
  height?: number;
  style?: ImageStyle;
}

const ART = {
  ink: require("../../../assets/logo-ink.png"),
  bone: require("../../../assets/logo.png"),
};

/** The artwork's own ratio; width is derived from it rather than declared. */
const RATIO = 581 / 674;

export function Logo({ tone, height = 72, style }: LogoProps) {
  const t = useTheme();
  return (
    <Image
      source={ART[tone ?? (t.isDark ? "bone" : "ink")]}
      // Width is computed, not left to `aspectRatio`: react-native-web does not
      // constrain width from it, so the image took its intrinsic 581px at every
      // height — enough to push a horizontal scrollbar onto the welcome screen
      // and shove the logo off-centre on the auth screens.
      style={[{ height, width: Math.round(height * RATIO) }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="BPR"
    />
  );
}
