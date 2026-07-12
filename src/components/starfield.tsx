'use client'

import { useMemo } from 'react'

/**
 * Realistic deep-space background.
 *
 * Renders a fixed, full-screen layer behind all content containing:
 *  - a deep, near-black space gradient with subtle teal nebula clouds
 *  - a faint diagonal "milky way" star band for depth
 *  - multi-layered stars of varied size, brightness and slight colour
 *  - a few slow, occasional shooting stars
 *  - a single subtle, realistic UFO drifting slowly across the sky
 *
 * Purely decorative and pointer-events-none so it never blocks interaction.
 */
export function Starfield({ count = 160 }: { count?: number }) {
  // Generate star positions once on mount (deterministic per render).
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map(() => {
        // Most stars are small/dim; a few are bright. Gives a realistic depth.
        const r = Math.random()
        const size = r > 0.94 ? Math.random() * 1.6 + 1.6 : Math.random() * 1.2 + 0.4
        // Subtle colour temperature variation: mostly white, some cool blue / warm.
        const tint =
          r > 0.9
            ? 'rgba(190, 225, 255, '
            : r > 0.8
            ? 'rgba(255, 240, 220, '
            : 'rgba(255, 255, 255, '
        return {
          top: Math.random() * 100,
          left: Math.random() * 100,
          size,
          delay: Math.random() * 6,
          duration: Math.random() * 3 + 2.5,
          opacity: Math.random() * 0.6 + 0.25,
          tint,
        }
      }),
    [count],
  )

  // A handful of brighter foreground stars with a soft glow halo.
  const brightStars = useMemo(
    () =>
      Array.from({ length: 8 }).map(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.5 + 2,
        delay: Math.random() * 5,
        duration: Math.random() * 2 + 3,
      })),
    [],
  )

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      style={{ backgroundColor: '#02040a' }}
    >
      {/* Deep space base — near-black with a faint cool vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% -20%, #06121c 0%, #040810 45%, #02040a 100%)',
        }}
      />

      {/* Subtle green nebula clouds (very low opacity for realism) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 18% 22%, hsl(155 90% 45% / 0.10), transparent 60%),' +
            'radial-gradient(ellipse 45% 38% at 82% 12%, hsl(160 85% 50% / 0.08), transparent 60%),' +
            'radial-gradient(ellipse 60% 45% at 65% 88%, hsl(150 70% 40% / 0.07), transparent 65%),' +
            'radial-gradient(ellipse 40% 30% at 35% 70%, hsl(165 80% 45% / 0.05), transparent 60%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Faint diagonal galactic band ("milky way") for depth */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            'linear-gradient(115deg, transparent 35%, hsl(190 60% 70% / 0.05) 48%, hsl(200 50% 80% / 0.07) 52%, hsl(190 60% 70% / 0.05) 56%, transparent 68%)',
          filter: 'blur(6px)',
        }}
      />

      {/* Slow-drifting aurora glow */}
      <div className="aurora absolute inset-0" />

      {/* Distant star field */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute rounded-full"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: `${s.tint}${s.opacity})`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Bright foreground stars with glow halo */}
      {brightStars.map((s, i) => (
        <span
          key={`b-${i}`}
          className="animate-twinkle absolute rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            boxShadow:
              '0 0 6px 1px rgba(255,255,255,0.8), 0 0 12px 3px rgba(16,185,129,0.3)',
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Occasional shooting stars */}
      <span className="shooting-star shooting-star-1" />
      <span className="shooting-star shooting-star-2" />

      {/* Subtle realistic UFO drifting slowly across the sky */}
      <div className="ufo-drift absolute" style={{ top: '18%' }}>
        <RealisticUfo />
      </div>
    </div>
  )
}

/**
 * A subtle, semi-realistic flying saucer rendered as SVG.
 * Muted metallic tones with a faint cyan underglow so it blends into the
 * deep-space background rather than dominating it.
 */
function RealisticUfo() {
  return (
    <svg
      width="150"
      height="80"
      viewBox="0 0 150 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.5 }}
    >
      <defs>
        {/* Metallic hull body — brushed steel with cool tones */}
        <linearGradient id="ufo-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b6b78" />
          <stop offset="35%" stopColor="#39474f" />
          <stop offset="50%" stopColor="#2a353c" />
          <stop offset="65%" stopColor="#1c252b" />
          <stop offset="100%" stopColor="#10171c" />
        </linearGradient>
        {/* Glass dome with subtle green reflection */}
        <radialGradient id="ufo-dome" cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#34d399" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#065f46" stopOpacity="0.7" />
        </radialGradient>
        {/* Faint underbeam glow */}
        <radialGradient id="ufo-glow" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        <filter id="ufo-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* Soft underglow */}
      <ellipse cx="75" cy="58" rx="46" ry="16" fill="url(#ufo-glow)" filter="url(#ufo-blur)" />

      {/* Lower hull */}
      <ellipse cx="75" cy="46" rx="62" ry="15" fill="url(#ufo-hull)" />
      {/* Hull rim highlight */}
      <ellipse cx="75" cy="44" rx="62" ry="13" fill="#42525c" opacity="0.5" />
      {/* Upper hull plate */}
      <ellipse cx="75" cy="42" rx="48" ry="11" fill="url(#ufo-hull)" />

      {/* Glass dome */}
      <path
        d="M52 40 A24 20 0 0 1 98 40 Z"
        fill="url(#ufo-dome)"
      />
      {/* Dome highlight */}
      <ellipse cx="68" cy="31" rx="7" ry="4" fill="#eafbff" opacity="0.5" />

      {/* Rim navigation lights */}
      <circle cx="30" cy="46" r="2.2" fill="#10b981" opacity="0.9" />
      <circle cx="50" cy="51" r="2.2" fill="#34d399" opacity="0.85" />
      <circle cx="75" cy="53" r="2.4" fill="#10b981" opacity="0.95" />
      <circle cx="100" cy="51" r="2.2" fill="#34d399" opacity="0.85" />
      <circle cx="120" cy="46" r="2.2" fill="#10b981" opacity="0.9" />
    </svg>
  )
}
