"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";

/**
 * Draggable focal-point picker for an article cover image. The site shows
 * this photo inside several fixed-aspect containers (hero banner, listing
 * cards, related-article thumbnails) via CSS object-cover, which centre-crops
 * by default and can cut off whatever isn't in the middle of the photo. This
 * lets staff mark the point that must stay visible; it's applied everywhere
 * via `object-position` — the original file is never touched or re-cropped.
 */
export function ImageFocalPointPicker({
  imageUrl, x, y, onChange,
}: {
  imageUrl: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    const box = boxRef.current;
    if (!box) return;

    const move = (clientX: number, clientY: number) => {
      const rect = box.getBoundingClientRect();
      const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      onChange(Math.round(xPct), Math.round(yPct));
    };
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY); };
    const stop = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
    };
  }, [dragging, onChange]);

  return (
    <div className="space-y-1.5">
      <div
        ref={boxRef}
        className="relative w-full max-w-lg aspect-[8/3] bg-muted rounded-lg overflow-hidden border border-border select-none cursor-crosshair"
        onMouseDown={(e) => { onChange(...pctFromEvent(boxRef.current, e.clientX, e.clientY)); setDragging(true); }}
        onTouchStart={(e) => { const t = e.touches[0]; if (!t) return; onChange(...pctFromEvent(boxRef.current, t.clientX, t.clientY)); setDragging(true); }}
      >
        <img
          src={imageUrl}
          alt="Cover"
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: `${x}% ${y}%` }}
          draggable={false}
        />
        <div
          className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-[#5dc9c0] border-2 border-white shadow-lg flex items-center justify-center touch-none ${dragging ? "scale-110" : ""} transition-transform`}
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <Crosshair className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">🖐️ Drag the pin over whatever must never get cropped out — applies to the article banner, listing cards and related-article thumbnails everywhere.</p>
    </div>
  );
}

function pctFromEvent(box: HTMLDivElement | null, clientX: number, clientY: number): [number, number] {
  if (!box) return [50, 50];
  const rect = box.getBoundingClientRect();
  const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
  return [Math.round(xPct), Math.round(yPct)];
}
