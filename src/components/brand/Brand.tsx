export const H_PATH = 'M0 0H19V42L53 31V0H72V100H53V50L19 61V100H0Z'

/** The rising-rung H: the crossbar climbs left to right. */
export function RisingH({ color = 'currentColor', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 72 100" className={className} style={{ height: '0.72em', width: 'auto', display: 'inline-block', verticalAlign: 'baseline', marginRight: '0.04em' }} aria-hidden>
      <path d={H_PATH} fill={color} />
    </svg>
  )
}

export function Wordmark({ deploy = '#F6EFE2', her = '#E0905F', className = '' }: { deploy?: string; her?: string; className?: string }) {
  return (
    <span className={`brand-font ${className}`} style={{ letterSpacing: '-0.035em', whiteSpace: 'nowrap' }} aria-label="DeployHER">
      <span style={{ color: deploy }}>Deploy</span>
      <span style={{ color: her }}>
        <RisingH color={her} />
        ER
      </span>
    </span>
  )
}

export function LogoPill() {
  return (
    <div className="pointer-events-auto rounded-full px-4 py-1.5 text-[19px] leading-none shadow-lg" style={{ background: '#1E4630' }}>
      <Wordmark />
    </div>
  )
}
