/**
 * Sanity image URL helper.
 *
 * Usage:
 *   import { urlForImage } from "@/lib/sanity/image";
 *   <img src={urlForImage(post.coverImage).width(800).url()} />
 */

import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { sanityClient } from "./client";

const builder = imageUrlBuilder(sanityClient);

export function urlForImage(source: SanityImageSource) {
  return builder.image(source);
}
