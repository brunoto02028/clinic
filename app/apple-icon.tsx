import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
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
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#5dc9c0",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          BPR
        </div>
      </div>
    ),
    { ...size }
  );
}
