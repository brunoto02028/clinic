export function ThermographyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="tg-hot1" cx="50%" cy="40%" r="35%">
          <stop offset="0%" stopColor="#ff2200" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#ff6600" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tg-hot2" cx="50%" cy="60%" r="25%">
          <stop offset="0%" stopColor="#ffaa00" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffaa00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tg-warm1" cx="30%" cy="50%" r="20%">
          <stop offset="0%" stopColor="#ffdd00" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffdd00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tg-warm2" cx="70%" cy="50%" r="20%">
          <stop offset="0%" stopColor="#ffdd00" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ffdd00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tg-cool" cx="50%" cy="80%" r="30%">
          <stop offset="0%" stopColor="#00aaff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00aaff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tg-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a0a2e" />
          <stop offset="100%" stopColor="#0a1a2e" />
        </linearGradient>
        {/* Colour scale gradient */}
        <linearGradient id="tg-scale" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff2200" />
          <stop offset="25%" stopColor="#ff8800" />
          <stop offset="50%" stopColor="#ffdd00" />
          <stop offset="75%" stopColor="#00ddff" />
          <stop offset="100%" stopColor="#0022ff" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="400" height="300" fill="url(#tg-body)" />

      {/* Body silhouette */}
      <ellipse cx="200" cy="70" rx="28" ry="35" fill="#111827" />
      <path
        d="M160 100 Q155 130 150 180 Q148 210 155 240 L165 240 L168 200 L172 200 L175 240 L185 240 L182 180 L185 130 L200 140 L215 130 L218 180 L215 240 L225 240 L228 200 L232 200 L235 240 L245 240 Q252 210 250 180 Q245 130 240 100 Q220 110 200 108 Q180 110 160 100Z"
        fill="#111827"
      />

      {/* Heat overlays */}
      <ellipse cx="200" cy="120" rx="80" ry="90" fill="url(#tg-hot1)" />
      <ellipse cx="200" cy="175" rx="60" ry="70" fill="url(#tg-hot2)" />
      <ellipse cx="155" cy="155" rx="40" ry="50" fill="url(#tg-warm1)" />
      <ellipse cx="245" cy="155" rx="40" ry="50" fill="url(#tg-warm2)" />
      <ellipse cx="200" cy="230" rx="60" ry="40" fill="url(#tg-cool)" />

      {/* Scan lines overlay */}
      {Array.from({ length: 30 }, (_, i) => (
        <line
          key={i}
          x1="90"
          y1={40 + i * 8}
          x2="310"
          y2={40 + i * 8}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
        />
      ))}

      {/* Temperature scale bar */}
      <rect x="340" y="40" width="14" height="220" rx="2" fill="url(#tg-scale)" />
      <text x="356" y="44" fill="#ff2200" fontSize="8" fontFamily="monospace">42°</text>
      <text x="356" y="154" fill="#ffdd00" fontSize="8" fontFamily="monospace">34°</text>
      <text x="356" y="264" fill="#0066ff" fontSize="8" fontFamily="monospace">26°</text>

      {/* Crosshair */}
      <circle cx="200" cy="118" r="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <line x1="200" y1="104" x2="200" y2="110" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <line x1="200" y1="126" x2="200" y2="132" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <line x1="186" y1="118" x2="192" y2="118" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <line x1="208" y1="118" x2="214" y2="118" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <text x="215" y="115" fill="rgba(255,255,255,0.7)" fontSize="8" fontFamily="monospace">38.4°C</text>

      {/* Corner labels */}
      <text x="95" y="54" fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace">IR THERMAL SCAN</text>
      <text x="95" y="276" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">BPR · INFRARED ANALYSIS</text>
    </svg>
  );
}
