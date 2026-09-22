import { Image, type ImageStyle } from "react-native";

/**
 * The BPR logo — the same artwork the site serves, not a redrawing of it.
 *
 * The welcome screen used to approximate the mark with three hand-built
 * `View`s in the BA One pillar colours (work blue / health green / community
 * amber). That was never the brand: the real mark is moss-toned and sits above
 * a "bpr" wordmark. Drift like that is what a shared asset prevents.
 *
 * Two variants ship because the app mixes grounds: `Screen` paints the theme
 * background, which is bone `#F5F4F1`, while the welcome and chooser screens
 * hardcode slate `#20242D`. Bone artwork on a bone screen is invisible, so the
 * tone is explicit rather than guessed from the theme — the theme cannot tell
 * you what a hardcoded parent View is doing.
 */
export interface LogoProps {
  /** `ink` for light grounds (the default `Screen`), `bone` for dark ones. */
  tone?: "ink" | "bone";
  /** Rendered height in px; width follows the artwork's own ratio. */
  height?: number;
  style?: ImageStyle;
}

const ART = {
  ink: require("../../../assets/logo-ink.png"),
  bone: require("../../../assets/logo.png"),
};

export function Logo({ tone = "ink", height = 72, style }: LogoProps) {
  return (
    <Image
      source={ART[tone]}
      style={[{ height, aspectRatio: 581 / 674 }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="BPR"
    />
  );
}
