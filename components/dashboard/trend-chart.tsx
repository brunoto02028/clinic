"use client";

// In-house SVG trend chart — no charting dependency (matches the hand-drawn SVG
// already used in blood-pressure/page.tsx). One series per chart, rendered as a
// small multiple: headline value + delta chip + sparkline with a hover
// crosshair and tooltip. Supports a line variant (continuous measures like VAS
// and FAAM, plotted on a real time axis) and a bar variant (weekly adherence,
// discrete buckets spaced evenly).
//
// Marks follow the dataviz guidance: 2px line with round caps, an area fade,
// the latest point emphasised, recessive grid/axes, and only the latest value
// direct-labelled. Colour follows the entity (same palette as the Current
// Scores grid); axis/label text stays in ink tokens.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendPoint = { date: string; value: number | null };

interface TrendChartProps {
  points: TrendPoint[];
  label: string;
  unit?: string;
  min: number;
  max: number;
  higherIsBetter: boolean;
  color: string; // hex, e.g. "#ef4444"
  isPt: boolean;
  kind?: "line" | "bar";
}

const H = 96; // chart height in px (width is measured from the container)
const PAD = { top: 10, right: 8, bottom: 8, left: 8 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw && cw > 0) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

// A bare "YYYY-MM-DD" must be read as a local calendar day, not UTC midnight —
// otherwise toLocaleDateString in a negative-offset zone (e.g. UTC-3) shows the
// previous day. Full ISO timestamps keep their own instant.
function toLocalDate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00") : new Date(s);
}

