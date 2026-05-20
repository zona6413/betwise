import { cn } from "@/lib/utils";

/**
 * RadialGlowBackground — 21st.dev adaptation
 * Fond avec halo radial configurable.
 *
 * Props:
 *  - color     : couleur du glow (défaut: violet BetWise)
 *  - size      : rayon du cercle en px (défaut: 500)
 *  - x         : position X en % (défaut: "50%")
 *  - y         : position Y en px ou % (défaut: "50%")
 *  - className : classes supplémentaires sur le wrapper
 *  - children  : contenu par-dessus le fond
 */
export function RadialGlowBackground({
  color = "rgba(139,92,246,0.35)",
  size = 500,
  x = "50%",
  y = "50%",
  className,
  children,
}) {
  return (
    <div className={cn("relative w-full h-full", className)}>
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle ${size}px at ${x} ${y}, ${color}, transparent)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Variante dark (gris) */
export function DarkRadialGlow({ className, children }) {
  return (
    <RadialGlowBackground
      color="rgba(62,62,62,0.5)"
      size={500}
      x="50%"
      y="200px"
      className={className}
    >
      {children}
    </RadialGlowBackground>
  );
}

/** Variante pink */
export function PinkRadialGlow({ className, children }) {
  return (
    <RadialGlowBackground
      color="rgba(236,72,153,0.4)"
      size={500}
      x="50%"
      y="100px"
      className={className}
    >
      {children}
    </RadialGlowBackground>
  );
}
