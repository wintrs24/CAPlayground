"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AnyLayer, CAProject, ImageLayer, LayerBase, ShapeLayer, TextLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";

export type ProjectDocument = {
  meta: Pick<CAProject, "id" | "name" | "width" | "height" | "background">;
  layers: AnyLayer[];
  selectedId?: string | null;
};

const STORAGE_PREFIX = "caplayground-project:";
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type EditorContextValue = {
  doc: ProjectDocument | null;
  setDoc: React.Dispatch<React.SetStateAction<ProjectDocument | null>>;
  addTextLayer: () => void;
  addImageLayer: (src?: string) => void;
  addShapeLayer: (shape?: ShapeLayer["shape"]) => void;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
  selectLayer: (id: string | null) => void;
  deleteLayer: (id: string) => void;
  persist: () => void;
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

  useEffect(() => {
    if (storedDoc) {
      setDoc(storedDoc);
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
      });
    }
  }, [storedDoc, initialMeta.id]);

  const persist = useCallback(() => {
    if (doc) setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  useEffect(() => {
    if (doc) setStoredDoc(doc);
  }, [doc, setStoredDoc]);

  const selectLayer = useCallback((id: string | null) => {
    setDoc((prev) => (prev ? { ...prev, selectedId: id } : prev));
  }, []);

  const addBase = useCallback((name: string, type: LayerBase["type"]): LayerBase => ({
    id: genId(),
    name,
    type: type as any,
    position: { x: 50, y: 50 },
    size: { w: 120, h: 40 },
    rotation: 0,
    visible: true,
  }), []);

  const addTextLayer = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      const layer: TextLayer = {
        ...(addBase("Text Layer", "text") as LayerBase),
        type: "text",
        text: "Text Layer",
        color: "#111827",
        fontSize: 16,
        align: "left",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addImageLayer = useCallback((src?: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const layer: ImageLayer = {
        ...(addBase("Image Layer", "image") as LayerBase),
        type: "image",
        size: { w: 200, h: 120 },
        src: src ?? "https://placehold.co/200x120/png",
        fit: "cover",
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const addShapeLayer = useCallback((shape: ShapeLayer["shape"] = "rect") => {
    setDoc((prev) => {
      if (!prev) return prev;
      const layer: ShapeLayer = {
        ...(addBase("Shape Layer", "shape") as LayerBase),
        type: "shape",
        size: { w: 120, h: 120 },
        shape,
        fill: "#60a5fa",
        radius: shape === "oval" ? 999 : 8,
      };
      return { ...prev, layers: [...prev.layers, layer], selectedId: layer.id };
    });
  }, [addBase]);

  const updateLayer = useCallback((id: string, patch: Partial<AnyLayer>) => {
    setDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        layers: prev.layers.map((l) => (l.id === id ? { ...l, ...patch } as AnyLayer : l)),
      };
    });
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const nextLayers = prev.layers.filter((l) => l.id !== id);
      const nextSelected = prev.selectedId === id ? null : prev.selectedId;
      return { ...prev, layers: nextLayers, selectedId: nextSelected };
    });
  }, []);

  const value = useMemo<EditorContextValue>(() => ({
    doc,
    setDoc,
    addTextLayer,
    addImageLayer,
    addShapeLayer,
    updateLayer,
    selectLayer,
    deleteLayer,
    persist,
  }), [doc, addTextLayer, addImageLayer, addShapeLayer, updateLayer, selectLayer, deleteLayer, persist]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
