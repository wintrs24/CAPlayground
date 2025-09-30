"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical } from "lucide-react";
import { useEditor } from "./editor-context";
import { useRef, useState } from "react";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";

export function LayersPanel() {
  const { doc, selectLayer, addTextLayer, addImageLayerFromFile, addShapeLayer, deleteLayer, duplicateLayer, moveLayer, updateLayer } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const layers = current?.layers ?? [];
  const selectedId = current?.selectedId ?? null;
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");

  const startRename = (l: AnyLayer) => {
    setEditingId(l.id);
    setEditingName(l.name || "");
  };
  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };
  const commitRename = () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (name) updateLayer(editingId, { name } as any);
    cancelRename();
  };

  const renderItem = (l: AnyLayer, depth: number) => {
    const row = (
      <div
        key={l.id}
        className={`px-2 py-2 flex items-center justify-between cursor-pointer ${selectedId === l.id ? 'bg-accent/30' : 'hover:bg-muted/50'} ${dragOverId === l.id ? 'ring-1 ring-accent/60' : ''}`}
        onClick={() => selectLayer(l.id)}
        onDoubleClick={() => startRename(l)}
        style={{ paddingLeft: 8 + depth * 12 }}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/cap-layer-id', l.id);
          try { e.dataTransfer.effectAllowed = 'move'; } catch {}
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOverId(l.id);
        }}
        onDragLeave={() => {
          setDragOverId((prev) => (prev === l.id ? null : prev));
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const src = e.dataTransfer.getData('text/cap-layer-id');
          setDragOverId(null);
          if (!src || src === l.id) return;
          moveLayer(src, l.id);
        }}
      >
        <div className="truncate flex-1 min-w-0">
          {editingId === l.id ? (
            <input
              className="w-full bg-transparent border border-muted rounded-sm px-1 py-0.5 text-sm"
              value={editingName}
              autoFocus
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => commitRename()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                else if (e.key === 'Escape') cancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              {l.name} <span className="text-muted-foreground">({l.type === "shape" ? "basic" : l.type})</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground"
                onClick={(e) => { e.stopPropagation(); }}
                aria-label="More actions"
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => startRename(l)}>Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateLayer(l.id)}>Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteLayer(l.id)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
    if (l.type === "group") {
      const g = l as GroupLayer;
      return (
        <div key={l.id}>
          {row}
          {g.children.map((c) => renderItem(c, depth + 1))}
        </div>
      );
    }
    return row;
  };

  return (
    <Card className="p-0 gap-0 h-full flex flex-col" data-tour-id="layers-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="font-medium">Layers</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <Plus className="h-4 w-4 mr-1" /> Add Layer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={addTextLayer}>Text Layer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => addShapeLayer("rect")}>Basic Layer</DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Image Layer…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            for (const file of files) {
              try { await addImageLayerFromFile(file); } catch {}
            }
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      </div>

      <div className="flex-1 overflow-hidden p-3">
        <div className="text-sm rounded-lg border bg-card shadow-sm divide-y flex flex-col overflow-hidden">
          <div
            className={`px-2 py-2 font-medium select-none cursor-pointer ${selectedId === '__root__' ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
            onClick={() => selectLayer('__root__' as any)}
          >
            Root Layer
          </div>
          <div
            className="flex-1 overflow-auto"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => {
              const src = e.dataTransfer.getData('text/cap-layer-id');
              setDragOverId(null);
              if (!src) return;
              moveLayer(src, null);
            }}
          >
            {layers.length === 0 && (
              <div className="px-2 py-2 text-muted-foreground">No layers yet</div>
            )}
            {layers.map((l) => renderItem(l, 0))}
          </div>
        </div>
      </div>
    </Card>
  );
}
