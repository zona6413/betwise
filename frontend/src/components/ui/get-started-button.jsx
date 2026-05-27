export function GetStartedButton({ onClick, label = "Commencer", size = "lg" }) {
  const isSmall = size === "sm";

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#eab308',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: isSmall ? '6px 14px' : '11px 22px',
        fontSize: isSmall ? '13px' : '15px',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {label}
    </button>
  );
}
