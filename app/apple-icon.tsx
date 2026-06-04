import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  const glyph =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
        <g stroke="#2e2519" stroke-linecap="round" fill="none">
          <ellipse cx="100" cy="111" rx="58" ry="51" stroke-opacity="0.26" stroke-width="2"/>
          <ellipse cx="100" cy="110" rx="40" ry="34" stroke-opacity="0.36" stroke-width="2.2"/>
          <ellipse cx="100" cy="109" rx="22" ry="18" stroke-opacity="0.5" stroke-width="2.4"/>
          <line x1="100" y1="40" x2="100" y2="118" stroke-opacity="0.7" stroke-width="3"/>
          <line x1="74" y1="58" x2="126" y2="58" stroke-opacity="0.55" stroke-width="2.6"/>
          <circle cx="100" cy="40" r="8" stroke-opacity="0.65" stroke-width="2.6"/>
        </g>
      </svg>`,
    )

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f3ec",
        }}
      >
        <img src={glyph} width={150} height={150} alt="" />
      </div>
    ),
    { ...size },
  )
}
