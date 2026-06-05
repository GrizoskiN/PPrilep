"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches errors thrown in the root layout itself (which the (main)/error.tsx
 * boundary cannot reach). It replaces the whole document, so it ships its own
 * <html>/<body> and uses inline styles — no dependency on the app stylesheet,
 * which may itself be the thing that failed to load.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="mk">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
          background: "#f2f4f7",
          color: "#314155",
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#0f172b", margin: 0 }}>
            Нешто не е во ред
          </h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#627188" }}>
            Настана неочекувана грешка. Обидете се повторно.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 4,
                fontFamily: "monospace",
                fontSize: 10,
                color: "#8b96a3",
              }}>
              {error.digest}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={reset}
            style={{
              borderRadius: 9999,
              border: "1px solid #cbd5e1",
              background: "white",
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}>
            Обиди се повторно
          </button>
          <a
            href="/"
            style={{
              borderRadius: 9999,
              background: "#2aa99d",
              padding: "8px 18px",
              fontSize: 14,
              fontWeight: 600,
              color: "white",
              textDecoration: "none",
            }}>
            Почетна
          </a>
        </div>
      </body>
    </html>
  );
}
