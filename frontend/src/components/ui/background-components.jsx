import { cn } from "@/lib/utils";

/**
 * background-components.jsx — DoddBet ambient backgrounds
 *
 * ⚠️ Projet JS (pas TypeScript) — adapté depuis le template 21st.dev
 *
 * Composants disponibles :
 *  - DoddBetGlow       : fond principal multi-halo (vert + or + rouge), fort contraste
 *  - SunriseGlow       : halo soleil doré centré (fond blanc/clair)
 *  - SoftYellowGlow    : halo jaune doux (multiply, fond blanc)
 *  - GreenSpotlight    : halo vert pelouse — sections Pro / picks
 *  - GoldSpotlight     : halo or — sections premium / CdM
 */

/**
 * DoddBetGlow — fond principal de l'app DoddBet
 * Halo vert (haut-gauche) + or (bas-droit) + rouge (centre)
 * Fort contraste sur fond sombre #05070B
 */
export const DoddBetGlow = ({ className, children }) => (
  <div className={cn("relative w-full", className)}>
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 90% 60% at 15% 8%,  rgba(22,163,74,0.32)  0%, transparent 65%),
          radial-gradient(ellipse 70% 50% at 85% 85%, rgba(252,191,73,0.26)  0%, transparent 65%),
          radial-gradient(ellipse 60% 70% at 50% 45%, rgba(220,38,38,0.13)   0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 70% 15%, rgba(252,191,73,0.14)  0%, transparent 60%)
        `,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * SunriseGlow — halo doré centré (original demo adapté)
 * Usage : sections landing, hero cards
 */
export const SunriseGlow = ({ className, children }) => (
  <div className={cn("relative w-full overflow-hidden", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle at center, rgba(234,179,8,0.35), transparent 70%)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * SoftYellowGlow — halo jaune doux avec multiply (fond clair)
 * Usage : sections light / landing page blanche
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
 * GreenSpotlight — halo vert pelouse configurable
 * Usage : section picks du jour, badge Pro, CTA upgrade
 *
 * Props:
 *  - size  : rayon px (défaut 700)
 *  - x     : position X (défaut "20%")
 *  - y     : position Y (défaut "0px")
 *  - intensity : opacité 0-1 (défaut 0.28)
 */
export const GreenSpotlight = ({
  className,
  children,
  size = 700,
  x = "20%",
  y = "0px",
  intensity = 0.28,
}) => (
  <div className={cn("relative overflow-hidden", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle ${size}px at ${x} ${y}, rgba(22,163,74,${intensity}), transparent)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * GoldSpotlight — halo or/ambre configurable
 * Usage : section annuelle / meilleure offre, World Cup countdown
 *
 * Props:
 *  - size      : rayon px (défaut 600)
 *  - x / y     : position (défaut "80%" / "80%")
 *  - intensity : opacité 0-1 (défaut 0.24)
 */
export const GoldSpotlight = ({
  className,
  children,
  size = 600,
  x = "80%",
  y = "80%",
  intensity = 0.24,
}) => (
  <div className={cn("relative overflow-hidden", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle ${size}px at ${x} ${y}, rgba(252,191,73,${intensity}), transparent)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

export default DoddBetGlow;
