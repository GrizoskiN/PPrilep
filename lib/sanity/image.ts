/**
 * Sanity image URL helper.
 *
 * Usage:
 *   import { urlForImage } from "@/lib/sanity/image";
 *   <img src={urlForImage(post.coverImage).width(800).url()} />
 */

import { createImageUrlBuilder } from "@sanity/image-url";
import { sanityClient } from "./client";

const builder = createImageUrlBuilder(sanityClient);
type SanityImageSource = Parameters<(typeof builder)["image"]>[0];

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
