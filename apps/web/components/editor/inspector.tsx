"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditor } from "./editor-context";
import type { AnyLayer } from "@/lib/ca/types";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SquareSlash, Box, Layers, Palette, Type, Image as ImageIcon, Play, PanelLeft, PanelTop, PanelRight, Video, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function Inspector() {
  const { doc, setDoc, updateLayer, updateLayerTransient, replaceImageForLayer, isAnimationPlaying, animatedLayers } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sidebarPosition, setSidebarPosition] = useLocalStorage<'left' | 'top' | 'right'>('caplay_inspector_tab_position', 'left');
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
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const isRootSelected = current?.selectedId === '__root__';
  const selectedBase = current ? (isRootSelected ? undefined : findById(current.layers, current.selectedId)) : undefined;
  
  const selectedAnimated = useMemo(() => {
    if (!isAnimationPlaying || !animatedLayers.length || !current?.selectedId) return null;
    return findById(animatedLayers, current.selectedId);
  }, [isAnimationPlaying, animatedLayers, current?.selectedId]);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const selKey = selectedBase ? selectedBase.id : "__none__";
  useEffect(() => {
    setInputs({});
  }, [selKey]);
  const getBuf = (key: string, fallback: string): string => {
    const bufKey = `${selKey}:${key}`;
    return inputs[bufKey] !== undefined ? inputs[bufKey] : fallback;
  };
  const setBuf = (key: string, val: string) => {
    const bufKey = `${selKey}:${key}`;
    setInputs((prev) => ({ ...prev, [bufKey]: val }));
  };
  const clearBuf = (key: string) => {
    const bufKey = `${selKey}:${key}`;
    setInputs((prev) => {
      const next = { ...prev } as any;
      delete next[bufKey];
      return next;
    });
  };
  const selected = (() => {
    if (!current || !selectedBase) return selectedBase;

    if (selectedAnimated) return selectedAnimated;
    
    const state = current.activeState;
    if (!state || state === 'Base State') return selectedBase;
    const eff: AnyLayer = JSON.parse(JSON.stringify(selectedBase));
    const ovs = (current.stateOverrides || {})[state] || [];
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

  const animEnabled: boolean = !!(selectedBase as any)?.animations?.enabled && (selectedBase as any)?.type !== 'video';
  
  const {
    disablePosX,
    disablePosY,
    disableRotX,
    disableRotY,
    disableRotZ,
  } = useMemo(() => {
    const a: any = (selectedBase as any)?.animations || {};
    const enabled = !!a.enabled;
    const kp: string = a.keyPath || '';
    const hasValues = Array.isArray(a.values) && a.values.length > 0;
    const on = (cond: boolean) => enabled && hasValues && cond;
    return {
      disablePosX: on(kp === 'position' || kp === 'position.x'),
      disablePosY: on(kp === 'position' || kp === 'position.y'),
      disableRotX: on(kp === 'transform.rotation.x'),
      disableRotY: on(kp === 'transform.rotation.y'),
      disableRotZ: on(kp === 'transform.rotation.z'),
    };
  }, [selectedBase]);

  type TabId = 'geometry' | 'compositing' | 'content' | 'text' | 'image' | 'video' | 'animations' | 'gyro';
  const [activeTab, setActiveTab] = useState<TabId>('geometry');

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'geometry' as TabId, icon: Box, label: 'Geometry' },
      { id: 'compositing' as TabId, icon: Layers, label: 'Compositing' },
      { id: 'content' as TabId, icon: Palette, label: 'Content' },
    ];
    if (selected?.type === 'text') {
      baseTabs.push({ id: 'text' as TabId, icon: Type, label: 'Text' });
    }
    if (selected?.type === 'image') {
      baseTabs.push({ id: 'image' as TabId, icon: ImageIcon, label: 'Image' });
    }
    if (selected?.type === 'video') {
      baseTabs.push({ id: 'video' as TabId, icon: Video, label: 'Video' });
    }
    baseTabs.push({ id: 'animations' as TabId, icon: Play, label: 'Animations' });
    if (doc?.meta.gyroEnabled) {
      baseTabs.push({ id: 'gyro' as TabId, icon: Smartphone, label: 'Gyro (Parallax)' });
    }
    return baseTabs;
  }, [selected?.type, doc?.meta.gyroEnabled]);

  useEffect(() => {
    if (selected?.type === 'text' && (activeTab === 'image' || activeTab === 'video')) {
      setActiveTab('text');
    } else if (selected?.type === 'image' && (activeTab === 'text' || activeTab === 'video')) {
      setActiveTab('image');
    } else if (selected?.type === 'video' && (activeTab === 'text' || activeTab === 'image')) {
      setActiveTab('video');
    } else if (selected?.type !== 'text' && selected?.type !== 'image' && selected?.type !== 'video' && (activeTab === 'text' || activeTab === 'image' || activeTab === 'video')) {
      setActiveTab('geometry');
    }
  }, [selected?.type, activeTab]);

  if (isRootSelected) {
    const widthVal = doc?.meta.width ?? 0;
    const heightVal = doc?.meta.height ?? 0;
    const gf = (doc?.meta as any)?.geometryFlipped ?? 0;
    return (
      <Card className="h-full flex flex-col overflow-hidden p-0 gap-0" data-tour-id="inspector">
        <div className="px-3 py-2 border-b shrink-0">
          <div className="font-medium">Inspector</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-1">
              <Label htmlFor="root-w">Width</Label>
              <Input id="root-w" type="number" step="1" value={String(widthVal)}
                onChange={(e)=>{
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setDoc((prev)=> prev ? ({...prev, meta: { ...prev.meta, width: Math.max(0, Math.round(n)) }}) : prev);
                }} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="root-h">Height</Label>
              <Input id="root-h" type="number" step="1" value={String(heightVal)}
                onChange={(e)=>{
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setDoc((prev)=> prev ? ({...prev, meta: { ...prev.meta, height: Math.max(0, Math.round(n)) }}) : prev);
                }} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Flip Geometry</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch checked={gf === 1}
                  onCheckedChange={(checked)=> setDoc((prev)=> prev ? ({...prev, meta: { ...prev.meta, geometryFlipped: checked ? 1 : 0 }}) : prev)} />
                <span className="text-xs text-muted-foreground">When on, origin becomes top-left and Y increases down.</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!selected) {
    return (
      <Card className="h-full flex flex-col overflow-hidden p-0 gap-0" data-tour-id="inspector">
        <div className="px-3 py-2 border-b shrink-0">
          <div className="font-medium">Inspector</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-center text-muted-foreground">
            <SquareSlash className="h-20 w-20 mb-3" />
            <div className="text-m">Select a layer to edit its properties.</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden p-0 gap-0" data-tour-id="inspector">
      <div className="px-3 py-2 border-b shrink-0 flex items-center justify-between">
        <div className="font-medium">Inspector</div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", sidebarPosition === 'left' && "bg-accent")}
                onClick={() => setSidebarPosition('left')}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sidebar Left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", sidebarPosition === 'top' && "bg-accent")}
                onClick={() => setSidebarPosition('top')}
              >
                <PanelTop className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sidebar Top</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7", sidebarPosition === 'right' && "bg-accent")}
                onClick={() => setSidebarPosition('right')}
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sidebar Right</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className={cn("flex-1 flex overflow-hidden", sidebarPosition === 'top' ? "flex-col" : "flex-row")}>
        {sidebarPosition !== 'right' && (
          <div className={cn(
            "flex gap-2 shrink-0",
            sidebarPosition === 'left' ? "w-14 border-r flex-col p-2" : "h-12 border-b flex-row justify-center py-1.5 px-2"
          )}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center justify-center rounded-lg transition-colors",
                        sidebarPosition === 'top' ? "h-9 w-9" : "h-10 w-10",
                        activeTab === tab.id
                          ? "text-green-600 dark:text-green-500"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <Icon className={cn(sidebarPosition === 'top' ? "h-4 w-4" : "h-5 w-5")} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={sidebarPosition === 'left' ? "right" : "bottom"}>
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-sm font-bold mb-3 capitalize">{activeTab}</div>
          {current?.activeState && current.activeState !== 'Base State' && (
            <Alert className="text-xs mb-3">
              <AlertDescription>
                Note: Rotation and Bound state transitions don't work when tested. If you know a fix or it just works for you, please report in the CAPlayground Discord server.
              </AlertDescription>
            </Alert>
          )}

          {activeTab === 'geometry' && (
            <div>
            {(disablePosX || disablePosY || disableRotX || disableRotY || disableRotZ) && (
              <Alert className="mb-3">
                <AlertDescription className="text-xs">
                  Position and rotation fields are disabled because this layer has keyframe animations enabled. The values shown update live during playback.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
        <div className="space-y-1">
          <Label htmlFor="pos-x">X</Label>
          <Input id="pos-x" type="number" step="0.01" value={getBuf('pos-x', fmt2(selected.position.x))}
            disabled={disablePosX}
            onChange={(e) => {
              setBuf('pos-x', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { position: { ...selected.position, x: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 0 : round2(Number(v));
              updateLayer(selected.id, { position: { ...selected.position, x: num } as any });
              clearBuf('pos-x');
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-y">Y</Label>
          <Input id="pos-y" type="number" step="0.01" value={getBuf('pos-y', fmt2(selected.position.y))}
            disabled={disablePosY}
            onChange={(e) => {
              setBuf('pos-y', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { position: { ...selected.position, y: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 0 : round2(Number(v));
              updateLayer(selected.id, { position: { ...selected.position, y: num } as any });
              clearBuf('pos-y');
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="w">Width</Label>
          <Input id="w" type="number" step="0.01" value={getBuf('w', fmt2(selected.size.w))}
            disabled={selected.type === 'text' && (((selected as any).wrapped ?? 1) as number) !== 1}
            onChange={(e) => {
              setBuf('w', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { size: { ...selected.size, w: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 50 : round2(Number(v));
              updateLayer(selected.id, { size: { ...selected.size, w: num } as any });
              clearBuf('w');
            }} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="h">Height</Label>
          <Input id="h" type="number" step="0.01" value={getBuf('h', fmt2(selected.size.h))}
            disabled={selected.type === 'text'}
            onChange={(e) => {
              setBuf('h', e.target.value);
              const v = e.target.value.trim();
              if (v === "") return;
              const num = round2(Number(v));
              if (Number.isFinite(num)) {
                updateLayerTransient(selected.id, { size: { ...selected.size, h: num } as any });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const num = v === "" ? 50 : round2(Number(v));
              updateLayer(selected.id, { size: { ...selected.size, h: num } as any });
              clearBuf('h');
            }} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Rotation (deg)</Label>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="rotation-x" className="text-xs">X</Label>
              <Input
                id="rotation-x"
                type="number"
                step="1"
                value={getBuf('rotationX', fmt0((selected as any).rotationX))}
                disabled={disableRotX}
                onChange={(e) => {
                  setBuf('rotationX', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const num = Math.round(Number(v));
                  if (Number.isFinite(num)) updateLayerTransient(selected.id, { rotationX: num as any } as any);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? 0 : Math.round(Number(v));
                  updateLayer(selected.id, { rotationX: num as any } as any);
                  clearBuf('rotationX');
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation-y" className="text-xs">Y</Label>
              <Input
                id="rotation-y"
                type="number"
                step="1"
                value={getBuf('rotationY', fmt0((selected as any).rotationY))}
                disabled={disableRotY}
                onChange={(e) => {
                  setBuf('rotationY', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const num = Math.round(Number(v));
                  if (Number.isFinite(num)) updateLayerTransient(selected.id, { rotationY: num as any } as any);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? 0 : Math.round(Number(v));
                  updateLayer(selected.id, { rotationY: num as any } as any);
                  clearBuf('rotationY');
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation-z" className="text-xs">Z</Label>
              <Input
                id="rotation-z"
                type="number"
                step="1"
                value={getBuf('rotation', fmt0(selected.rotation))}
                disabled={disableRotZ}
                onChange={(e) => {
                  setBuf('rotation', e.target.value);
                  const v = e.target.value.trim();
                  if (v === "") return;
                  const num = Math.round(Number(v));
                  if (Number.isFinite(num)) updateLayerTransient(selected.id, { rotation: num as any });
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  const num = v === "" ? 0 : Math.round(Number(v));
                  updateLayer(selected.id, { rotation: num as any });
                  clearBuf('rotation');
                }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Anchor Point</Label>
          <div className="grid grid-cols-3 gap-1">
            {([1,0.5,0] as number[]).map((ay, rowIdx) => (
              <Fragment key={`row-${rowIdx}`}>
                {([0,0.5,1] as number[]).map((ax, colIdx) => {
                  const selAx = (selected as any).anchorPoint?.x ?? 0.5;
                  const selAy = (selected as any).anchorPoint?.y ?? 0.5;
                  const isActive = Math.abs(selAx - ax) < 1e-6 && Math.abs(selAy - ay) < 1e-6;
                  return (
                    <Button key={`ap-${rowIdx}-${colIdx}`} type="button" variant={isActive ? 'default' : 'outline'} size="sm"
                      onClick={()=> updateLayer(selected.id, { anchorPoint: { x: ax, y: ay } as any })}>
                      {ax},{ay}
                    </Button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Flip Geometry</Label>
          <div className="flex items-center gap-2 h-8">
            <Switch checked={(((selected as any).geometryFlipped ?? 0) === 1)}
              onCheckedChange={(checked)=> updateLayer(selected.id, { geometryFlipped: (checked ? 1 : 0) as any })} />
            <span className="text-xs text-muted-foreground">Affects this layer’s sublayers’ coordinate system.</span>
          </div>
        </div>
            </div>
            </div>
          )}

          {activeTab === 'compositing' && (
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
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
              value={getBuf('cornerRadius', fmt0((selected as any).cornerRadius ?? (selected as any).radius))}
              onChange={(e) => {
                setBuf('cornerRadius', e.target.value);
                const v = e.target.value.trim();
                if (v === "") return;
                const num = Math.round(Number(v));
                if (Number.isFinite(num)) updateLayerTransient(selected.id, { cornerRadius: num as any } as any);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
              onBlur={(e) => {
                const v = e.target.value.trim();
                const num = v === "" ? 0 : Math.round(Number(v));
                updateLayer(selected.id, { cornerRadius: num as any } as any);
                clearBuf('cornerRadius');
              }}
            />
          </div>
        )}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
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
          )}

          {activeTab === 'text' && selected.type === "text" && (
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
          )}

          {activeTab === 'image' && selected.type === "image" && (
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
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

          {activeTab === 'video' && selected.type === "video" && (
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
              <div className="space-y-1 col-span-2">
                <Label>Video Properties</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Frames: {(selected as any).frameCount || 0}</div>
                  <div>FPS: {(selected as any).fps || 30}</div>
                  <div>Duration: {((selected as any).duration || 0).toFixed(2)}s</div>
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Auto Reverses</Label>
                  <Switch
                    checked={!!(selected as any).autoReverses}
                    onCheckedChange={(checked) => updateLayer(selected.id, { autoReverses: checked } as any)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, the video will play forward then backward in a loop.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'animations' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Enable animation</Label>
                {(selectedBase as any)?.type === 'video' && (
                  <span className="text-xs text-muted-foreground mr-auto ml-2">
                    Note: Animations are not supported for video layers.
                  </span>
                )}
                {current?.activeState && current.activeState !== 'Base State' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          checked={(selectedBase as any)?.type === 'video' ? false : !!(selectedBase as any)?.animations?.enabled}
                          disabled={(selectedBase as any)?.type === 'video'}
                          onCheckedChange={(checked) => {
                            if ((selectedBase as any)?.type === 'video') return;
                            const enabled = !!checked;
                            const currentAnim = (selectedBase as any)?.animations || {};
                            const kp = (currentAnim.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                            let values: Array<{ x: number; y: number } | number> = Array.isArray(currentAnim.values) ? [...currentAnim.values] : [];
                            if (enabled && values.length === 0) {
                              if (kp === 'position') {
                                values = [{ x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 }];
                              } else if (kp === 'position.x') {
                                values = [((selectedBase as any).position?.x ?? 0) as number];
                              } else if (kp === 'position.y') {
                                values = [((selectedBase as any).position?.y ?? 0) as number];
                              } else if (kp === 'transform.rotation.z') {
                                values = [Number((selectedBase as any)?.rotation ?? 0)];
                              } else {
                                values = [0];
                              }
                            }
                            updateLayer(selectedBase!.id, { animations: { ...currentAnim, enabled, keyPath: kp, autoreverses: (currentAnim.autoreverses ?? 0), values, infinite: (currentAnim.infinite ?? 1) } } as any);
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      You must be on the Base State to create animations.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Switch
                    checked={(selectedBase as any)?.type === 'video' ? false : !!(selectedBase as any)?.animations?.enabled}
                    disabled={(selectedBase as any)?.type === 'video'}
                    onCheckedChange={(checked) => {
                      if ((selectedBase as any)?.type === 'video') return;
                      const enabled = !!checked;
                      const currentAnim = (selectedBase as any)?.animations || {};
                      const kp = (currentAnim.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                      let values: Array<{ x: number; y: number } | number> = Array.isArray(currentAnim.values) ? [...currentAnim.values] : [];
                      if (enabled && values.length === 0) {
                        if (kp === 'position') {
                          values = [{ x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 }];
                        } else if (kp === 'position.x') {
                          values = [((selectedBase as any).position?.x ?? 0) as number];
                        } else if (kp === 'position.y') {
                          values = [((selectedBase as any).position?.y ?? 0) as number];
                        } else if (kp === 'transform.rotation.z') {
                          values = [Number((selectedBase as any)?.rotation ?? 0)];
                        } else {
                          values = [0];
                        }
                      }
                      updateLayer(selectedBase!.id, { animations: { ...currentAnim, enabled, keyPath: kp, autoreverses: (currentAnim.autoreverses ?? 0), values, infinite: (currentAnim.infinite ?? 1) } } as any);
                    }}
                  />
                )}
              </div>
              <div className={`grid grid-cols-2 gap-2 ${animEnabled ? '' : 'opacity-50'}`}>
                <div className="space-y-1">
                  <Label>Key path</Label>
                  <Select
                    value={((selectedBase as any)?.animations?.keyPath ?? 'position') as any}
                    onValueChange={(v) => {
                      const current = (selectedBase as any)?.animations || {};
                      const kp = v as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                      const prevVals = (current.values || []) as Array<{ x: number; y: number } | number>;
                      let values: Array<{ x: number; y: number } | number> = [];
                      if (kp === 'position') {
                        values = prevVals.map((pv: any) => {
                          if (typeof pv === 'number') {
                            return { x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 };
                          }
                          return { x: Number(pv?.x ?? 0), y: Number(pv?.y ?? 0) };
                        });
                      } else if (kp === 'position.x') {
                        values = prevVals.map((pv: any) => typeof pv === 'number' ? pv : Number(pv?.x ?? (selectedBase as any).position?.x ?? 0));
                      } else if (kp === 'position.y') {
                        values = prevVals.map((pv: any) => typeof pv === 'number' ? pv : Number(pv?.y ?? (selectedBase as any).position?.y ?? 0));
                      } else if (kp === 'transform.rotation.z' || kp === 'transform.rotation.x' || kp === 'transform.rotation.y') {
                        const fallback = (kp === 'transform.rotation.z') ? Number((selectedBase as any)?.rotation ?? 0) : 0;
                        values = prevVals.map((pv: any) => typeof pv === 'number' ? pv : fallback);
                      }
                      updateLayer(selectedBase!.id, { animations: { ...current, keyPath: kp, values } } as any);
                    }}
                    disabled={!animEnabled}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select key path" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="position">position</SelectItem>
                      <SelectItem value="position.x">position.x</SelectItem>
                      <SelectItem value="position.y">position.y</SelectItem>
                      <SelectItem value="transform.rotation.x">transform.rotation.x</SelectItem>
                      <SelectItem value="transform.rotation.y">transform.rotation.y</SelectItem>
                      <SelectItem value="transform.rotation.z">transform.rotation.z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Autoreverse</Label>
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={((selectedBase as any)?.animations?.autoreverses ?? 0) === 1}
                      onCheckedChange={(checked) => {
                        const current = (selectedBase as any)?.animations || {};
                        updateLayer(selectedBase!.id, { animations: { ...current, autoreverses: checked ? 1 : 0 } } as any);
                      }}
                      disabled={!animEnabled}
                    />
                    <span className="text-xs text-muted-foreground">Reverse on repeat</span>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="anim-duration">Duration (s)</Label>
                  <Input
                    id="anim-duration"
                    type="number"
                    step="0.01"
                    min="0"
                    className="h-8"
                    value={getBuf('anim-duration', (() => { const d = Number((selectedBase as any)?.animations?.durationSeconds); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
                    onChange={(e) => setBuf('anim-duration', e.target.value)}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      const current = (selectedBase as any)?.animations || {};
                      const n = v === '' ? 1 : Number(v);
                      const dur = Number.isFinite(n) && n > 0 ? n : 1;
                      updateLayer(selectedBase!.id, { animations: { ...current, durationSeconds: dur } } as any);
                      clearBuf('anim-duration');
                    }}
                    disabled={!animEnabled}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Loop infinitely</Label>
                  <div className="flex items-center gap-2 h-8">
                    <Switch
                      checked={(((selectedBase as any)?.animations?.infinite ?? 1) as number) === 1}
                      onCheckedChange={(checked) => {
                        const current = (selectedBase as any)?.animations || {};
                        updateLayer(selectedBase!.id, { animations: { ...current, infinite: checked ? 1 : 0 } } as any);
                      }}
                      disabled={!animEnabled}
                    />
                    <span className="text-xs text-muted-foreground">When off, specify total repeat time.</span>
                  </div>
                </div>
                {(((selectedBase as any)?.animations?.infinite ?? 1) as number) !== 1 && (
                  <div className="space-y-1 col-span-2">
                    <Label htmlFor="anim-repeat">Repeat for (s)</Label>
                    <Input
                      id="anim-repeat"
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8"
                      value={getBuf('anim-repeat', (() => { const d = Number((selectedBase as any)?.animations?.repeatDurationSeconds); return Number.isFinite(d) && d > 0 ? String(d) : ''; })())}
                      onChange={(e) => setBuf('anim-repeat', e.target.value)}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const current = (selectedBase as any)?.animations || {};
                        const n = v === '' ? Number((selectedBase as any)?.animations?.durationSeconds) || 1 : Number(v);
                        const total = Number.isFinite(n) && n > 0 ? n : (Number((selectedBase as any)?.animations?.durationSeconds) || 1);
                        updateLayer(selectedBase!.id, { animations: { ...current, repeatDurationSeconds: total } } as any);
                        clearBuf('anim-repeat');
                      }}
                      disabled={!animEnabled}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    {(() => {
                      const kp = ((selectedBase as any)?.animations?.keyPath ?? 'position') as string;
                      if (kp.startsWith('transform.rotation')) return 'Values (Degrees)';
                      if (kp === 'position') return 'Values (CGPoint)';
                      return 'Values (Number)';
                    })()}
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const current = (selectedBase as any)?.animations || {};
                      const kp = (current.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                      const values = [...(current.values || [])] as any[];
                      if (kp === 'position') {
                        values.push({ x: (selectedBase as any).position?.x ?? 0, y: (selectedBase as any).position?.y ?? 0 });
                      } else if (kp === 'position.x') {
                        values.push((selectedBase as any).position?.x ?? 0);
                      } else if (kp === 'position.y') {
                        values.push((selectedBase as any).position?.y ?? 0);
                      } else if (kp === 'transform.rotation.z') {
                        values.push(Number((selectedBase as any)?.rotation ?? 0));
                      } else if (kp === 'transform.rotation.x' || kp === 'transform.rotation.y') {
                        values.push(0);
                      }
                      updateLayer(selectedBase!.id, { animations: { ...current, values } } as any);
                    }}
                    disabled={!animEnabled}
                  >
                    + Add key value
                  </Button>
                </div>
                <div className={`space-y-2 ${animEnabled ? '' : 'opacity-50'}`}>
                  {(() => {
                    const kp = ((selectedBase as any)?.animations?.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
                    const values = (((selectedBase as any)?.animations?.values || []) as Array<any>);
                    if (kp === 'position') {
                      return (
                        <>
                          {values.map((pt, idx) => (
                            <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">X</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  className="h-8"
                                  value={Number.isFinite(pt?.x) ? String(Math.round(pt.x)) : ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const current = (selectedBase as any)?.animations || {};
                                    const arr = [...(current.values || [])];
                                    const n = Number(v);
                                    arr[idx] = { x: Number.isFinite(n) ? n : 0, y: arr[idx]?.y ?? 0 };
                                    updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                                  }}
                                  disabled={!animEnabled}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Y</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  className="h-8"
                                  value={Number.isFinite(pt?.y) ? String(Math.round(pt.y)) : ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const current = (selectedBase as any)?.animations || {};
                                    const arr = [...(current.values || [])];
                                    const n = Number(v);
                                    arr[idx] = { x: arr[idx]?.x ?? 0, y: Number.isFinite(n) ? n : 0 };
                                    updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                                  }}
                                  disabled={!animEnabled}
                                />
                              </div>
                              <div className="flex items-center justify-end pb-0.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const current = (selectedBase as any)?.animations || {};
                                    const arr = [...(current.values || [])];
                                    arr.splice(idx, 1);
                                    updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                                  }}
                                  disabled={!animEnabled}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    }
                    return (
                      <>
                        {values.map((val, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-2 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">{kp === 'position.x' ? 'X' : kp === 'position.y' ? 'Y' : 'Degrees'}</Label>
                              <Input
                                type="number"
                                step="1"
                                className="h-8"
                                value={Number.isFinite(Number(val)) ? String(Math.round(Number(val))) : ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const current = (selectedBase as any)?.animations || {};
                                  const arr = [...(current.values || [])];
                                  const n = Number(v);
                                  arr[idx] = Number.isFinite(n) ? n : 0;
                                  updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                                }}
                                disabled={!animEnabled}
                              />
                            </div>
                            <div className="flex items-center justify-end pb-0.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const current = (selectedBase as any)?.animations || {};
                                  const arr = [...(current.values || [])];
                                  arr.splice(idx, 1);
                                  updateLayer(selectedBase!.id, { animations: { ...current, values: arr } } as any);
                                }}
                                disabled={!animEnabled}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                  {(((selectedBase as any)?.animations?.values || []) as any[]).length === 0 && (
                    <div className="text-xs text-muted-foreground">No key values yet. Click "+ Add key value" to add the first keyframe.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gyro' && (() => {
            const gyroDicts = current?.wallpaperParallaxGroups || [];
            const layerDicts = gyroDicts.filter(d => d.layerName === selected?.name);
            
            const addDictionary = () => {
              if (layerDicts.length >= 10) {
                return;
              }
              const newDict = {
                axis: 'x' as 'x' | 'y',
                image: 'null',
                keyPath: 'position.x' as any,
                layerName: selected?.name || '',
                mapMaxTo: 50,
                mapMinTo: -50,
                title: 'New Gyro Effect',
                view: 'Floating',
              };
              setDoc((prev) => {
                if (!prev) return prev;
                const key = prev.activeCA;
                const currentDicts = prev.docs[key].wallpaperParallaxGroups || [];
                return {
                  ...prev,
                  docs: {
                    ...prev.docs,
                    [key]: {
                      ...prev.docs[key],
                      wallpaperParallaxGroups: [...currentDicts, newDict],
                    },
                  },
                };
              });
            };
            
            const updateDictionary = (index: number, updates: Partial<typeof layerDicts[0]>) => {
              setDoc((prev) => {
                if (!prev) return prev;
                const key = prev.activeCA;
                const allDicts = prev.docs[key].wallpaperParallaxGroups || [];
                const globalIndex = allDicts.findIndex((d, i) => d.layerName === selected?.name && layerDicts.findIndex(ld => ld === d) === index);
                if (globalIndex === -1) return prev;
                const updated = [...allDicts];
                updated[globalIndex] = { ...updated[globalIndex], ...updates };
                return {
                  ...prev,
                  docs: {
                    ...prev.docs,
                    [key]: {
                      ...prev.docs[key],
                      wallpaperParallaxGroups: updated,
                    },
                  },
                };
              });
            };
            
            const removeDictionary = (index: number) => {
              setDoc((prev) => {
                if (!prev) return prev;
                const key = prev.activeCA;
                const allDicts = prev.docs[key].wallpaperParallaxGroups || [];
                const globalIndex = allDicts.findIndex((d, i) => d.layerName === selected?.name && layerDicts.findIndex(ld => ld === d) === index);
                if (globalIndex === -1) return prev;
                const updated = allDicts.filter((_, i) => i !== globalIndex);
                return {
                  ...prev,
                  docs: {
                    ...prev.docs,
                    [key]: {
                      ...prev.docs[key],
                      wallpaperParallaxGroups: updated,
                    },
                  },
                };
              });
            };
            
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Gyro Dictionaries</Label>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={addDictionary}
                      disabled={layerDicts.length >= 10}
                    >
                      + Add Dictionary
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure how this layer responds to device tilt. You can add up to 10 dictionaries (2 axes × 5 keyPaths) for this layer. ({layerDicts.length}/10)
                  </p>
                </div>

                {layerDicts.length === 0 ? (
                  <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                    No gyro dictionaries yet. Click "+ Add Dictionary" to create one.
                  </div>
                ) : (
                  layerDicts.map((dict, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{dict.title || `Dictionary ${index + 1}`}</Label>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-destructive"
                          onClick={() => removeDictionary(index)}
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`gyro-title-${index}`}>Title</Label>
                          <Input 
                            id={`gyro-title-${index}`}
                            type="text" 
                            placeholder="e.g., Tilt Effect"
                            value={dict.title}
                            onChange={(e) => updateDictionary(index, { title: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`gyro-axis-${index}`}>Axis</Label>
                          <Select 
                            value={dict.axis}
                            onValueChange={(v) => updateDictionary(index, { axis: v as 'x' | 'y' })}
                          >
                            <SelectTrigger id={`gyro-axis-${index}`}>
                              <SelectValue placeholder="Select axis" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="x">X (Left/Right)</SelectItem>
                              <SelectItem value="y">Y (Up/Down)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`gyro-keypath-${index}`}>Key Path</Label>
                          <Select 
                            value={dict.keyPath}
                            onValueChange={(v) => updateDictionary(index, { keyPath: v as any })}
                          >
                            <SelectTrigger id={`gyro-keypath-${index}`}>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="position.x">position.x</SelectItem>
                              <SelectItem value="position.y">position.y</SelectItem>
                              <SelectItem value="transform.rotation.x">transform.rotation.x</SelectItem>
                              <SelectItem value="transform.rotation.y">transform.rotation.y</SelectItem>
                              <SelectItem value="transform.rotation.z">transform.rotation.z</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`gyro-min-${index}`}>Map Min To</Label>
                            <Input 
                              id={`gyro-min-${index}`}
                              type="number" 
                              step="0.01" 
                              placeholder="e.g., -50"
                              value={dict.mapMinTo}
                              onChange={(e) => updateDictionary(index, { mapMinTo: Number(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">
                              Min value (radians for rotation, px for position)
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor={`gyro-max-${index}`}>Map Max To</Label>
                            <Input 
                              id={`gyro-max-${index}`}
                              type="number" 
                              step="0.01" 
                              placeholder="e.g., 50"
                              value={dict.mapMaxTo}
                              onChange={(e) => updateDictionary(index, { mapMaxTo: Number(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">
                              Max value (radians for rotation, px for position)
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor={`gyro-view-${index}`}>View</Label>
                          <Input 
                            id={`gyro-view-${index}`}
                            type="text" 
                            value="Floating" 
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            View type is locked to Floating for gyro wallpapers
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            );
          })()}
        </div>
        
        {sidebarPosition === 'right' && (
          <div className="w-14 border-l flex flex-col gap-2 p-2 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-lg transition-colors",
                        activeTab === tab.id
                          ? "text-green-600 dark:text-green-500"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {tab.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
