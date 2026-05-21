import { cn } from "@/lib/utils";

/**
 * Glow Backgrounds — 21st.dev adaptation (dark theme BetWise)
 *
 * Variants:
 *  - YellowGlow   : halo jaune doux (light, non utilisé en dark)
 *  - SunriseGlow  : halo doré (original demo)
 *  - GoldGlow     : halo ambre/or → section Pro / premium BetWise
 *  - VioletGlow   : halo violet → section principale BetWise
 */

/** Halo jaune doux — fond blanc (original) */
export const YellowGlow = ({ className, children }) => (
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

/** Halo sunrise doré — fond blanc (original demo) */
export const SunriseGlow = ({ className, children }) => (
  <div className={cn("min-h-screen w-full relative overflow-hidden bg-white", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle at center, #eab308, transparent)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * GoldGlow — halo ambre/or sur fond sombre BetWise
 * Idéal pour : section Pro, badge premium, picks du jour
 */
export const GoldGlow = ({ className, children, size = 600, x = "50%", y = "0px" }) => (
  <div className={cn("relative overflow-hidden", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle ${size}px at ${x} ${y}, rgba(234,179,8,0.12), transparent)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);

/**
 * VioletGlow — halo violet BetWise
 * Usage général pour les sections principales
 */
export const VioletGlow = ({ className, children, size = 600, x = "50%", y = "0px" }) => (
  <div className={cn("relative overflow-hidden", className)}>
    <div
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle ${size}px at ${x} ${y}, rgba(139,92,246,0.15), transparent)`,
      }}
    />
    <div className="relative z-10">{children}</div>
  </div>
);
