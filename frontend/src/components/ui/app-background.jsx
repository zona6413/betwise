export default function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10" style={{ background: '#05070B' }}>
      {/* Glow violet subtil en haut de page */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle 700px at 50% -60px, rgba(139,92,246,0.10), transparent)',
        }}
      />
      {/* Grille de points très discrets */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
