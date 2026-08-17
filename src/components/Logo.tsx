import rrLogo from "../imports/RR.png"

interface Props {
  size?: number
  className?: string
}

export default function Logo({ size = 30, className }: Props) {
  return (
    <img
      src={rrLogo}
      width={size}
      height={size}
      alt="Design & Research"
      className={className}
      style={{ objectFit: "contain", flexShrink: 0 }}
    />
  )
}
