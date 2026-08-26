/**
 * Shrink a picked image in the browser before it reaches Supabase Storage.
 *
 * The web upload paths used to hand the user's file straight to `.upload()`,
 * so a phone-camera PNG landed in the bucket at its original 9MB. Measured
 * across the live `issue-photos` bucket, web uploads averaged 3.77MB against
 * mobile's 0.55MB — 6.9x larger for the same kind of photo — because the mobile
 * app has always re-encoded its picks (see mojprilep-mobile/src/lib/pickImage.ts).
 *
 * That size is not just storage. There is no server-side resizer in front of
 * Storage on our plan, so while the WEB feed renders these through next/image
 * and gets a resized WebP, the MOBILE app downloads the original bytes. Every
 * oversized web upload is therefore billed as Supabase egress against mobile
 * viewers — which is what made cached egress the dominant line on the bill.
 *
 * The knobs below deliberately match pickImage.ts. One number in two places is
 * worth it here: a photo should not depend on which client happened to upload it.
 */

/** Longest edge we keep — same cap the mobile app applies. */
const MAX_DIMENSION = 1000;
/** JPEG quality — same as mobile; visually indistinguishable at this size. */
const QUALITY = 0.8;

/**
 * Formats to pass through untouched.
 *
 * • SVG and GIF: canvas would rasterise the first frame and silently destroy
 *   an animation or a vector logo.
 * • HEIC: no browser but Safari can decode it, so `createImageBitmap` throws.
 *   The upload UIs reject it up front with a clear message; this is a backstop.
 */
const PASSTHROUGH = /^image\/(svg\+xml|gif|heic|heif)$/i;

/**
 * Re-encode `file` as a capped-size JPEG. Only ever downscales — a photo
 * already under the cap keeps its dimensions and is merely re-encoded.
 *
 * Returns the ORIGINAL file whenever compression would not help: an unsupported
 * format, a browser without the APIs, a decode failure, or a result that came
 * out no smaller than what we started with (already-optimised JPEGs and small
 * PNG screenshots both hit that last case). Callers can therefore always upload
 * what they get back, and a failure here degrades to today's behaviour rather
 * than blocking the report someone is trying to file.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || PASSTHROUGH.test(file.type)) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  try {
    // `from-image` applies the EXIF orientation tag while decoding. Without it,
    // photos taken in portrait on a phone are re-encoded sideways — the tag is
    // dropped by the canvas round-trip, so it has to be honoured here.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // JPEG has no alpha: without this, transparent PNG pixels encode as black.
    // White matches every surface we render these photos on.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    // The name carries the extension the upload helpers derive the storage key
    // from, so it has to change with the format or the object's key, extension
    // and Content-Type would disagree.
    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Decode failure (corrupt file, exotic format, out of memory on a huge
    // image): upload the original rather than losing the user's photo.
    return file;
  }
}
