/**
 * Cover images sized for Facebook and Instagram WITHOUT cropping.
 *
 * We used to hand both networks a 1080×1080 `fit("crop")` square, which meant
 * Sanity cut the top and bottom off every portrait poster — the format most
 * event posters arrive in. The date and venue usually live in exactly the strip
 * that got thrown away.
 *
 * Facebook accepts any aspect ratio, so it gets the whole image, untouched.
 *
 * Instagram only accepts ratios between 4:5 (0.8, portrait) and 1.91:1
 * (landscape) and will crop anything outside that range itself. So we check the
 * natural ratio first: inside the range the image is sent as-is; outside it —
 * a tall poster — we PAD onto a 4:5 canvas instead of cropping, which keeps the
 * whole poster visible at the largest portrait size Instagram allows.
 *
 * Dimensions come from the asset `_ref`, which Sanity formats as
 * `image-<hash>-<width>x<height>-<ext>`.
 */
import { urlForImage } from "@/lib/sanity/image";

/** Instagram's accepted aspect-ratio window (width / height). */
const IG_MIN_RATIO = 0.8; // 4:5 portrait
const IG_MAX_RATIO = 1.91; // 1.91:1 landscape

const IG_MAX_WIDTH = 1080;
const IG_PORTRAIT_HEIGHT = 1350; // 1080 × 1350 = 4:5
const FB_MAX_WIDTH = 1200;

/** Padding colour behind a poster too tall for Instagram. */
const PAD_COLOR = "000000";

type SanityImage = { asset?: { _ref?: string } | null } | null | undefined;

/** Width/height baked into a Sanity asset ref, or null if it can't be read. */
export function imageDimensions(image: SanityImage): { width: number; height: number } | null {
  const ref = image?.asset?._ref;
  if (!ref) return null;
  const m = /-(\d+)x(\d+)-/.exec(ref);
  if (!m) return null;
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (!width || !height) return null;
  return { width, height };
}

export type SocialImages = { facebook: string; instagram: string } | null;

export function socialImageUrls(image: SanityImage): SocialImages {
  if (!image?.asset) return null;

  // Whole image, just bounded and converted — `max` never crops.
  const facebook = urlForImage(image as never)
    .width(FB_MAX_WIDTH)
    .fit("max")
    .format("jpg") // Instagram requires JPEG; FB photo posts prefer it too.
    .url();

  const dims = imageDimensions(image);
  const ratio = dims ? dims.width / dims.height : null;

  // Unknown dimensions, or a ratio Instagram already accepts: send it whole.
  if (ratio === null || (ratio >= IG_MIN_RATIO && ratio <= IG_MAX_RATIO)) {
    const instagram = urlForImage(image as never)
      .width(IG_MAX_WIDTH)
      .fit("max")
      .format("jpg")
      .url();
    return { facebook, instagram };
  }

  // Too tall (or too wide) for Instagram — pad rather than crop. `fill` scales
  // the image to fit inside the canvas and fills the remainder with `bg`.
  const canvasHeight = ratio < IG_MIN_RATIO ? IG_PORTRAIT_HEIGHT : Math.round(IG_MAX_WIDTH / IG_MAX_RATIO);
  const instagram = urlForImage(image as never)
    .width(IG_MAX_WIDTH)
    .height(canvasHeight)
    .fit("fill")
    .bg(PAD_COLOR)
    .format("jpg")
    .url();

  return { facebook, instagram };
}
