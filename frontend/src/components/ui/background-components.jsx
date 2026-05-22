import { cn } from "@/lib/utils";

/**
 * background-components.jsx — DoddBet Sunrise Gold backgrounds
 * Adapté depuis le template 21st.dev (SoftYellowGlow + SunriseGlow)
 * Projet JS (pas TypeScript) — shadcn-compatible structure
 *
 * Composants :
 *  - SunriseGlow       : halo doré centré, fond sombre (principal)
 *  - SoftYellowGlow    : halo jaune doux multiply (fond blanc)
 *  - GoldSpotlight     : halo or configurable (sections premium)
 *  - WarmGlow          : double halo chaud haut+bas
 */

/**
 * SunriseGlow — halo doré #eab308 centré
 * Adapté pour fond sombre #05070B
 * Usage : wrapper global app, hero section
 */
export const SunriseGlow = ({ className, children }) => (
  <div className={cn("relative w-full overflow-hidden", className)}>
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 0%,   rgba(234,179,8,0.45)  0%, transparent 60%),
          radial-gradient(circle at 20% 60%,  rgba(255,249,145,0.18) 0%, transparent 55%),
          radial-gradient(circle at 80% 40%,  rgba(252,191,73,0.22)  0%, transparent 55%),
          radial-gradient(circle at 50% 100%, rgba(234,179,8,0.14)   0%, transparent 50%)
        `,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * SoftYellowGlow — halo jaune doux avec multiply
 * Original template 21st.dev — pour fond BLANC uniquement
 */
export const SoftYellowGlow = ({ className, children }) => (
  <div className={cn("min-h-screen w-full relative bg-white", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle at center, #FFF991 0%, transparent 70%)`,
        opacity: 0.6,
        mixBlendMode: "multiply",
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * GoldSpotlight — halo or/ambre configurable
 * Usage : section picks du jour, badge Pro, CTA upgrade, pricing
 *
 * Props:
 *  - size      : rayon px (défaut 700)
 *  - x / y     : position (défaut "50%" / "0%")
 *  - intensity : opacité 0-1 (défaut 0.35)
 */
export const GoldSpotlight = ({
  className,
  children,
  size = 700,
  x = "50%",
  y = "0%",
  intensity = 0.35,
}) => (
  <div className={cn("relative overflow-hidden", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle ${size}px at ${x} ${y}, rgba(234,179,8,${intensity}), transparent)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * WarmGlow — double halo chaud haut + bas
 * Usage : page entière, landing
 */
export const WarmGlow = ({ className, children }) => (
  <div className={cn("relative w-full", className)}>
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% -10%, rgba(234,179,8,0.50) 0%, transparent 55%),
          radial-gradient(circle at 50% 110%, rgba(252,191,73,0.20) 0%, transparent 50%)
        `,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

export default SunriseGlow;
