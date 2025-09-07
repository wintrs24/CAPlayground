"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnyLayer, CAProject, GroupLayer, ImageLayer, LayerBase, ShapeLayer, TextLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type ProjectDocument = {
  meta: Pick<CAProject, "id" | "name" | "width" | "height" | "background">;
  layers: AnyLayer[];
  selectedId?: string | null;
  assets?: Record<string, { filename: string; dataURL: string }>;
  states: string[];
};

const STORAGE_PREFIX = "caplayground-project:";
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type EditorContextValue = {
  doc: ProjectDocument | null;
  setDoc: React.Dispatch<React.SetStateAction<ProjectDocument | null>>;
  addTextLayer: () => void;
  addImageLayer: (src?: string) => void;
  addImageLayerFromFile: (file: File) => Promise<void>;
  replaceImageForLayer: (layerId: string, file: File) => Promise<void>;
  addShapeLayer: (shape?: ShapeLayer["shape"]) => void;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
  updateLayerTransient: (id: string, patch: Partial<AnyLayer>) => void;
  selectLayer: (id: string | null) => void;
  deleteLayer: (id: string) => void;
  persist: () => void;
  undo: () => void;
  redo: () => void;
  addState: (name?: string) => void;
  renameState: (oldName: string, newName: string) => void;
  deleteState: (name: string) => void;
};

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

