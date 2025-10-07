"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { InspectorTabProps } from "../types";

import type { TabId } from "../types";

interface ContentTabProps extends InspectorTabProps {
  setActiveTab: (tab: TabId) => void;
}

export function ContentTab({
  selected,
  updateLayer,
  updateLayerTransient,
  getBuf,
  setBuf,
  clearBuf,
  round2,
  fmt2,
  setActiveTab,
}: ContentTabProps) {
  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      {selected.type !== 'gradient' && (
        <>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="backgroundColor">Background colour</Label>
            <Input
              id="backgroundColor"
              type="color"
              className="w-full h-8"
              value={(selected as any).backgroundColor ?? "#ffffff"}
              onChange={(e) => updateLayer(selected.id, { backgroundColor: e.target.value } as any)}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label htmlFor="backgroundOpacity">Background opacity</Label>
            <div className="flex items-center gap-2 w-full">
              <Slider
                id="backgroundOpacity"
                value={[Math.round((((selected as any).backgroundOpacity ?? 1) * 100))]}
                min={0}
                max={100}
                step={1}
                onValueChange={([p]) => {
                  const clamped = Math.max(0, Math.min(100, Math.round(Number(p))));
                  const val = Math.round((clamped / 100) * 100) / 100; // 2 d.p.
                  updateLayerTransient(selected.id, { backgroundOpacity: val as any } as any);
                }}
              />
              <Input
                id="backgroundOpacityPct"
                className="w-24 h-8 text-right"
                type="number"
                min={0}
                max={100}
                step={1}
                value={getBuf('backgroundOpacityPct', String(Math.round((((selected as any).backgroundOpacity ?? 1) * 100))))}
                onChange={(e) => {
                  setBuf('backgroundOpacityPct', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const p = Math.max(0, Math.min(100, Math.round(Number(v))));
                  const val = Math.round((p / 100) * 100) / 100;
                  updateLayerTransient(selected.id, { backgroundOpacity: val as any } as any);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const p = v === "" ? undefined : Math.max(0, Math.min(100, Math.round(Number(v))));
                  const val = typeof p === 'number' ? Math.round((p / 100) * 100) / 100 : undefined;
                  updateLayer(selected.id, { backgroundOpacity: (typeof val === 'number') ? val as any : (undefined as any) } as any);
                  clearBuf('backgroundOpacityPct');
                }}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            <div className="col-span-2 -mt-1">
              <p className="text-[11px] text-muted-foreground">
                Background opacity affects only this layer's background color fill (behind the content). For overall layer opacity
                (affects images, text, and sublayers), use
                {' '}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => setActiveTab('compositing')}
                >
                  Compositing → Opacity
                </button>.
              </p>
            </div>
          </div>
        </>
      )}
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
          step={0.01}
          value={getBuf('borderWidth', fmt2((selected as any).borderWidth))}
          onChange={(e) => {
            setBuf('borderWidth', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = round2(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { borderWidth: Math.max(0, num) } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? undefined : round2(Number(v));
            updateLayer(selected.id, { borderWidth: (typeof num === 'number' && Number.isFinite(num)) ? Math.max(0, num) : (undefined as any) } as any);
            clearBuf('borderWidth');
          }}
        />
      </div>
    </div>
  );
}
