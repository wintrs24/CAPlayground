import type { AnyLayer, GroupLayer } from "@/lib/ca/types";

export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function findById(layers: AnyLayer[], id: string | null | undefined): AnyLayer | undefined {
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
}

export function cloneLayerDeep(layer: AnyLayer): AnyLayer {
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
}

export function updateInTree(layers: AnyLayer[], id: string, patch: Partial<AnyLayer>): AnyLayer[] {
  return layers.map((l) => {
    if (l.id === id) return { ...l, ...patch } as AnyLayer;
    if (l.type === "group") {
      const g = l as GroupLayer;
      return { ...g, children: updateInTree(g.children, id, patch) } as AnyLayer;
    }
    return l;
  });
}

export function removeFromTree(layers: AnyLayer[], id: string): { removed: AnyLayer | null; layers: AnyLayer[] } {
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
}

export function insertBeforeInTree(layers: AnyLayer[], targetId: string, node: AnyLayer): { inserted: boolean; layers: AnyLayer[] } {
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
}

export function deleteInTree(layers: AnyLayer[], id: string): AnyLayer[] {
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
}

export function containsId(layers: AnyLayer[], id: string): boolean {
  for (const l of layers) {
    if (l.id === id) return true;
    if (l.type === "group" && containsId((l as GroupLayer).children, id)) return true;
  }
  return false;
}
