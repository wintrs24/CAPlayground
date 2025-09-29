"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AnyLayer, CAProject, GroupLayer, ImageLayer, LayerBase, ShapeLayer, TextLayer } from "@/lib/ca/types";
import { serializeCAML } from "@/lib/ca/caml";
import { getProject, listFiles, putBlobFile, putTextFile } from "@/lib/idb";

type CADoc = {
  layers: AnyLayer[];
  selectedId?: string | null;
  assets?: Record<string, { filename: string; dataURL: string }>;
  states: string[];
  stateOverrides?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>;
  activeState?: 'Base State' | 'Locked' | 'Unlock' | 'Sleep';
  stateTransitions?: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }>; }>;
};

export type ProjectDocument = {
  meta: Pick<CAProject, "id" | "name" | "width" | "height" | "background" | "geometryFlipped">;
  activeCA: 'background' | 'floating';
  docs: {
    background: CADoc;
    floating: CADoc;
  };
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export type EditorContextValue = {
  doc: ProjectDocument | null;
  setDoc: React.Dispatch<React.SetStateAction<ProjectDocument | null>>;
  activeCA: 'background' | 'floating';
  setActiveCA: (v: 'background' | 'floating') => void;
  savingStatus: 'idle' | 'saving' | 'saved';
  lastSavedAt?: number;
  flushPersist: () => Promise<void>;
  addTextLayer: () => void;
  addImageLayer: (src?: string) => void;
  addImageLayerFromFile: (file: File) => Promise<void>;
  addImageLayerFromBlob: (blob: Blob, filename?: string) => Promise<void>;
  replaceImageForLayer: (layerId: string, file: File) => Promise<void>;
  addShapeLayer: (shape?: ShapeLayer["shape"]) => void;
  updateLayer: (id: string, patch: Partial<AnyLayer>) => void;
  updateLayerTransient: (id: string, patch: Partial<AnyLayer>) => void;
  selectLayer: (id: string | null) => void;
  deleteLayer: (id: string) => void;
  copySelectedLayer: () => void;
  pasteFromClipboard: (payload?: any) => void;
  duplicateLayer: (id?: string) => void;
  moveLayer: (sourceId: string, beforeId: string | null) => void;
  persist: () => void;
  undo: () => void;
  redo: () => void;
  addState: (name?: string) => void;
  renameState: (oldName: string, newName: string) => void;
  deleteState: (name: string) => void;
  setActiveState: (state: 'Base State' | 'Locked' | 'Unlock' | 'Sleep') => void;
  updateStateOverride: (targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => void;
  updateStateOverrideTransient: (targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => void;
  isAnimationPlaying: boolean;
  setIsAnimationPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  animatedLayers: AnyLayer[];
  setAnimatedLayers: React.Dispatch<React.SetStateAction<AnyLayer[]>>;
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
  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavePromiseRef = useRef<Promise<void> | null>(null);
  const pastRef = useRef<ProjectDocument[]>([]);
  const futureRef = useRef<ProjectDocument[]>([]);
  const skipPersistRef = useRef(false);
  const clipboardRef = useRef<{
    type: 'layers';
    data: AnyLayer[];
    assets?: Record<string, { filename: string; dataURL: string }>;
  } | null>(null);
  
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [animatedLayers, setAnimatedLayers] = useState<AnyLayer[]>([]);

  const currentKey = doc?.activeCA ?? 'floating';
  const currentDoc: CADoc | null = doc ? doc.docs[currentKey] : null;

  const pushHistory = useCallback((prev: ProjectDocument) => {
    pastRef.current.push(JSON.parse(JSON.stringify(prev)) as ProjectDocument);
    futureRef.current = [];
  }, []);

  const findById = useCallback((layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined => {
    if (!id) return undefined;
    for (const l of layers) {
      if (l.id === id) return l;
      if ((l as any).type === 'group') {
        const g = l as GroupLayer;
        const found = findById(g.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }, []);

  const cloneLayerDeep = useCallback((layer: AnyLayer): AnyLayer => {
    const newId = genId();
    if (layer.type === 'group') {
      const g = layer as GroupLayer;
      return {
        ...JSON.parse(JSON.stringify({ ...g, id: newId })) as GroupLayer,
        id: newId,
        children: g.children.map(cloneLayerDeep),
        position: { x: (g.position?.x ?? 0) + 10, y: (g.position?.y ?? 0) + 10 },
        name: `${g.name} copy`,
      } as AnyLayer;
    }
    const base = JSON.parse(JSON.stringify({ ...layer })) as AnyLayer;
    (base as any).id = newId;
    (base as any).name = `${layer.name} copy`;
    (base as any).position = { x: (layer as any).position?.x + 10, y: (layer as any).position?.y + 10 };
    return base;
  }, []);

  useEffect(() => {
    if (doc !== null) return;
    const fixedStates = ["Locked", "Unlock", "Sleep"] as const;
    (async () => {
      try {
        const proj = await getProject(projectId);
        const meta = {
          id: initialMeta.id,
          name: proj?.name ?? initialMeta.name,
          width: proj?.width ?? initialMeta.width,
          height: proj?.height ?? initialMeta.height,
          background: initialMeta.background ?? "#e5e7eb",
          geometryFlipped: 0 as 0 | 1,
        };

        let folder = `${(proj?.name || initialMeta.name)}.ca`;
        let [floatingFiles, backgroundFiles] = await Promise.all([
          listFiles(projectId, `${folder}/Floating.ca/`),
          listFiles(projectId, `${folder}/Background.ca/`),
        ]);
        if ((floatingFiles.length + backgroundFiles.length) === 0) {
          const all = await listFiles(projectId);
          const anyMain = all.find(f => /\.ca\/(Floating|Background)\.ca\/main\.caml$/.test(f.path));
          if (anyMain) {
            const parts = anyMain.path.split('/');
            folder = parts[0];
            [floatingFiles, backgroundFiles] = [
              all.filter(f => f.path.startsWith(`${folder}/Floating.ca/`)),
              all.filter(f => f.path.startsWith(`${folder}/Background.ca/`)),
            ];
          }
        }

        const readDocFromFiles = async (files: Awaited<ReturnType<typeof listFiles>>): Promise<CADoc> => {
          const byPath = new Map(files.map((f) => [f.path, f]));
          const main = byPath.get(`${folder}/Floating.ca/main.caml`) || byPath.get(`${folder}/Background.ca/main.caml`);
          let layers: AnyLayer[] = [];
          let assets: Record<string, { filename: string; dataURL: string }> = {};
          let states: string[] = [...fixedStates];
          let stateOverrides: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>> = {};
          let stateTransitions: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }>; }> = [];
          if (main && main.type === 'text' && typeof main.data === 'string') {
            try {
              const { parseCAML, parseStates, parseStateOverrides, parseStateTransitions } = await import("@/lib/ca/caml");
              const root = parseCAML(main.data);
              if (root) {
                const rootLayer = root as any;
                layers = rootLayer?.type === 'group' && Array.isArray(rootLayer.children) ? rootLayer.children : [rootLayer];
                states = parseStates(main.data);
                stateOverrides = parseStateOverrides(main.data) as any;
                stateTransitions = parseStateTransitions(main.data) as any;
              }
            } catch {}
          }
          for (const f of files) {
            if (f.path.includes('/assets/')) {
              const filename = f.path.split('/assets/')[1];
              try {
                const buf = f.data as ArrayBuffer;
                const blob = new Blob([buf]);
                const dataURL = await new Promise<string>((resolve) => {
                  const r = new FileReader();
                  r.onload = () => resolve(String(r.result));
                  r.readAsDataURL(blob);
                });
              } catch {}
            }
          }
          return {
            layers,
            selectedId: null,
            assets,
            states: states.length ? states : [...fixedStates],
            activeState: 'Base State',
            stateOverrides,
            stateTransitions,
          };
        };

        const floatingDoc = await readDocFromFiles(floatingFiles);
        const backgroundDoc = await readDocFromFiles(backgroundFiles);

        const initial: ProjectDocument = {
          meta,
          activeCA: 'floating',
          docs: { background: backgroundDoc, floating: floatingDoc },
        };
        skipPersistRef.current = true;
        setDoc(initial);
      } catch {
        skipPersistRef.current = true;
        setDoc({
          meta: {
            id: initialMeta.id,
            name: initialMeta.name,
            width: initialMeta.width,
            height: initialMeta.height,
            background: initialMeta.background ?? "#e5e7eb",
            geometryFlipped: 0,
          },
          activeCA: 'floating',
          docs: {
            background: { layers: [], selectedId: null, assets: {}, states: ["Locked", "Unlock", "Sleep"], activeState: 'Base State', stateOverrides: {}, stateTransitions: [] },
            floating: { layers: [], selectedId: null, assets: {}, states: ["Locked", "Unlock", "Sleep"], activeState: 'Base State', stateOverrides: {}, stateTransitions: [] },
          },
        });
      }
    })();
  }, [doc, projectId, initialMeta.id, initialMeta.name, initialMeta.width, initialMeta.height, initialMeta.background]);

  const doSave = useCallback((snapshot?: ProjectDocument): Promise<void> => {
    const snap = snapshot ?? doc;
    if (!snap) return Promise.resolve();
    setSavingStatus('saving');
    const p = writeToIndexedDB(snap)
      .then(() => {
        setSavingStatus('saved');
        setLastSavedAt(Date.now());
      })
      .catch(() => {
      });
    lastSavePromiseRef.current = p;
    return p;
  }, [doc]);

  const flushPersist = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  const persist = useCallback(() => {
    if (!doc) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSavingStatus('saving');
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      doSave();
    }, 500);
  }, [doc, doSave]);

  useEffect(() => {
    if (!doc) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    persist();
  }, [doc, persist]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        flushPersist();
      }
    };
    const onPageHide = () => {
      flushPersist();
    };
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushPersist]);

  const writeToIndexedDB = useCallback(async (snapshot: ProjectDocument) => {
    try {
      const folder = `${snapshot.meta.name}.ca`;
      const caKeys: Array<'background' | 'floating'> = ['background', 'floating'];
      for (const key of caKeys) {
        const caFolder = key === 'floating' ? 'Floating.ca' : 'Background.ca';
        const caDoc = snapshot.docs[key];
        const root: GroupLayer = {
          id: snapshot.meta.id,
          name: snapshot.meta.name,
          type: 'group',
          position: { x: Math.round((snapshot.meta.width || 0) / 2), y: Math.round((snapshot.meta.height || 0) / 2) },
          size: { w: snapshot.meta.width || 0, h: snapshot.meta.height || 0 },
          backgroundColor: snapshot.meta.background,
          geometryFlipped: (snapshot.meta as any).geometryFlipped ?? 0,
          children: (caDoc.layers as AnyLayer[]) || [],
        } as GroupLayer;

        const caml = serializeCAML(
          root,
          {
            id: snapshot.meta.id,
            name: snapshot.meta.name,
            width: snapshot.meta.width,
            height: snapshot.meta.height,
            background: snapshot.meta.background,
            geometryFlipped: (snapshot.meta as any).geometryFlipped ?? 0,
          } as any,
          (caDoc as any).states,
          (caDoc as any).stateOverrides,
          (caDoc as any).stateTransitions,
        );
        await putTextFile(projectId, `${folder}/${caFolder}/main.caml`, caml);
        const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>main.caml</string>\n</dict>\n</plist>`;
        await putTextFile(projectId, `${folder}/${caFolder}/index.xml`, indexXml);
        const assetManifest = `<?xml version="1.0" encoding="UTF-8"?>\n\n<caml xmlns="http://www.apple.com/CoreAnimation/1.0">\n  <MicaAssetManifest>\n    <modules type="NSArray"/>\n  </MicaAssetManifest>\n</caml>`;
        await putTextFile(projectId, `${folder}/${caFolder}/assetManifest.caml`, assetManifest);

        const assets = caDoc.assets || {};
        for (const [layerId, info] of Object.entries(assets)) {
          try {
            const dataURL = info.dataURL;
            const blob = await dataURLToBlob(dataURL);
            await putBlobFile(projectId, `${folder}/${caFolder}/assets/${info.filename}`, blob);
          } catch {}
        }
      }
    } catch (e) {
    }
  }, [projectId]);

  async function dataURLToBlob(dataURL: string): Promise<Blob> {
    const [meta, data] = dataURL.split(',');
    const isBase64 = /;base64$/i.test(meta);
    const mimeMatch = meta.match(/^data:([^;]+)(;base64)?$/i);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    if (isBase64) {
      const byteString = atob(data);
      const ia = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      return new Blob([ia], { type: mime });
    } else {
      return new Blob([decodeURIComponent(data)], { type: mime });
    }
  }

  const selectLayer = useCallback((id: string | null) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const nextDocs = { ...prev.docs, [key]: { ...prev.docs[key], selectedId: id } };
      pushHistory(prev);
      return { ...prev, docs: nextDocs } as ProjectDocument;
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
        fontFamily: "SFProText-Regular",
        wrapped: 1,
      };
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const next = { ...cur, layers: [...cur.layers, layer], selectedId: layer.id };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
    });
  }, [addBase]);

  const addImageLayerFromBlob = useCallback(async (blob: Blob, filename?: string) => {
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const layer: ImageLayer = {
        ...addBase(filename || "Pasted Image"),
        type: "image",
        size: { w: 200, h: 120 },
        src: dataURL,
        fit: "fill",
      };
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const assets = { ...(cur.assets || {}) };
      assets[layer.id] = { filename: sanitizeFilename(filename || `pasted-${Date.now()}.png`), dataURL };
      const next = { ...cur, layers: [...cur.layers, layer], selectedId: layer.id, assets };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
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
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const assets = { ...(cur.assets || {}) };
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
      const next = { ...cur, assets, layers: updateRec(cur.layers) };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
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
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const next = { ...cur, layers: [...cur.layers, layer], selectedId: layer.id };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
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
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const assets = { ...(cur.assets || {}) };
      assets[layer.id] = { filename: sanitizeFilename(file.name) || `image-${Date.now()}.png`, dataURL };
      const next = { ...cur, layers: [...cur.layers, layer], selectedId: layer.id, assets };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
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
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const next = { ...cur, layers: [...cur.layers, layer], selectedId: layer.id };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
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

  const removeFromTree = useCallback((layers: AnyLayer[], id: string): { removed: AnyLayer | null; layers: AnyLayer[] } => {
    let removed: AnyLayer | null = null;
    const next: AnyLayer[] = [];
    for (const l of layers) {
      if (l.id === id) {
        removed = l;
        continue;
      }
      if (l.type === 'group') {
        const g = l as GroupLayer;
        const res = removeFromTree(g.children, id);
        if (res.removed) removed = res.removed;
        next.push({ ...g, children: res.layers } as AnyLayer);
      } else {
        next.push(l);
      }
    }
    return { removed, layers: next };
  }, []);

  const insertBeforeInTree = useCallback((layers: AnyLayer[], targetId: string, node: AnyLayer): { inserted: boolean; layers: AnyLayer[] } => {
    let inserted = false;
    const next: AnyLayer[] = [];
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      if (!inserted && l.id === targetId) {
        next.push(node);
        next.push(l);
        inserted = true;
      } else if (l.type === 'group') {
        const g = l as GroupLayer;
        const res = insertBeforeInTree(g.children, targetId, node);
        if (res.inserted) {
          inserted = true;
          next.push({ ...g, children: res.layers } as AnyLayer);
        } else {
          next.push(l);
        }
      } else {
        next.push(l);
      }
    }
    return { inserted, layers: next };
  }, []);

  const moveLayer = useCallback((sourceId: string, beforeId: string | null) => {
    if (!sourceId || sourceId === beforeId) return;
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const removedRes = removeFromTree(cur.layers, sourceId);
      const node = removedRes.removed;
      if (!node) return prev;
      let nextLayers: AnyLayer[] = removedRes.layers;
      if (beforeId) {
        const ins = insertBeforeInTree(nextLayers, beforeId, node);
        nextLayers = ins.layers;
        if (!ins.inserted) {
          nextLayers = [...nextLayers, node];
        }
      } else {
        nextLayers = [...nextLayers, node];
      }
      pushHistory(prev);
      const nextCur = { ...cur, layers: nextLayers } as CADoc;
      return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
    });
  }, [removeFromTree, insertBeforeInTree, pushHistory]);

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
      const key = prev.activeCA;
      const cur = prev.docs[key];
      if (cur.activeState && cur.activeState !== 'Base State') {
        const p: any = patch;
        const nextState = { ...(cur.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
        const list = [...(nextState[cur.activeState] || [])];
        const upd = (keyPath: 'position.x' | 'position.y' | 'opacity' | 'bounds.size.width' | 'bounds.size.height' | 'transform.rotation.z', value: number) => {
          const idx = list.findIndex((o) => o.targetId === id && o.keyPath === keyPath);
          if (idx >= 0) list[idx] = { ...list[idx], value };
          else list.push({ targetId: id, keyPath, value });
        };
        if (p.position && typeof p.position.x === 'number') upd('position.x', p.position.x);
        if (p.position && typeof p.position.y === 'number') upd('position.y', p.position.y);
        if (p.size && typeof p.size.w === 'number') upd('bounds.size.width', p.size.w);
        if (p.size && typeof p.size.h === 'number') upd('bounds.size.height', p.size.h);
        if (typeof p.rotation === 'number') upd('transform.rotation.z', p.rotation as number);
        if (typeof p.opacity === 'number') upd('opacity', p.opacity as number);
        nextState[cur.activeState] = list;
        pushHistory(prev);
        const nextCur = { ...cur, stateOverrides: nextState } as CADoc;
        return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
      }
      pushHistory(prev);
      const nextLayers = updateInTree(cur.layers, id, patch);
      const nextCur = { ...cur, layers: nextLayers };
      return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
    });
  }, [updateInTree]);

  const updateLayerTransient = useCallback((id: string, patch: Partial<AnyLayer>) => {
    skipPersistRef.current = true;
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      if (cur.activeState && cur.activeState !== 'Base State') {
        const p: any = patch;
        const nextState = { ...(cur.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
        const list = [...(nextState[cur.activeState] || [])];
        const upd = (keyPath: 'position.x' | 'position.y' | 'opacity' | 'bounds.size.width' | 'bounds.size.height' | 'transform.rotation.z', value: number) => {
          const idx = list.findIndex((o) => o.targetId === id && o.keyPath === keyPath);
          if (idx >= 0) list[idx] = { ...list[idx], value };
          else list.push({ targetId: id, keyPath, value });
        };
        if (p.position && typeof p.position.x === 'number') upd('position.x', p.position.x);
        if (p.position && typeof p.position.y === 'number') upd('position.y', p.position.y);
        if (p.size && typeof p.size.w === 'number') upd('bounds.size.width', p.size.w);
        if (p.size && typeof p.size.h === 'number') upd('bounds.size.height', p.size.h);
        if (typeof p.rotation === 'number') upd('transform.rotation.z', p.rotation as number);
        if (typeof p.opacity === 'number') upd('opacity', p.opacity as number);
        nextState[cur.activeState] = list;
        const nextCur = { ...cur, stateOverrides: nextState } as CADoc;
        return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
      }
      const nextLayers = updateInTree(cur.layers, id, patch);
      const nextCur = { ...cur, layers: nextLayers };
      return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
    });
  }, [updateInTree]);

  const deleteLayer = useCallback((id: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      pushHistory(prev);
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const nextLayers = deleteInTree(cur.layers, id);
      const nextSelected = cur.selectedId === id || (cur.selectedId ? !containsId(nextLayers, cur.selectedId) : false) ? null : cur.selectedId;
      const nextCur = { ...cur, layers: nextLayers, selectedId: nextSelected };
      return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
    });
  }, [deleteInTree, containsId]);

  const copySelectedLayer = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      const cur = prev.docs[prev.activeCA];
      const sel = findById(cur.layers, cur.selectedId ?? null);
      if (!sel) return prev;
      const images: Record<string, { filename: string; dataURL: string }> = {};
      const walk = (l: AnyLayer) => {
        if (l.type === 'image') {
          const a = (cur.assets || {})[l.id];
          if (a) images[l.id] = { ...a };
        } else if (l.type === 'group') {
          (l as GroupLayer).children.forEach(walk);
        }
      };
      walk(sel);
      clipboardRef.current = { type: 'layers', data: [JSON.parse(JSON.stringify(sel)) as AnyLayer], assets: images };
      try {
        navigator.clipboard?.writeText?.(JSON.stringify({ __caplay__: true, type: 'layers', data: clipboardRef.current.data, assets: clipboardRef.current.assets }));
      } catch {}
      return prev;
    });
  }, [findById]);

  const pasteFromClipboard = useCallback((payload?: any) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const src = payload && payload.__caplay__ ? payload : clipboardRef.current;
      if (!src || src.type !== 'layers') return prev;
      const cloned: AnyLayer[] = (src.data || []).map(cloneLayerDeep);
      const idMap = new Map<string, string>();
      const collectMap = (orig: AnyLayer[], copies: AnyLayer[]) => {
        for (let i = 0; i < orig.length; i++) {
          const o = orig[i];
          const c = copies[i];
          if (o && c) {
            idMap.set((o as any).id, (c as any).id);
            if (o.type === 'group' && c.type === 'group') {
              collectMap((o as GroupLayer).children, (c as GroupLayer).children);
            }
          }
        }
      };
      collectMap(src.data as AnyLayer[], cloned);
      const assets = { ...(cur.assets || {}) };
      const srcAssets = ((src as any).assets || {}) as Record<string, { filename: string; dataURL: string }>;
      for (const [oldId, asset] of Object.entries(srcAssets) as Array<[string, { filename: string; dataURL: string }]>) {
        const newId = idMap.get(oldId);
        if (newId) assets[newId] = { filename: asset.filename, dataURL: asset.dataURL };
      }
      pushHistory(prev);
      const next = { ...cur, layers: [...cur.layers, ...cloned], selectedId: cloned[cloned.length - 1]?.id ?? cur.selectedId, assets };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
    });
  }, [cloneLayerDeep, pushHistory]);

  const duplicateLayer = useCallback((id?: string) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const targetId = id || cur.selectedId || null;
      if (!targetId) return prev;
      const sel = findById(cur.layers, targetId);
      if (!sel) return prev;
      const images: Record<string, { filename: string; dataURL: string }> = {};
      const walk = (l: AnyLayer) => {
        if (l.type === 'image') {
          const a = (cur.assets || {})[l.id];
          if (a) images[l.id] = { ...a };
        } else if (l.type === 'group') {
          (l as GroupLayer).children.forEach(walk);
        }
      };
      walk(sel);
      const cloned = cloneLayerDeep(sel);
      const assets = { ...(cur.assets || {}) };
      const idMap = new Map<string, string>();
      const buildMap = (o: AnyLayer, c: AnyLayer) => {
        idMap.set((o as any).id, (c as any).id);
        if (o.type === 'group' && c.type === 'group') {
          const oc = (o as GroupLayer).children;
          const cc = (c as GroupLayer).children;
          for (let i = 0; i < oc.length; i++) buildMap(oc[i], cc[i]);
        }
      };
      buildMap(sel, cloned);
      for (const [oldId, asset] of Object.entries(images)) {
        const newId = idMap.get(oldId);
        if (newId) assets[newId] = { filename: asset.filename, dataURL: asset.dataURL };
      }
      pushHistory(prev);
      const next = { ...cur, layers: [...cur.layers, cloned], selectedId: (cloned as any).id, assets };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
    });
  }, [findById, cloneLayerDeep]);

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

  const addState = useCallback((_name?: string) => {
    return;
  }, []);

  const renameState = useCallback((_oldName: string, _newName: string) => {
    return;
  }, []);

  const deleteState = useCallback((_name: string) => {
    return;
  }, []);

  const setActiveState = useCallback((state: 'Base State' | 'Locked' | 'Unlock' | 'Sleep') => {
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const next = { ...cur, activeState: state };
      return { ...prev, docs: { ...prev.docs, [key]: next } } as ProjectDocument;
    });
  }, []);

  const updateStateOverride = useCallback((targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const state = cur.activeState && cur.activeState !== 'Base State' ? cur.activeState : null;
      if (!state) return prev;
      const next = { ...(cur.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
      const list = [...(next[state] || [])];
      const idx = list.findIndex((o) => o.targetId === targetId && o.keyPath === keyPath);
      if (idx >= 0) list[idx] = { ...list[idx], value };
      else list.push({ targetId, keyPath, value });
      next[state] = list;
      pushHistory(prev);
      const nextCur = { ...cur, stateOverrides: next } as CADoc;
      return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
    });
  }, [pushHistory]);

  const updateStateOverrideTransient = useCallback((targetId: string, keyPath: 'position.x' | 'position.y' | 'opacity', value: number) => {
    skipPersistRef.current = true;
    setDoc((prev) => {
      if (!prev) return prev;
      const key = prev.activeCA;
      const cur = prev.docs[key];
      const state = cur.activeState && cur.activeState !== 'Base State' ? cur.activeState : null;
      if (!state) return prev;
      const next = { ...(cur.stateOverrides || {}) } as Record<string, Array<{ targetId: string; keyPath: string; value: number | string }>>;
      const list = [...(next[state] || [])];
      const idx = list.findIndex((o) => o.targetId === targetId && o.keyPath === keyPath);
      if (idx >= 0) list[idx] = { ...list[idx], value };
      else list.push({ targetId, keyPath, value });
      next[state] = list;
      const nextCur = { ...cur, stateOverrides: next } as CADoc;
      return { ...prev, docs: { ...prev.docs, [key]: nextCur } } as ProjectDocument;
    });
  }, []);

  const value = useMemo<EditorContextValue>(() => ({
    doc,
    setDoc,
    activeCA: doc?.activeCA ?? 'floating',
    setActiveCA: (v) => setDoc((prev) => (prev ? { ...prev, activeCA: v } : prev)),
    savingStatus,
    lastSavedAt,
    flushPersist,
    addTextLayer,
    addImageLayer,
    addImageLayerFromFile,
    addImageLayerFromBlob,
    replaceImageForLayer,
    addShapeLayer,
    updateLayer,
    updateLayerTransient,
    selectLayer,
    deleteLayer,
    copySelectedLayer,
    pasteFromClipboard,
    duplicateLayer,
    moveLayer,
    persist,
    undo,
    redo,
    addState,
    renameState,
    deleteState,
    setActiveState,
    updateStateOverride,
    updateStateOverrideTransient,
    isAnimationPlaying,
    setIsAnimationPlaying,
    animatedLayers,
    setAnimatedLayers,
  }), [
    doc,
    savingStatus,
    lastSavedAt,
    flushPersist,
    addTextLayer,
    addImageLayer,
    addImageLayerFromFile,
    addImageLayerFromBlob,
    replaceImageForLayer,
    addShapeLayer,
    updateLayer,
    updateLayerTransient,
    selectLayer,
    deleteLayer,
    copySelectedLayer,
    pasteFromClipboard,
    duplicateLayer,
    moveLayer,
    persist,
    undo,
    redo,
    addState,
    renameState,
    deleteState,
    setActiveState,
    updateStateOverride,
    updateStateOverrideTransient,
    isAnimationPlaying,
    setIsAnimationPlaying,
    animatedLayers,
    setAnimatedLayers,
  ]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
