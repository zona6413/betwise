import { ChevronRight } from "lucide-react";
import { useState } from "react";

export function GetStartedButton({ onClick, label = "Commencer", size = "lg" }) {
  const [hovered, setHovered] = useState(false);
  const isSmall = size === "sm";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: '#8B5CF6',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        padding: isSmall ? '6px 12px 6px 12px' : '10px 18px',
        fontSize: isSmall ? '13px' : '15px',
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        gap: '8px',
        transition: 'background 0.2s ease',
      }}
    >
      {/* Texte — visible seulement au hover */}
      <span style={{
        maxWidth: hovered ? '160px' : '0px',
        overflow: 'hidden',
        opacity: hovered ? 1 : 0,
        transition: 'max-width 0.35s ease, opacity 0.25s ease',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>

      {/* Chevron — visible seulement au repos */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: hovered ? '0px' : '20px',
        overflow: 'hidden',
        opacity: hovered ? 0 : 1,
        transition: 'max-width 0.35s ease, opacity 0.25s ease',
      }}>
        <ChevronRight size={isSmall ? 14 : 16} strokeWidth={2.5} />
      </span>
    </button>
  );
}
