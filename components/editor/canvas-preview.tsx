"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Crosshair } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import { useEditor } from "./editor-context";
import type { AnyLayer, GroupLayer, ShapeLayer } from "@/lib/ca/types";

export function CanvasPreview() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { doc, updateLayer, updateLayerTransient, selectLayer } = useEditor();
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [userScale, setUserScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const draggingRef = useRef<{ id: string; startClientX: number; startClientY: number; startX: number; startY: number } | null>(null);

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

  const { fitScale, baseOffsetX, baseOffsetY } = useMemo(() => {
    const w = doc?.meta.width ?? 390;
    const h = doc?.meta.height ?? 844;
    const pad = 16;
    const maxW = size.w - pad * 2;
    const maxH = size.h - pad * 2;
    const s = Math.min(maxW / w, maxH / h);
    const ox = (size.w - w * s) / 2;
    const oy = (size.h - h * s) / 2;
    return { fitScale: s > 0 && Number.isFinite(s) ? s : 1, baseOffsetX: ox, baseOffsetY: oy };
  }, [size.w, size.h, doc?.meta.width, doc?.meta.height]);

  const scale = fitScale * userScale;
  const offsetX = baseOffsetX + pan.x;
  const offsetY = baseOffsetY + pan.y;

  const layers = doc?.layers ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key;
      if (key !== '=' && key !== '+' && key !== '-' && key !== '0') return;
      if (!ref.current) return;
      e.preventDefault();

      const rect = ref.current.getBoundingClientRect();
      const clientX = rect.width / 2;
      const clientY = rect.height / 2;
      const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
      const worldY = (clientY - (baseOffsetY + pan.y)) / scale;

      if (key === '0') {
        setUserScale(1);
        setPan({ x: 0, y: 0 });
        return;
      }

      const direction = key === '-' ? -1 : 1;
      const nextUserScale = direction > 0
        ? Math.min(5, userScale * 1.1)
        : Math.max(0.2, userScale / 1.1);
      const nextScale = fitScale * nextUserScale;
      const nextPanX = clientX - worldX * nextScale - baseOffsetX;
      const nextPanY = clientY - worldY * nextScale - baseOffsetY;
      setUserScale(nextUserScale);
      setPan({ x: nextPanX, y: nextPanY });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [baseOffsetX, baseOffsetY, fitScale, pan.x, pan.y, scale, userScale]);

  const startDrag = (l: AnyLayer, e: ReactMouseEvent) => {
    if (e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    selectLayer(l.id);
    draggingRef.current = {
      id: l.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: l.position.x,
      startY: l.position.y,
    };
    // Disable text selection while dragging
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.startClientX) / scale;
      const dy = (ev.clientY - d.startClientY) / scale;
      updateLayerTransient(d.id, { position: { x: d.startX + dx, y: d.startY + dy } as any });
    };
    const onUp = (ev: MouseEvent) => {
      const d = draggingRef.current;
      if (d) {
        const dx = (ev.clientX - d.startClientX) / scale;
        const dy = (ev.clientY - d.startClientY) / scale;
        updateLayer(d.id, { position: { x: d.startX + dx, y: d.startY + dy } as any });
      }
      draggingRef.current = null;
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const renderLayer = (l: AnyLayer): ReactNode => {    const common: React.CSSProperties = {
      position: "absolute",
      left: l.position.x,
      top: l.position.y,
      width: l.size.w,
      height: l.size.h,
      transform: `rotate(${l.rotation ?? 0}deg)`,
      display: l.visible === false ? "none" : undefined,
      cursor: "move",
    };

    if (l.type === "text") {
      return (
        <div
          key={l.id}
          style={{ ...common, color: l.color, fontSize: l.fontSize, textAlign: l.align ?? "left" }}
          onMouseDown={(e) => startDrag(l, e)}
        >
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
          draggable={false}
          onMouseDown={(e) => startDrag(l, e)}
        />
      );
    }
    if (l.type === "shape") {
      const s = l as ShapeLayer;
      const borderRadius = s.shape === "circle" ? 9999 : (s.shape === "rounded-rect" ? (s.radius ?? 8) : 0);
      return (
        <div key={l.id} style={{ ...common, background: s.fill, borderRadius }} onMouseDown={(e) => startDrag(l, e)} />
      );
    }
    // group
    const g = l as GroupLayer;
    return (
      <div key={g.id} style={{ ...common, background: g.backgroundColor }} onMouseDown={(e) => startDrag(g, e)}>
        {g.children.map((c) => renderLayer(c))}
      </div>
    );
  };

  return (
    <Card
      ref={ref}
      className={`relative w-full h-full overflow-hidden p-0 ${isPanning ? 'cursor-grabbing' : ''}`}
      onWheel={(e) => {
        if (!ref.current) return;
        // pinch-to-zoom via ctrl+wheel, or shift+scroll
        if (e.ctrlKey || e.shiftKey) {
          e.preventDefault();
          const rect = ref.current.getBoundingClientRect();
          const clientX = e.clientX - rect.left;
          const clientY = e.clientY - rect.top;
          const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
          const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
          const factor = Math.exp(-e.deltaY * 0.001);
          const nextUserScale = Math.min(5, Math.max(0.2, userScale * factor));
          const nextScale = fitScale * nextUserScale;
          const nextPanX = clientX - worldX * nextScale - baseOffsetX;
          const nextPanY = clientY - worldY * nextScale - baseOffsetY;
          setUserScale(nextUserScale);
          setPan({ x: nextPanX, y: nextPanY });
        }
      }}
      onMouseDown={(e) => {
        // Shift + drag to pan around
        if (!ref.current) return;
        if (!e.shiftKey) return;
        e.preventDefault();
        const startClientX = e.clientX;
        const startClientY = e.clientY;
        panDragRef.current = {
          startClientX,
          startClientY,
          startPanX: pan.x,
          startPanY: pan.y,
        };
        setIsPanning(true);
        const onMove = (ev: MouseEvent) => {
          const d = panDragRef.current;
          if (!d) return;
          const dx = ev.clientX - d.startClientX;
          const dy = ev.clientY - d.startClientY;
          setPan({ x: d.startPanX + dx, y: d.startPanY + dy });
        };
        const onUp = () => {
          panDragRef.current = null;
          setIsPanning(false);
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }}
      onKeyDown={() => {  }}
    >
      <div
        className="absolute inset-0 dark:hidden cursor-[inherit]"
        style={{ background: "repeating-conic-gradient(#f8fafc 0% 25%, #e5e7eb 0% 50%) 50% / 20px 20px" }}
      />
      <div
        className="absolute inset-0 hidden dark:block cursor-[inherit]"
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
          borderRadius: 0,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {layers.map((l) => renderLayer(l))}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          aria-label="Zoom in"
          onClick={() => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const clientX = rect.width / 2;
            const clientY = rect.height / 2;
            const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
            const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
            const nextUserScale = Math.min(5, userScale * 1.1);
            const nextScale = fitScale * nextUserScale;
            const nextPanX = clientX - worldX * nextScale - baseOffsetX;
            const nextPanY = clientY - worldY * nextScale - baseOffsetY;
            setUserScale(nextUserScale);
            setPan({ x: nextPanX, y: nextPanY });
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Zoom out"
          onClick={() => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const clientX = rect.width / 2;
            const clientY = rect.height / 2;
            const worldX = (clientX - (baseOffsetX + pan.x)) / scale;
            const worldY = (clientY - (baseOffsetY + pan.y)) / scale;
            const nextUserScale = Math.max(0.2, userScale / 1.1);
            const nextScale = fitScale * nextUserScale;
            const nextPanX = clientX - worldX * nextScale - baseOffsetX;
            const nextPanY = clientY - worldY * nextScale - baseOffsetY;
            setUserScale(nextUserScale);
            setPan({ x: nextPanX, y: nextPanY });
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Re-center"
          title="Re-center"
          onClick={() => {
            setUserScale(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <Crosshair className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
