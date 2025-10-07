"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InspectorTabProps } from "../types";

export function TextTab({
  selected,
  updateLayer,
}: Omit<InspectorTabProps, 'getBuf' | 'setBuf' | 'clearBuf' | 'round2' | 'fmt2' | 'fmt0' | 'updateLayerTransient' | 'selectedBase'>) {
  if (selected.type !== 'text') return null;

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
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
        <Label htmlFor="fontFamily">Font</Label>
        <Select value={(selected as any).fontFamily || 'SFProText-Regular'}
          onValueChange={(v) => updateLayer(selected.id, { fontFamily: v } as any)}>
          <SelectTrigger className="h-8 text-xs" id="fontFamily">
            <SelectValue placeholder="Select font" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SFProText-Regular">SFProText-Regular</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Alignment</Label>
        <Select value={(selected as any).align || 'left'}
          onValueChange={(v) => updateLayer(selected.id, { align: v as any } as any)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select alignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="justified">Justified</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Wrap lines</Label>
        <div className="flex items-center gap-2 h-8">
          <Switch checked={(((selected as any).wrapped ?? 1) as number) === 1}
            onCheckedChange={(checked) => updateLayer(selected.id, { wrapped: (checked ? 1 : 0) as any } as any)} />
          <span className="text-xs text-muted-foreground">When on, drag horizontal bounds to wrap text.</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="color">Color</Label>
        <Input id="color" type="color" value={selected.color}
          onChange={(e) => updateLayer(selected.id, { color: e.target.value } as any)} />
      </div>
    </div>
  );
}
