import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = parseInt(searchParams.get("size") || "512", 10);
  const maskable = searchParams.get("maskable") === "1";

  // For maskable icons, add extra padding (safe zone is inner 80%)
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const fontSize = maskable ? Math.round(size * 0.3) : Math.round(size * 0.38);

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
          background: "white",
          padding: `${padding}px`,
        }}
      >
        <div
          style={{
            fontSize: fontSize,
            fontWeight: 800,
            color: "#5dc9c0",
            letterSpacing: "-1px",
            lineHeight: 1,
          }}
        >
          BPR
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
