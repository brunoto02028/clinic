"use client";

export function ThermographyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 450"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0f1e" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>

        {/* Heat map gradients */}
        <radialGradient id="heat-head" cx="0.5" cy="0.4" r="0.5" fx="0.5" fy="0.4">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#f97316" stopOpacity="0.7" />
          <stop offset="70%" stopColor="#eab308" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
        </radialGradient>

        <radialGradient id="heat-chest" cx="0.5" cy="0.35" r="0.6" fx="0.5" fy="0.35">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.85" />
          <stop offset="25%" stopColor="#ef4444" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="75%" stopColor="#eab308" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
        </radialGradient>

        <radialGradient id="heat-shoulder-l" cx="0.6" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
        </radialGradient>

        <radialGradient id="heat-shoulder-r" cx="0.4" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#f97316" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0.2" />
        </radialGradient>

        <radialGradient id="heat-knee-l" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#eab308" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" />
        </radialGradient>

        <radialGradient id="heat-knee-r" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#f97316" stopOpacity="0.55" />
          <stop offset="80%" stopColor="#eab308" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </radialGradient>

        <linearGradient id="heat-arm-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#eab308" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="heat-arm-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#f97316" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#eab308" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="heat-leg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eab308" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.15" />
        </linearGradient>

        {/* Temperature scale gradient */}
        <linearGradient id="temp-scale" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="25%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="75%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="600" height="450" fill="url(#bg)" />

      {/* Grid overlay for clinical look */}
      <g opacity="0.06" stroke="#22d3ee" strokeWidth="0.5">
        {Array.from({ length: 30 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 15} x2="600" y2={i * 15} />
        ))}
        {Array.from({ length: 40 }, (_, i) => (
          <line key={`v${i}`} x1={i * 15} y1="0" x2={i * 15} y2="450" />
        ))}
      </g>

      {/* Body silhouette - front view with heat zones */}
      <g transform="translate(300, 225)" filter="url(#soft-glow)">
        {/* Head heat zone */}
        <ellipse cx="0" cy="-155" rx="28" ry="32" fill="url(#heat-head)" />

        {/* Neck */}
        <rect x="-10" y="-125" width="20" height="18" rx="5" fill="#f97316" opacity="0.5" />

        {/* Torso heat zone */}
        <ellipse cx="0" cy="-65" rx="52" ry="55" fill="url(#heat-chest)" />

        {/* Left shoulder (viewer's right) — hot spot indicator */}
        <ellipse cx="60" cy="-95" rx="22" ry="18" fill="url(#heat-shoulder-l)" />

        {/* Right shoulder — VERY hot (injury simulation) */}
        <ellipse cx="-60" cy="-95" rx="22" ry="18" fill="url(#heat-shoulder-r)" />

        {/* Left arm */}
        <rect x="62" y="-80" width="16" height="70" rx="8" fill="url(#heat-arm-l)" />
        <rect x="64" y="-12" width="12" height="55" rx="6" fill="#22d3ee" opacity="0.2" />

        {/* Right arm */}
        <rect x="-78" y="-80" width="16" height="70" rx="8" fill="url(#heat-arm-r)" />
        <rect x="-76" y="-12" width="12" height="55" rx="6" fill="#eab308" opacity="0.25" />

        {/* Hip area */}
        <ellipse cx="0" cy="0" rx="48" ry="22" fill="#eab308" opacity="0.3" />

        {/* Left thigh */}
        <rect x="10" y="18" width="28" height="70" rx="14" fill="url(#heat-leg)" />

        {/* Right thigh */}
        <rect x="-38" y="18" width="28" height="70" rx="14" fill="url(#heat-leg)" />

        {/* Left knee — cool */}
        <ellipse cx="24" cy="98" rx="16" ry="14" fill="url(#heat-knee-l)" />

        {/* Right knee — HOT (injury simulation) */}
        <ellipse cx="-24" cy="98" rx="16" ry="14" fill="url(#heat-knee-r)" />

        {/* Left shin */}
        <rect x="14" y="110" width="20" height="60" rx="10" fill="#06b6d4" opacity="0.2" />

        {/* Right shin */}
        <rect x="-34" y="110" width="20" height="60" rx="10" fill="#22d3ee" opacity="0.25" />

        {/* Left foot */}
        <ellipse cx="24" cy="178" rx="14" ry="8" fill="#1e40af" opacity="0.2" />

        {/* Right foot */}
        <ellipse cx="-24" cy="178" rx="14" ry="8" fill="#06b6d4" opacity="0.2" />
      </g>

      {/* Temperature indicator - right knee highlight ring */}
      <g transform="translate(276, 323)">
        <circle cx="0" cy="0" r="22" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7">
          <animateTransform attributeName="transform" type="rotate" values="0;360" dur="20s" repeatCount="indefinite" />
        </circle>
        <line x1="24" y1="-8" x2="60" y2="-30" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
        <rect x="58" y="-42" width="68" height="22" rx="4" fill="#ef4444" opacity="0.15" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.4" />
        <text x="92" y="-27" textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="system-ui" fontWeight="600">38.2°C</text>
      </g>

      {/* Temperature indicator - right shoulder */}
      <g transform="translate(240, 130)">
        <circle cx="0" cy="0" r="18" fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" values="0;-360" dur="25s" repeatCount="indefinite" />
        </circle>
        <line x1="-20" y1="-5" x2="-55" y2="-25" stroke="#f97316" strokeWidth="1" opacity="0.5" />
        <rect x="-118" y="-37" width="64" height="22" rx="4" fill="#f97316" opacity="0.12" stroke="#f97316" strokeWidth="0.5" strokeOpacity="0.4" />
        <text x="-86" y="-22" textAnchor="middle" fill="#f97316" fontSize="9" fontFamily="system-ui" fontWeight="600">37.8°C</text>
      </g>

      {/* Temperature scale bar — right edge */}
      <g transform="translate(555, 80)">
        <rect x="0" y="0" width="14" height="200" rx="7" fill="url(#temp-scale)" opacity="0.8" />
        <text x="7" y="-8" textAnchor="middle" fill="#ef4444" fontSize="8" fontFamily="system-ui" fontWeight="500">Hot</text>
        <text x="7" y="218" textAnchor="middle" fill="#1e40af" fontSize="8" fontFamily="system-ui" fontWeight="500">Cold</text>
        {/* Scale markers */}
        <text x="-6" y="8" textAnchor="end" fill="#dc2626" fontSize="7" fontFamily="system-ui" opacity="0.7">40°</text>
        <text x="-6" y="58" textAnchor="end" fill="#f97316" fontSize="7" fontFamily="system-ui" opacity="0.7">38°</text>
        <text x="-6" y="108" textAnchor="end" fill="#eab308" fontSize="7" fontFamily="system-ui" opacity="0.7">36°</text>
        <text x="-6" y="158" textAnchor="end" fill="#06b6d4" fontSize="7" fontFamily="system-ui" opacity="0.7">34°</text>
        <text x="-6" y="205" textAnchor="end" fill="#1e40af" fontSize="7" fontFamily="system-ui" opacity="0.7">32°</text>
      </g>

      {/* Scan lines animation effect */}
      <rect x="100" y="0" width="400" height="2" fill="#22d3ee" opacity="0.08">
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 450; 0 0" dur="8s" repeatCount="indefinite" />
      </rect>

      {/* Corner markers for clinical look */}
      <g stroke="#22d3ee" strokeWidth="1" opacity="0.3">
        <path d="M30 30 L30 50 M30 30 L50 30" />
        <path d="M570 30 L570 50 M570 30 L550 30" />
        <path d="M30 420 L30 400 M30 420 L50 420" />
        <path d="M570 420 L570 400 M570 420 L550 420" />
      </g>

      {/* Top label */}
      <text x="300" y="28" textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="system-ui" fontWeight="600" letterSpacing="3" opacity="0.5">
        INFRARED THERMOGRAPHY
      </text>

      {/* Bottom info */}
      <text x="300" y="440" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="system-ui" opacity="0.6">
        BPR · Thermal Imaging Assessment · Non-invasive
      </text>
    </svg>
  );
}
