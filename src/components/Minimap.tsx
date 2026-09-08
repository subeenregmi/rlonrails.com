"use client";

import { useEffect, useRef } from "react";
import { CURRICULUM, MAP_BOUNDS } from "@/lib/curriculum";
import type { MapLayout, Surface } from "@/lib/geometry";
import type { CameraListener } from "./TubeMap";

const INSET = 340;

export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MinimapProps {
  layout: MapLayout;
  surface: Surface;
  colours: Record<string, string>;
  activeLines: Set<string>;
  subscribe: (listener: CameraListener) => () => void;
  onJump: (x: number, y: number) => void;
}

export function Minimap({ layout, surface, colours, activeLines, subscribe, onJump }: MinimapProps) {
  const rectRef = useRef<SVGRectElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  useEffect(
    () =>
      subscribe((view) => {
        const rect = rectRef.current;
        if (!rect) return;
        rect.setAttribute("x", String(view.x));
        rect.setAttribute("y", String(view.y));
        rect.setAttribute("width", String(view.w));
        rect.setAttribute("height", String(view.h));
      }),
    [subscribe],
  );

  const jump = (event: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    onJump(p.x, p.y);
  };

  return (
    <div className="mm-frame absolute right-3.5 bottom-3.5 h-16 w-[150px] cursor-crosshair overflow-hidden rounded-lg border border-rule shadow-[0_4px_16px_rgba(0,0,0,.12)] sm:h-24 sm:w-[230px]">
      <svg
        ref={svgRef}
        className="block h-full w-full"
        viewBox={`${MAP_BOUNDS.x - INSET} ${MAP_BOUNDS.y - INSET} ${MAP_BOUNDS.w + INSET * 2} ${MAP_BOUNDS.h + INSET * 2}`}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); jump(e); }}
        onPointerMove={(e) => { if (dragging.current) jump(e); }}
        onPointerUp={() => { dragging.current = false; }}
      >
        <path className="mm-island" d={surface.island} />
        <path className="mm-river" d={surface.river} />
        {CURRICULUM.lines.map((line) => (
          <path key={line.id} className="mm-line" d={layout.lines[line.id].d} stroke={activeLines.has(line.id) ? colours[line.id] : "var(--locked)"} />
        ))}
        <rect ref={rectRef} className="mm-view" rx={20} />
      </svg>
    </div>
  );
}
