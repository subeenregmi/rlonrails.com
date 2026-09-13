import { ImageResponse } from "next/og";

export const alt = "RL on Rails: a reinforcement learning roadmap from foundations to research";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#f7f7f3",
        color: "#111111",
        padding: 70,
      }}
    >
      <div style={{ display: "flex", color: "#0019a8", fontSize: 30 }}>RL ON RAILS</div>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 36, lineHeight: 1.05 }}>
        Your reinforcement learning roadmap
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#55575a", marginTop: 28 }}>
        Foundations · Deep RL · RLHF · Research
      </div>
      <div style={{ display: "flex", marginTop: 52, alignItems: "center" }}>
        {["#0019a8", "#e32017", "#00782a", "#9b0056"].map((colour) => (
          <div
            key={colour}
            style={{
              display: "flex",
              width: 260,
              height: 14,
              background: colour,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 34,
                height: 34,
                borderRadius: 40,
                background: "#ffffff",
                border: `7px solid ${colour}`,
              }}
            />
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
