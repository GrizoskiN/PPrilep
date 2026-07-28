/**
 * JPEG quality levels for `next/image`, in one place so the feed and the
 * opened view can't drift apart.
 *
 * Feed images are scrolled past — most are never looked at closely, so they get
 * a cheaper encode. Once a user deliberately opens a photo they're actually
 * looking at it, so it gets the same 0.8 the mobile app uploads at.
 *
 * Every value here MUST also be listed in `images.qualities` in next.config.ts:
 * Next 16 allows only `[75]` by default and rejects any other quality.
 */
export const IMAGE_QUALITY = {
  /** Cards in a scrolling feed. */
  feed: 50,
  /** A photo the user opened — detail page or lightbox. */
  opened: 80,
} as const;
