import { cn } from '@/lib/utils'

/**
 * Uforia UFO mark — an inline SVG flying saucer with a glowing beam.
 * Rendered as SVG so it scales crisply and can be themed via currentColor.
 */
export function UfoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Astronomical_unit_svg.svg/1280px-Astronomical_unit_svg.svg.png"
      className={cn('h-8 w-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="uforia-dome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="uforia-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="uforia-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Beam */}
      <path d="M22 40 L42 40 L52 60 L12 60 Z" fill="url(#uforia-beam)" />

      {/* Saucer body */}
      <ellipse cx="32" cy="36" rx="24" ry="9" fill="url(#uforia-body)" />
      <ellipse cx="32" cy="34" rx="24" ry="8" fill="url(#uforia-body)" opacity="0.9" />

      {/* Dome */}
      <path
        d="M18 31 A14 13 0 0 1 46 31 Z"
        fill="url(#uforia-dome)"
      />

      {/* Lights */}
      <circle cx="18" cy="37" r="2" fill="#10b981" />
      <circle cx="32" cy="39" r="2" fill="#34d399" />
      <circle cx="46" cy="37" r="2" fill="#10b981" />
    </svg>
  )
}

/**
 * Full Uforia wordmark: the UFO mark plus the gradient "Uforia" text.
 */
export function Logo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <UfoMark className="h-8 w-8 drop-shadow-[0_0_10px_rgba(167,139,250,0.6)]" />
      {showText && (
        <span className="font-display text-xl font-extrabold tracking-tight text-cosmic">
          Uforia
        </span>
      )}
    </span>
  )
}
