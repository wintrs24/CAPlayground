"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditor } from "./editor-context";

export function Inspector() {
  const { doc, updateLayer } = useEditor();
  const selected = doc?.layers.find((l) => l.id === doc?.selectedId);

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
          <Input id="pos-x" type="number" value={selected.position.x}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              updateLayer(selected.id, { position: { ...selected.position, x: Number(v) } as any });
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-y">Y</Label>
          <Input id="pos-y" type="number" value={selected.position.y}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              updateLayer(selected.id, { position: { ...selected.position, y: Number(v) } as any });
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="w">W</Label>
          <Input id="w" type="number" value={selected.size.w}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              updateLayer(selected.id, { size: { ...selected.size, w: Number(v) } as any });
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h">H</Label>
          <Input id="h" type="number" value={selected.size.h}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") return;
              updateLayer(selected.id, { size: { ...selected.size, h: Number(v) } as any });
            }} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="rotation">Rotation (deg)</Label>
          <Input
            id="rotation"
            type="number"
            value={selected.rotation ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              updateLayer(selected.id, { rotation: v === "" ? (undefined as any) : Number(v) });
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
            <Label htmlFor="radius">Radius</Label>
            <Input
              id="radius"
              type="number"
              value={selected.radius ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                updateLayer(selected.id, { radius: v === "" ? (undefined as any) : Number(v) } as any);
              }}
            />
          </div>
        </div>
      )}

      {selected.type === "image" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="src">Image URL</Label>
            <Input id="src" value={selected.src}
              onChange={(e) => updateLayer(selected.id, { src: e.target.value } as any)} />
          </div>
        </div>
      )}
    </Card>
  );
}
