"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  const selectedBase = doc ? findById(doc.layers, doc.selectedId) : undefined;
  const selected = (() => {
    if (!doc || !selectedBase) return selectedBase;
    const state = doc.activeState;
    if (!state || state === 'Base State') return selectedBase;
    const eff: AnyLayer = JSON.parse(JSON.stringify(selectedBase));
    const ovs = (doc.stateOverrides || {})[state] || [];
    const me = ovs.filter(o => o.targetId === eff.id);
    for (const o of me) {
      const kp = (o.keyPath || '').toLowerCase();
      const v = o.value as number | string;
      if (kp === 'position.x' && typeof v === 'number') eff.position.x = v;
      else if (kp === 'position.y' && typeof v === 'number') eff.position.y = v;
      else if (kp === 'bounds.size.width' && typeof v === 'number') eff.size.w = v;
      else if (kp === 'bounds.size.height' && typeof v === 'number') eff.size.h = v;
      else if (kp === 'transform.rotation.z' && typeof v === 'number') (eff as any).rotation = v as number;
      else if (kp === 'opacity' && typeof v === 'number') (eff as any).opacity = v as number;
    }
    return eff;
  })();

  if (!selected) {
    return (
      <Card className="p-3 h-full">
        <div className="font-medium mb-2">Inspector</div>
        <div className="text-sm text-muted-foreground">Select a layer to edit its properties.</div>
      </Card>
    );
  }

  return (
    <Card className="p-3 h-full space-y-2">
      <div className="font-medium">Inspector</div>
      {doc?.activeState && doc.activeState !== 'Base State' && (
        <Alert className="text-xs">
          <AlertDescription>
            Note: Rotation and Bound state transitions don't work when tested. If you know a fix or it just works for you, please report in the CAPlayground Discord server.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="multiple" defaultValue={["geom","comp","content","text","image"]} className="space-y-1">
        <AccordionItem value="geom">
          <AccordionTrigger className="py-2 text-xs">Geometry</AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-1.5">
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="comp">
          <AccordionTrigger className="py-2 text-xs">Compositing</AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-1">
          <Label htmlFor="opacity">Opacity (%)</Label>
          <Input
            id="opacity"
            type="number"
            min={0}
            max={100}
            step={1}
            value={fmt0(typeof selected.opacity === "number" ? Math.round((selected.opacity || 0) * 100) : 100)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              const pct = Math.max(0, Math.min(100, Math.round(Number(v))));
              const next = pct / 100;
              updateLayer(selected.id, { opacity: Number.isFinite(next) ? next : (undefined as any) });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>Shadow</Label>
          <div className="flex items-center gap-2 h-9">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">(placeholder)</span>
          </div>
        </div>
        {selected.type === "shape" && (
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
        )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="content">
          <AccordionTrigger className="py-2 text-xs">Content</AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-1">
          <Label>No background colour</Label>
          <div className="flex items-center gap-2 h-9">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">(placeholder)</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="backgroundColor">Background colour</Label>
          <Input
            id="backgroundColor"
            type="color"
            value={(selected as any).backgroundColor ?? "#ffffff"}
            onChange={(e) => updateLayer(selected.id, { backgroundColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="borderColor">Border colour</Label>
          <Input
            id="borderColor"
            type="color"
            value={(selected as any).borderColor ?? "#000000"}
            onChange={(e) => updateLayer(selected.id, { borderColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="borderWidth">Border width</Label>
          <Input
            id="borderWidth"
            type="number"
            step={1}
            value={fmt0((selected as any).borderWidth)}
            onChange={(e) => {
              const v = e.target.value;
              updateLayer(selected.id, { borderWidth: v === "" ? (undefined as any) : Math.max(0, Math.round(Number(v))) } as any);
            }}
          />
        </div>
        {selected.type === "shape" && (
          <div className="space-y-1">
            <Label htmlFor="fill">Fill</Label>
            <Input id="fill" type="color" value={(selected as any).fill}
              onChange={(e) => updateLayer(selected.id, { fill: e.target.value } as any)} />
          </div>
        )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Text */}
        {selected.type === "text" && (
          <AccordionItem value="text">
            <AccordionTrigger className="py-2 text-xs">Text</AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="grid grid-cols-2 gap-1.5">
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
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Image */}
        {selected.type === "image" && (
          <AccordionItem value="image">
            <AccordionTrigger className="py-2 text-xs">Image</AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="grid grid-cols-2 gap-1.5">
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
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </Card>
  );
}