export function EditorProvider({
  projectId,
  initialMeta,
  children,
}: {
  projectId: string;
  initialMeta: Pick<CAProject, "id" | "name" | "width" | "height"> & { background?: string };
  children: React.ReactNode;
}) {
  const storageKey = STORAGE_PREFIX + projectId;
  const [storedDoc, setStoredDoc] = useLocalStorage<ProjectDocument | null>(storageKey, null);
  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const pastRef = useRef<ProjectDocument[]>([]);
  const futureRef = useRef<ProjectDocument[]>([]);
  const skipPersistRef = useRef(false);

  const pushHistory = useCallback((prev: ProjectDocument) => {
    pastRef.current.push(JSON.parse(JSON.stringify(prev)) as ProjectDocument);
    futureRef.current = [];
  }, []);

  useEffect(() => {
    if (doc !== null) return;
    if (storedDoc) {
      const defaults = ["Locked", "Unlock", "Sleep"];
      const loaded = Array.isArray((storedDoc as any).states) ? (storedDoc as any).states as string[] : [];
      const filtered = loaded.filter((n) => !/^base(\s*state)?$/i.test((n || '').trim()));
      const next: ProjectDocument = {
        ...(storedDoc as any),
        states: filtered.length > 0 ? filtered : defaults,
      } as ProjectDocument;
      setDoc(next);
    } else {
      setDoc({
        meta: {
          id: initialMeta.id,
          name: initialMeta.name,
          width: initialMeta.width,
          height: initialMeta.height,
          background: initialMeta.background ?? "#e5e7eb",
        },
        layers: [],
        selectedId: null,
        assets: {},
        states: ["Locked", "Unlock", "Sleep"],
      });
    }
  }, [doc, storedDoc, initialMeta.id]);

  const persist = useCallback(() => {
    if (doc) setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  useEffect(() => {
    if (!doc) return;
    if (skipPersistRef.current) {
     
      skipPersistRef.current = false;
      return;
    }
    setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  const selectLayer = useCallback((id: string | null) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      return { ...prev, selectedId: id };
    });
  }, []);

  const addBase = useCallback((name: string): LayerBase => ({
    id: genId(),
    name,
    position: { x: 50, y: 50 },
    size: { w: 120, h: 40 },
    rotation: 0,
    visible: true,
  }), []);

  const addTextLayer = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: TextLayer = {
        ...addBase("Text Layer"),
        type: "text",
        text: "Text Layer",
        color: "#111827",
        fontSize: 16,
        align: "left",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const replaceImageForLayer = useCallback(async (layerId: string, file: File) => {
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const filename = sanitizeFilename(file.name) || `image-${Date.now()}.png`;
      const assets = { ...(prev.assets || {}) };
      assets[layerId] = { filename, dataURL };
      const updateRec = (layers: AnyLayer[]): AnyLayer[] =>
        layers.map((l) => {
          if (l.id === layerId && l.type === "image") {
            return { ...l, src: dataURL } as AnyLayer;
          }
          if (l.type === "group") {
            return { ...(l as GroupLayer), children: updateRec((l as GroupLayer).children) } as AnyLayer;
          }
          return l;
        });
      return { ...prev, assets, layers: updateRec(prev.layers) };
    });
  }, []);

  const addImageLayer = useCallback((src?: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase("Image Layer"),
        type: "image",
        size: { w: 200, h: 120 },
        src: src ?? "https://placehold.co/200x120/png",
        fit: "fill",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addImageLayerFromFile = useCallback(async (file: File) => {
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase(file.name || "Image Layer"),
        type: "image",
        size: { w: 200, h: 120 },
        src: dataURL,
        fit: "fill",
      };
      const assets = { ...(prev.assets || {}) };
      assets[layer.id] = { filename: sanitizeFilename(file.name) || `image-${Date.now()}.png`, dataURL };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id, assets };
    });
  }, [addBase]);

  function sanitizeFilename(name: string): string {
    const n = (name || '').trim();
    if (!n) return '';
    const parts = n.split('.');
    const ext = parts.length > 1 ? parts.pop() as string : '';
    const base = parts.join('.') || 'image';
    const safeBase = base.replace(/[^a-z0-9\-_.]+/gi, '_');
    const safeExt = (ext || '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
    return safeExt ? `${safeBase}.${safeExt}` : safeBase;
  }

  const addShapeLayer = useCallback((shape: ShapeLayer["shape"] = "rect") => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ShapeLayer = {
        ...addBase("Shape Layer"),
        type: "shape",
        size: { w: 120, h: 120 },
        shape,
        fill: "#60a5fa",
        radius: shape === "rounded-rect" ? 8 : undefined,
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const updateInTree = useCallback((layers: AnyLayer[], id: string, patch: Partial<AnyLayer>): AnyLayer[] => {
    return layers.map((l) => {
      if (l.id === id) return { ...l, ...patch } as AnyLayer;
      if (l.type === "group") {
        const g = l as GroupLayer;
        return { ...g, children: updateInTree(g.children, id, patch) } as AnyLayer;
      }
      return l;
    });
  }, []);

  const deleteInTree = useCallback((layers: AnyLayer[], id: string): AnyLayer[] => {
    const next: AnyLayer[] = [];
    for (const l of layers) {
      if (l.id === id) continue;
      if (l.type === "group") {
        const g = l as GroupLayer;
        next.push({ ...g, children: deleteInTree(g.children, id) } as AnyLayer);
      } else {
        next.push(l);
      }
    }
    return next;
  }, []);

  const containsId = useCallback((layers: AnyLayer[], id: string): boolean => {
    for (const l of layers) {
      if (l.id === id) return true;
      if (l.type === "group" && containsId((l as GroupLayer).children, id)) return true;
    }
    return false;
  }, []);

  const updateLayer = useCallback((id: string, patch: Partial<AnyLayer>) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      return {
        ...prev,
        layers: updateInTree(prev.layers, id, patch),
      };
    });
  }, [updateInTree]);

  const updateLayerTransient = useCallback((id: string, patch: Partial<AnyLayer>) => {
    skipPersistRef.current = true;
    setDoc((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        layers: updateInTree(prev.layers, id, patch),
      };
    });
  }, [updateInTree]);

  const deleteLayer = useCallback((id: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const nextLayers = deleteInTree(prev.layers, id);
      const nextSelected = prev.selectedId === id || (prev.selectedId ? !containsId(nextLayers, prev.selectedId) : false) ? null : prev.selectedId;
      return { ...prev, layers: nextLayers, selectedId: nextSelected };
    });
  }, [deleteInTree, containsId]);

  const undo = useCallback(() => {
    setDoc((current) => {
      if (!current) return current;
      const past = pastRef.current;
      if (past.length === 0) return current;
      const previous = past.pop() as ProjectDocument;
      futureRef.current.push(current);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setDoc((current) => {
      if (!current) return current;
      const future = futureRef.current;
      if (future.length === 0) return current;
      const next = future.pop() as ProjectDocument;
      pastRef.current.push(current);
      return next;
    });
  }, []);

  const addState = useCallback((name?: string) => {
    const desired = ((name ?? 'New State').trim()) || 'New State';
    if (/^base(\s*state)?$/i.test(desired)) return;
    setDoc((prev) => {
      if (!prev) return prev;
      const existing = (prev.states || []);
      const lower = new Set(existing.map((s) => s.toLowerCase()));
      let candidate = desired;
      if (lower.has(candidate.toLowerCase())) {
        let i = 1;
        while (lower.has(`${desired} ${i}`.toLowerCase())) i++;
        candidate = `${desired} ${i}`;
      }
      pushHistory(prev);
      return { ...prev, states: [...existing, candidate] };
    });
  }, [pushHistory]);

  const renameState = useCallback((oldName: string, newName: string) => {
    const nn = (newName || '').trim();
    if (!nn) return;
    if (/^base(\s*state)?$/i.test(oldName) || /^base(\s*state)?$/i.test(nn)) return;
    setDoc((prev) => {
      if (!prev) return prev;
      const idx = (prev.states || []).findIndex(s => s === oldName);
      if (idx === -1) return prev;
      if (prev.states.some(s => s.toLowerCase() === nn.toLowerCase())) return prev;
      pushHistory(prev);
      const copy = [...prev.states];
      copy[idx] = nn;
      return { ...prev, states: copy };
    });
  }, [pushHistory]);

  const deleteState = useCallback((name: string) => {
    if (/^base(\s*state)?$/i.test(name)) return;
    setDoc((prev) => {
      if (!prev) return prev;
      const next = (prev.states || []).filter(s => s !== name);
      pushHistory(prev);
      return { ...prev, states: next };
    });
  }, [pushHistory]);

  const value = useMemo<EditorContextValue>(() => ({
    doc,
    setDoc,
    addTextLayer,
    addImageLayer,
    addImageLayerFromFile,
    replaceImageForLayer,
    addShapeLayer,
    updateLayer,
    updateLayerTransient,
    selectLayer,
    deleteLayer,
    persist,
    undo,
    redo,
    addState,
    renameState,
    deleteState,
  }), [doc, addTextLayer, addImageLayer, addImageLayerFromFile, replaceImageForLayer, addShapeLayer, updateLayer, updateLayerTransient, selectLayer, deleteLayer, persist, undo, redo, addState, renameState, deleteState]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
