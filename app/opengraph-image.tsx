import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Мој Прилеп — граѓанска платформа за подобар град";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Loads a subset of a Google font as a TTF/OTF buffer so satori (next/og) can
 * render Cyrillic. Requesting via the css2 endpoint without a browser UA yields
 * a non-woff2 format that satori accepts. Runs at build time on Vercel.
 */
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(
    / /g,
    "+",
  )}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\(/);
  if (!src) throw new Error("font url not found");
  const res = await fetch(src[1]);
  if (!res.ok) throw new Error("font fetch failed");
  return res.arrayBuffer();
}

export default async function OpengraphImage() {
  const title = "Мој Прилеп";
  const tagline = "Граѓанска платформа за подобар град";
  const url = "mojprilep.mk";
  const glyphs = title + tagline + url;

  // Logo (white emblem) embedded as a data URI; gracefully skipped if missing.
  let logoSrc: string | null = null;
  try {
    const svg = await readFile(
      join(process.cwd(), "public/logo/logo-white.svg"),
      "utf-8",
    );
    logoSrc = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  } catch {
    logoSrc = null;
  }

  // Cyrillic-capable font; fall back to default font if the fetch fails so the
  // build never breaks on a flaky network.
  let fonts:
    | { name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[]
    | undefined;
  try {
    const [bold, regular] = await Promise.all([
      loadGoogleFont("Inter", 800, title + url),
      loadGoogleFont("Inter", 400, tagline),
    ]);
    fonts = [
      { name: "Inter", data: bold, weight: 800, style: "normal" },
      { name: "Inter", data: regular, weight: 400, style: "normal" },
    ];
  } catch {
    fonts = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #1f8e83 0%, #2aa99d 45%, #46c8bb 100%)",
          color: "white",
          fontFamily: "Inter",
          padding: 80,
          position: "relative",
        }}>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" height={210} style={{ marginBottom: 36 }} />
        ) : null}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
          }}>
          {title}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 38,
            fontWeight: 400,
            opacity: 0.92,
            textAlign: "center",
          }}>
          {tagline}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 56,
            fontSize: 30,
            fontWeight: 400,
            opacity: 0.85,
            letterSpacing: 1,
          }}>
          {url}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
