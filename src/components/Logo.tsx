import { useId } from "react"

/**
 * The mark: two overlapping four-point sparkles, given a hand-sketched
 * wobble and a paper-grain texture so it doesn't read as a stock icon.
 */

// A single sparkle/twinkle glyph, drawn in its own local space and
// centered at (0,0) so it can be repositioned with a plain translate.
const SPARKLE_D =
  "M0.813 3.904 L0 6.75 l-0.813 -2.846 a4.5 4.5 0 0 0 -3.09 -3.09 L-6.75 0 l2.846 -0.813 a4.5 4.5 0 0 0 3.09 -3.09 L0 -6.75 l0.813 2.846 a4.5 4.5 0 0 0 3.09 3.09 L6.75 0 l-2.846 0.813 a4.5 4.5 0 0 0 -3.09 3.09 Z"

interface Props {
  size?: number
  className?: string
}

export default function Logo({ size = 30, className }: Props) {
  const uid = useId()
  const sketchId = `sketch-${uid}`
  const grainId = `grain-${uid}`
  const maskId = `mask-${uid}`

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Design & Research"
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      <defs>
        {/* Hand-drawn wobble: nudges the path edges off-grid */}
        <filter id={sketchId} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="6" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Paper grain, generated once and clipped to the mark below */}
        <filter id={grainId} x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="14" result="n2" />
          <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 0" />
        </filter>
        <mask id={maskId}>
          <g fill="white">
            <path d={SPARKLE_D} transform="translate(26,40) scale(2.55)" />
            <path d={SPARKLE_D} transform="translate(43,23) scale(1.5)" />
          </g>
        </mask>
      </defs>

      <g fill="var(--ink)" filter={`url(#${sketchId})`}>
        <path d={SPARKLE_D} transform="translate(26,40) scale(2.55)" />
        <path d={SPARKLE_D} transform="translate(43,23) scale(1.5)" />
      </g>

      {/* Grain sits only inside the sparkle silhouette, lightening it unevenly */}
      <rect
        width="64"
        height="64"
        mask={`url(#${maskId})`}
        filter={`url(#${grainId})`}
        opacity="0.5"
        style={{ mixBlendMode: "soft-light" }}
      />
    </svg>
  )
}
