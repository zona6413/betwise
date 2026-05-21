export default function AppBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -10, background: '#05070B' }}>

      {/* ── Halo rouge CdM — coin haut gauche, étalé ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 900px at -5% -10%, rgba(220,38,38,0.22), transparent 70%)',
      }} />
      {/* Halo rouge secondaire — renfort droit bas */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 500px at 15% 80%, rgba(220,38,38,0.07), transparent 70%)',
      }} />

      {/* ── Halo vert pelouse — coin haut droit ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 900px at 105% -10%, rgba(22,163,74,0.20), transparent 70%)',
      }} />
      {/* Halo vert secondaire — renfort gauche bas */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 450px at 85% 85%, rgba(22,163,74,0.06), transparent 70%)',
      }} />

      {/* ── Halo or — centre haut, dominant ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 700px at 50% -80px, rgba(252,191,73,0.28), transparent 65%)',
      }} />
      {/* Halo or — couche intérieure plus chaude */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 350px at 50% -40px, rgba(252,191,73,0.18), transparent 60%)',
      }} />

      {/* ── Halo orange chaud — liant rouge/or ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle 600px at 28% -60px, rgba(247,127,0,0.10), transparent 65%)',
      }} />

      {/* ── Grille de points discrets ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

    </div>
  );
}
