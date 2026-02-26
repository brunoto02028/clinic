"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/hooks/use-locale";

interface RecoveryRingProps {
  exercise: number;   // 0-100
  consistency: number; // 0-100
  wellbeing: number;   // 0-100
}

const RINGS = [
  { key: "exercise", label: "Exercises", labelPt: "Exercícios", color: "#22C55E", colorBg: "#dcfce7" },
  { key: "consistency", label: "Consistency", labelPt: "Consistência", color: "#3B82F6", colorBg: "#dbeafe" },
  { key: "wellbeing", label: "Well-being", labelPt: "Bem-estar", color: "#EAB308", colorBg: "#fef9c3" },
];

function RingCircle({ percent, color, colorBg, radius, strokeWidth }: { percent: number; color: string; colorBg: string; radius: number; strokeWidth: number }) {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <>
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={colorBg}
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        transform="rotate(-90 60 60)"
      />
    </>
  );
}

export default function RecoveryRing({ exercise, consistency, wellbeing }: RecoveryRingProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);
  const values = { exercise, consistency, wellbeing };
  let isPt = false;
  try { const { locale } = useLocale(); isPt = locale === "pt-BR"; } catch {}

  const avg = Math.round((exercise + consistency + wellbeing) / 3);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-[120px] h-[120px] cursor-pointer"
        onMouseLeave={() => { setHovered(null); setShowTip(false); }}
        onMouseEnter={() => setShowTip(true)}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <RingCircle percent={exercise} color={RINGS[0].color} colorBg={RINGS[0].colorBg} radius={50} strokeWidth={8} />
          <RingCircle percent={consistency} color={RINGS[1].color} colorBg={RINGS[1].colorBg} radius={40} strokeWidth={8} />
          <RingCircle percent={wellbeing} color={RINGS[2].color} colorBg={RINGS[2].colorBg} radius={30} strokeWidth={8} />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{avg}%</p>
          </div>
        </div>

        {/* Hover zones for tooltips */}
        {RINGS.map((ring, i) => (
          <div
            key={ring.key}
            className="absolute inset-0"
            onMouseEnter={() => setHovered(ring.key)}
          />
        ))}

        {/* Ring detail tooltip */}
        {hovered && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card text-foreground text-[10px] px-2 py-1 rounded border border-white/10 whitespace-nowrap z-10">
            {isPt ? RINGS.find((r) => r.key === hovered)?.labelPt : RINGS.find((r) => r.key === hovered)?.label}: {values[hovered as keyof typeof values]}%
          </div>
        )}

        {/* Explainer tooltip */}
        {showTip && !hovered && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card text-foreground text-[10px] px-2.5 py-1.5 rounded border border-white/10 whitespace-nowrap z-10 max-w-[200px] text-center leading-relaxed">
            {isPt ? "Complete exercícios, mantenha consistência e registre bem-estar para aumentar" : "Complete exercises, stay consistent & log well-being to increase"}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {RINGS.map((ring) => (
          <div key={ring.key} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ring.color }} />
            <span className="text-[10px] text-muted-foreground">{isPt ? ring.labelPt : ring.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
