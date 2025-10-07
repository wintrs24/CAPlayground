"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import type { InspectorTabProps } from "../types";

interface ImageTabProps extends Omit<InspectorTabProps, 'getBuf' | 'setBuf' | 'clearBuf' | 'round2' | 'fmt2' | 'fmt0' | 'updateLayerTransient' | 'selectedBase'> {
  replaceImageForLayer: (id: string, file: File) => Promise<void>;
}

export function ImageTab({
  selected,
  updateLayer,
  replaceImageForLayer,
}: ImageTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (selected.type !== 'image') return null;

  return (
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
  );
}
