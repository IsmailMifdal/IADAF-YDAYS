/**
 * The app icon, drawn rather than lettered: a sheet of paper with lines on
 * the gradient of the app's buttons. The fonts bundled with next/og have no
 * bold weight, and a thin "IA" read poorly on a home screen.
 */

import { ImageResponse } from "next/og";

const BLUE = "#2563eb";

/** `mark`: share of the side taken by the sheet (smaller for maskable icons). */
export function appIcon(size: number, mark = 0.5): ImageResponse {
  const sheetWidth = size * mark * 0.8;
  const sheetHeight = size * mark;
  const line = Math.max(2, Math.round(size * mark * 0.075));
  const bar = (width: string) => (
    <div style={{ width, height: line, borderRadius: line, backgroundColor: BLUE }} />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `linear-gradient(135deg, ${BLUE}, #4338ca)`,
        }}
      >
        <div
          style={{
            width: sheetWidth,
            height: sheetHeight,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: line * 1.4,
            padding: `0 ${sheetWidth * 0.18}px`,
            borderRadius: sheetWidth * 0.12,
            backgroundColor: "white",
          }}
        >
          {bar("100%")}
          {bar("100%")}
          {bar("62%")}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