function fmtDate(iso: string, isPt: boolean) {
  return toLocalDate(iso).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function TrendChart({
  points,
  label,
  unit = "",
  min,
  max,
  higherIsBetter,
  color,
  isPt,
  kind = "line",
}: TrendChartProps) {
  const gid = useId().replace(/:/g, "");
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const valued = useMemo(
    () => points.filter((p) => p.value !== null) as { date: string; value: number }[],
    [points],
  );
  const enough = kind === "bar" ? valued.length >= 1 : valued.length >= 2;

  const latest = valued.length ? valued[valued.length - 1].value : null;
  const first = valued.length ? valued[0].value : null;
  const delta = latest !== null && first !== null ? Math.round((latest - first) * 10) / 10 : 0;
  const improved = delta !== 0 && (higherIsBetter ? delta > 0 : delta < 0);
  const worsened = delta !== 0 && (higherIsBetter ? delta < 0 : delta > 0);

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const span = max - min || 1;

  // X position of each point. Line = real time axis; bar = evenly-spaced centres.
  const xs = useMemo(() => {
    const n = valued.length;
    if (kind === "bar") {
      return valued.map((_, i) => PAD.left + (i + 0.5) * (innerW / (n || 1)));
    }
    if (n <= 1) return valued.map(() => PAD.left + innerW / 2);
    const t0 = toLocalDate(valued[0].date).getTime();
    const t1 = toLocalDate(valued[n - 1].date).getTime();
    const tSpan = t1 - t0 || 1;
    return valued.map((p) => PAD.left + ((toLocalDate(p.date).getTime() - t0) / tSpan) * innerW);
  }, [valued, kind, innerW]);

  const yAt = (v: number) => PAD.top + (1 - (v - min) / span) * innerH;

  const chip = improved
    ? { cls: "text-emerald-600 dark:text-emerald-400", Icon: TrendingUp }
    : worsened
    ? { cls: "text-red-600 dark:text-red-400", Icon: TrendingDown }
    : { cls: "text-muted-foreground", Icon: Minus };

  const deltaLabel =
    delta === 0
      ? isPt ? "estável" : "no change"
      : `${delta > 0 ? "+" : ""}${delta}${unit}`;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    if (kind === "bar") {
      const idx = Math.floor((cursorX - PAD.left) / (innerW / (valued.length || 1)));
      setHover(Math.max(0, Math.min(valued.length - 1, idx)));
    } else {
      // nearest point by x — honest with a real (possibly irregular) time axis
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < xs.length; i++) {
        const d = Math.abs(xs[i] - cursorX);
        if (d < bestD) { bestD = d; best = i; }
      }
      setHover(best);
    }
  }

  const tipX = hover !== null ? Math.min(Math.max(xs[hover], 36), width - 36) : 0;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      {/* headline */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold leading-none" style={{ color }}>
            {latest !== null ? latest : "—"}
            <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
          </p>
        </div>
        {valued.length >= 2 && (
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}
            title={isPt ? "variação desde o primeiro registo" : "change since first record"}
          >
            <chip.Icon className="h-3 w-3" />
            {deltaLabel}
          </span>
        )}
      </div>

      {/* chart */}
      <div ref={wrapRef} className="relative mt-2 w-full" style={{ height: H }}>
        {!enough ? (
          <div className="flex h-full items-center justify-center rounded-lg bg-muted/20 px-3 text-center text-xs text-muted-foreground">
            {isPt
              ? "Sem histórico suficiente para um gráfico ainda."
              : "Not enough history for a chart yet."}
          </div>
        ) : (
          <>
            <svg
              width={width}
              height={H}
              className="block overflow-visible"
              role="img"
              aria-label={
                isPt
                  ? `${label}: tendência de ${valued.length} registos, ${
                      improved ? "a melhorar" : worsened ? "a piorar" : "estável"
                    }`
                  : `${label}: trend across ${valued.length} records, ${
                      improved ? "improving" : worsened ? "worsening" : "stable"
                    }`
              }
              onMouseLeave={() => setHover(null)}
              onMouseMove={handleMove}
            >
              <defs>
                <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* recessive baseline grid: min / mid / max */}
              {[0, 0.5, 1].map((t) => {
                const y = PAD.top + t * innerH;
                return (
                  <line
                    key={t}
                    x1={PAD.left}
                    y1={y}
                    x2={width - PAD.right}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                    strokeDasharray={t === 1 ? "0" : "3 4"}
                    opacity={t === 1 ? 0.6 : 0.35}
                  />
                );
              })}

              {kind === "bar" ? (
                (() => {
                  const step = innerW / valued.length;
                  const bw = Math.min(22, Math.max(6, step * 0.62));
                  return valued.map((p, i) => {
                    const y = yAt(p.value);
                    const h = Math.max(2, PAD.top + innerH - y);
                    const active = hover === i;
                    return (
                      <rect
                        key={i}
                        x={xs[i] - bw / 2}
                        y={y}
                        width={bw}
                        height={h}
                        rx={3}
                        fill={color}
                        opacity={hover === null || active ? 0.9 : 0.4}
                      />
                    );
                  });
                })()
              ) : (
                <>
                  {/* area */}
                  <path
                    d={
                      `M ${xs[0]} ${yAt(valued[0].value)} ` +
                      valued.slice(1).map((p, i) => `L ${xs[i + 1]} ${yAt(p.value)}`).join(" ") +
                      ` L ${xs[xs.length - 1]} ${PAD.top + innerH}` +
                      ` L ${xs[0]} ${PAD.top + innerH} Z`
                    }
                    fill={`url(#fill-${gid})`}
                  />
                  {/* line */}
                  <path
                    d={
                      `M ${xs[0]} ${yAt(valued[0].value)} ` +
                      valued.slice(1).map((p, i) => `L ${xs[i + 1]} ${yAt(p.value)}`).join(" ")
                    }
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* latest point emphasised */}
                  <circle
                    cx={xs[xs.length - 1]}
                    cy={yAt(valued[valued.length - 1].value)}
                    r={4}
                    fill={color}
                    className="stroke-card"
                    strokeWidth={2}
                  />
                </>
              )}

              {/* hover crosshair + marker */}
              {hover !== null && (
                <>
                  <line
                    x1={xs[hover]}
                    y1={PAD.top}
                    x2={xs[hover]}
                    y2={PAD.top + innerH}
                    stroke={color}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.5}
                  />
                  {kind === "line" && (
                    <circle
                      cx={xs[hover]}
                      cy={yAt(valued[hover].value)}
                      r={4.5}
                      fill={color}
                      className="stroke-card"
                      strokeWidth={2}
                    />
                  )}
                </>
              )}
            </svg>

            {/* tooltip */}
            {hover !== null && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-center shadow-md"
                style={{ left: tipX, top: PAD.top - 2 }}
              >
                <p className="text-xs font-bold leading-none" style={{ color }}>
                  {valued[hover].value}
                  {unit}
                </p>
                <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                  {fmtDate(valued[hover].date, isPt)}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
