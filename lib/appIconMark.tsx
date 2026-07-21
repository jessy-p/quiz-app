/** Shared visual mark for generated app icons — a warm glow on the Reading Lamp background. */
export function AppIconMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#17140f",
      }}
    >
      <div
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: "50%",
          background: "#dd9c42",
        }}
      />
    </div>
  );
}
