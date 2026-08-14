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
        // Fades in from top, fully visible by the lower half of the viewport.
        maskImage: "linear-gradient(to bottom, transparent 0%, black 65%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 65%)",
      }}
    />
  )
}
