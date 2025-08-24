"use client";

import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "./editor-context";
import type { AnyLayer, GroupLayer, ShapeLayer } from "@/lib/ca/types";

export function CanvasPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { doc } = useEditor();
  const [size, setSize] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { scale, offsetX, offsetY } = useMemo(() => {
    const w = doc?.meta.width ?? 390;
    const h = doc?.meta.height ?? 844;
    const pad = 16;
    const maxW = size.w - pad * 2;
    const maxH = size.h - pad * 2;
    const s = Math.min(maxW / w, maxH / h);
    const ox = (size.w - w * s) / 2;
    const oy = (size.h - h * s) / 2;
    return { scale: s > 0 && Number.isFinite(s) ? s : 1, offsetX: ox, offsetY: oy };
  }, [size.w, size.h, doc?.meta.width, doc?.meta.height]);

  const layers = doc?.layers ?? [];

  const renderLayer = (l: AnyLayer): React.ReactNode => {
    const common: React.CSSProperties = {
      position: "absolute",
      left: l.position.x,
      top: l.position.y,
      width: l.size.w,
      height: l.size.h,
      transform: `rotate(${l.rotation ?? 0}deg)`,
      display: l.visible === false ? "none" : undefined,
    };

    if (l.type === "text") {
      return (
        <div key={l.id} style={{ ...common, color: l.color, fontSize: l.fontSize, textAlign: l.align ?? "left" }}>
          {l.text}
        </div>
      );
    }
    if (l.type === "image") {
      return (
        <img
          key={l.id}
          src={l.src}
          alt={l.name}
          style={{ ...common, objectFit: (l as any).fit ?? ("cover" as any) }}
        />
      );
    }
    if (l.type === "shape") {
      const s = l as ShapeLayer;
      const borderRadius = s.shape === "circle" ? 9999 : (s.shape === "rounded-rect" ? (s.radius ?? 8) : 0);
      return (
        <div key={l.id} style={{ ...common, background: s.fill, borderRadius }} />
      );
    }
    // group
    const g = l as GroupLayer;
    return (
      <div key={g.id} style={{ ...common, background: g.backgroundColor }}>
        {g.children.map((c) => renderLayer(c))}
      </div>
    );
  };

  return (
    <Card ref={ref} className="relative w-full h-full overflow-hidden p-0">
      <div
        className="absolute inset-0 dark:hidden"
        style={{ background: "repeating-conic-gradient(#f8fafc 0% 25%, #e5e7eb 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: "repeating-conic-gradient(#0b1220 0% 25%, #1f2937 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute"
        style={{
          width: doc?.meta.width,
          height: doc?.meta.height,
          background: doc?.meta.background ?? "#f3f4f6",
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {layers.map((l) => renderLayer(l))}
      </div>
    </Card>
  );
}
