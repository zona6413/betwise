import ShaderBackground from '@/components/ui/shader-background';

/**
 * AppBackground — fond global animé BetWise
 * Utilise un shader WebGL avec lignes plasma violettes.
 * Fallback automatique si WebGL non supporté (canvas caché, fond CSS).
 */
export default function AppBackground() {
  return (
    <>
      {/* Fond CSS de secours (visible si WebGL indisponible) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -11,
          background: '#05070B',
        }}
      />
      {/* Shader animé WebGL */}
      <ShaderBackground />
    </>
  );
}
