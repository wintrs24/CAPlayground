"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEditor } from "./editor-context";
import type { AnyLayer } from "@/lib/ca/types";
import { useRef } from "react";

export function Inspector() {
  const { doc, updateLayer, replaceImageForLayer } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const fmt2 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? round2(n).toFixed(2) : "");
  const fmt0 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n).toString() : "");
  const findById = (layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
    if (!id) return undefined;
    for (const l of layers) {
      if (l.id === id) return l;
      if (l.type === "group") {
        const found = findById(l.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };
  const selected = doc ? findById(doc.layers, doc.selectedId) : undefined;

  if (!selected) {
    return (
      <Card className="p-3 h-full">
        <div className="font-medium mb-2">Inspector</div>
        <div className="text-sm text-muted-foreground">Select a layer to edit its properties.</div>
      </Card>
    );
  }

  return (
    <Card className="p-3 h-full space-y-3">
      <div className="font-medium">Inspector</div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="pos-x">X</Label>
          <Input id="pos-x" type="number" step="0.01" value={fmt2(selected.position.x)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              const num = round2(Number(v));
              updateLayer(selected.id, { position: { ...selected.position, x: num } as any });
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-y">Y</Label>
          <Input id="pos-y" type="number" step="0.01" value={fmt2(selected.position.y)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              const num = round2(Number(v));
              updateLayer(selected.id, { position: { ...selected.position, y: num } as any });
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="w">Width</Label>
          <Input id="w" type="number" step="0.01" value={fmt2(selected.size.w)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              const num = round2(Number(v));
              updateLayer(selected.id, { size: { ...selected.size, w: num } as any });
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h">Height</Label>
          <Input id="h" type="number" step="0.01" value={fmt2(selected.size.h)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              const num = round2(Number(v));
              updateLayer(selected.id, { size: { ...selected.size, h: num } as any });
            }} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="rotation">Rotation (deg)</Label>
          <Input
            id="rotation"
            type="number"
            step="1"
            value={fmt0(selected.rotation)}
            onChange={(e) => {
              const v = e.target.value;
              updateLayer(selected.id, { rotation: v === "" ? (undefined as any) : Math.round(Number(v)) });
            }}
          />
        </div>
      </div>

      {selected.type === "text" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="text">Text</Label>
            <Input id="text" value={selected.text}
              onChange={(e) => updateLayer(selected.id, { text: e.target.value } as any)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fontSize">Font size</Label>
            <Input id="fontSize" type="number" value={selected.fontSize}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") return;
                updateLayer(selected.id, { fontSize: Number(v) } as any)
              }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color">Color</Label>
            <Input id="color" type="color" value={selected.color}
              onChange={(e) => updateLayer(selected.id, { color: e.target.value } as any)} />
          </div>
        </div>
      )}

      {selected.type === "shape" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="fill">Fill</Label>
            <Input id="fill" type="color" value={selected.fill}
              onChange={(e) => updateLayer(selected.id, { fill: e.target.value } as any)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="radius">Corner Radius</Label>
            <Input
              id="radius"
              type="number"
              step="1"
              value={fmt0((selected as any).cornerRadius ?? (selected as any).radius)}
              onChange={(e) => {
                const v = e.target.value;
                updateLayer(selected.id, { cornerRadius: v === "" ? (undefined as any) : Math.round(Number(v)) } as any);
              }}
            />
          </div>
        </div>
      )}

      {selected.type === "image" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label>Image</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace Image…
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const img = new Image();
                    const src = (selected as any).src as string;
                    await new Promise<void>((resolve, reject) => {
                      img.onload = () => resolve();
                      img.onerror = reject;
                      img.src = src;
                    });
                    const w = img.naturalWidth || 0;
                    const h = img.naturalHeight || 0;
                    if (w > 0 && h > 0) {
                      updateLayer(selected.id, { size: { ...selected.size, w, h } as any });
                    }
                  } catch (e) {
                  }
                }}
              >
                Reset Bounds
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await replaceImageForLayer(selected.id, file);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
