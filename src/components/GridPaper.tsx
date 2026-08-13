/**
 * Graph-paper backdrop — the structural signature of the layout.
 * Two nested grids: a fine 28px weave and a heavier 140px module.
 */
export default function GridPaper() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundImage: `
          linear-gradient(to right, var(--grid) 1px, transparent 1px),
          linear-gradient(to bottom, var(--grid) 1px, transparent 1px),
          linear-gradient(to right, var(--grid) 1px, transparent 1px),
          linear-gradient(to bottom, var(--grid) 1px, transparent 1px)
        `,
        backgroundSize: "28px 28px, 28px 28px, 140px 140px, 140px 140px",
        opacity: 0.5,
        maskImage:
          "radial-gradient(ellipse 120% 90% at 50% 0%, black 30%, transparent 88%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 120% 90% at 50% 0%, black 30%, transparent 88%)",
      }}
    />
  )
}
