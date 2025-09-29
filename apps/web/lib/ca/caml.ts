import { AnyLayer, CAProject, GroupLayer, TextLayer, CAStateOverrides, CAStateTransitions } from './types';

const CAML_NS = 'http://www.apple.com/CoreAnimation/1.0';

function attr(node: Element, name: string): string | undefined {
  const v = node.getAttribute(name);
  return v === null ? undefined : v;
}

export function parseStateTransitions(xml: string): CAStateTransitions {
  const out: CAStateTransitions = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return out;
    const transEl = caml.getElementsByTagNameNS(CAML_NS, 'stateTransitions')[0];
    if (!transEl) return out;
    const transNodes = Array.from(transEl.getElementsByTagNameNS(CAML_NS, 'LKStateTransition'));
    for (const tn of transNodes) {
      const fromState = tn.getAttribute('fromState') || '';
      const toState = tn.getAttribute('toState') || '';
      const elementsEl = tn.getElementsByTagNameNS(CAML_NS, 'elements')[0];
      const elements: any[] = [];
      if (elementsEl) {
        const elNodes = Array.from(elementsEl.getElementsByTagNameNS(CAML_NS, 'LKStateTransitionElement'));
        for (const en of elNodes) {
          const targetId = en.getAttribute('targetId') || '';
          const keyPath = en.getAttribute('key') || '';
          let animation: any = undefined;
          const animEl = en.getElementsByTagNameNS(CAML_NS, 'animation')[0];
          if (animEl) {
            const type = animEl.getAttribute('type') || '';
            animation = {
              type,
              damping: Number(animEl.getAttribute('damping') || '') || undefined,
              mass: Number(animEl.getAttribute('mass') || '') || undefined,
              stiffness: Number(animEl.getAttribute('stiffness') || '') || undefined,
              velocity: Number(animEl.getAttribute('velocity') || '') || undefined,
              duration: Number(animEl.getAttribute('duration') || '') || undefined,
              fillMode: animEl.getAttribute('fillMode') || undefined,
              keyPath: animEl.getAttribute('keyPath') || undefined,
            };
          }
          if (targetId && keyPath) elements.push({ targetId, keyPath, animation });
        }
      }
      out.push({ fromState, toState, elements });
    }
  } catch {
  }
  return out;
}

export function parseStateOverrides(xml: string): CAStateOverrides {
  const result: CAStateOverrides = {};
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return result;
    const statesEl = caml.getElementsByTagNameNS(CAML_NS, 'states')[0];
    if (!statesEl) return result;
    const stateNodes = Array.from(statesEl.getElementsByTagNameNS(CAML_NS, 'LKState'));
    for (const stateNode of stateNodes) {
      const name = stateNode.getAttribute('name') || '';
      const elements = stateNode.getElementsByTagNameNS(CAML_NS, 'elements')[0];
      const arr: { targetId: string; keyPath: string; value: string | number }[] = [];
      if (elements) {
        const setNodes = Array.from(elements.getElementsByTagNameNS(CAML_NS, 'LKStateSetValue'));
        for (const sn of setNodes) {
          const targetId = sn.getAttribute('targetId') || '';
          const keyPath = sn.getAttribute('keyPath') || '';
          let val: string | number = '';
          const valueNodes = sn.getElementsByTagNameNS(CAML_NS, 'value');
          if (valueNodes && valueNodes[0]) {
            const type = valueNodes[0].getAttribute('type') || '';
            const vAttr = valueNodes[0].getAttribute('value') || '';
            if (/^(integer|float|number)$/i.test(type)) {
              const n = Number(vAttr);
              val = Number.isFinite(n) ? n : vAttr;
            } else {
              val = vAttr;
            }
          }
          if (typeof val === 'number') {
            const kp = keyPath || '';
            if (kp === 'transform.rotation.z' || kp === 'transform.rotation.x' || kp === 'transform.rotation.y') {
              val = (val * 180) / Math.PI;
            }
          }
          if (targetId && keyPath) arr.push({ targetId, keyPath, value: val });
        }
      }
      result[name] = arr;
    }
  } catch {
    // ignore
  }
  return result;
}

function parseNumberList(input?: string): number[] {
  if (!input) return [];
  return input
    .split(/[;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
}

function floatsToHexColor(rgb: string | undefined): string | undefined {
  if (!rgb) return undefined;
  const parts = rgb.split(/[\s]+/).map((s) => Number(s));
  if (parts.length < 3) return undefined;
  const to255 = (f: number) => {
    const n = Math.max(0, Math.min(1, Number.isFinite(f) ? f : 0));
    return Math.round(n * 255);
  };
  const [r, g, b] = [to255(parts[0]), to255(parts[1]), to255(parts[2])];
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToForegroundColor(value?: string): string | undefined {
  if (!value) return undefined;
  const m = value.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) return undefined;
  const hex = m[1].length === 6 ? m[1] : m[1].slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const toUnit = (n: number) => (n / 255);
  const fmt = (n: number) => {
    const s = (Math.round(n * 10000) / 10000).toString();
    return s;
  };
  return `${fmt(toUnit(r))} ${fmt(toUnit(g))} ${fmt(toUnit(b))}`;
}

export function parseCAML(xml: string): AnyLayer | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
  if (!caml) return null;
  const root = caml.getElementsByTagNameNS(CAML_NS, 'CALayer')[0];
  if (!root) return null;
  return parseCALayer(root);
}

export function parseStates(xml: string): string[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
    if (!caml) return [];
    const statesEl = caml.getElementsByTagNameNS(CAML_NS, 'states')[0];
    if (!statesEl) return [];
    const arr: string[] = [];
    const nodes = Array.from(statesEl.getElementsByTagNameNS(CAML_NS, 'LKState'));
    for (const n of nodes) {
      const name = n.getAttribute('name');
      if (name && name.trim()) arr.push(name.trim());
    }
    return arr;
  } catch {
    return [];
  }
}

function parseCATextLayer(el: Element): AnyLayer {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Text Layer';
  const bounds = parseNumberList(attr(el, 'bounds'));
  const position = parseNumberList(attr(el, 'position'));
  const anchorPt = parseNumberList(attr(el, 'anchorPoint'));
  const geometryFlippedAttr = attr(el, 'geometryFlipped');
  const rotationZ = attr(el, 'transform.rotation.z');
  const rotationX = attr(el, 'transform.rotation.x');
  const rotationY = attr(el, 'transform.rotation.y');
  const fontSizeAttr = attr(el, 'fontSize');
  const alignmentMode = attr(el, 'alignmentMode') as TextLayer['align'] | undefined;
  const wrappedAttr = attr(el, 'wrapped');
  let fontFamily: string | undefined;
  let textValue: string = '';
  const fontEl = el.getElementsByTagNameNS(CAML_NS, 'font')[0] as Element | undefined;
  if (fontEl) {
    fontFamily = fontEl.getAttribute('value') || undefined;
  }
  const stringEl = el.getElementsByTagNameNS(CAML_NS, 'string')[0] as Element | undefined;
  if (stringEl) {
    textValue = stringEl.getAttribute('value') || '';
  }
  const colorHex = floatsToHexColor(attr(el, 'foregroundColor'));

  const base = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    rotation: rotationZ ? ((Number(rotationZ) * 180) / Math.PI) : undefined,
    rotationX: rotationX ? ((Number(rotationX) * 180) / Math.PI) : undefined,
    rotationY: rotationY ? ((Number(rotationY) * 180) / Math.PI) : undefined,
    anchorPoint: (anchorPt.length === 2 && (anchorPt[0] !== 0.5 || anchorPt[1] !== 0.5)) ? { x: anchorPt[0], y: anchorPt[1] } : undefined,
    geometryFlipped: typeof geometryFlippedAttr !== 'undefined' ? ((geometryFlippedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  } as const;

  const layer: AnyLayer = {
    ...base,
    type: 'text',
    text: textValue || '',
    fontFamily,
    fontSize: fontSizeAttr ? Number(fontSizeAttr) : undefined,
    color: colorHex,
    align: alignmentMode,
    wrapped: typeof wrappedAttr !== 'undefined' ? ((wrappedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  } as AnyLayer;
  return layer;
}

function parseCALayer(el: Element): AnyLayer {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Layer';
  const bounds = parseNumberList(attr(el, 'bounds')); // x y w h
  const position = parseNumberList(attr(el, 'position')); // x y
  const anchorPt = parseNumberList(attr(el, 'anchorPoint')); // ax ay in 0..1
  const geometryFlippedAttr = attr(el, 'geometryFlipped');
  const rotZAttr = attr(el, 'transform.rotation.z');
  const rotXAttr = attr(el, 'transform.rotation.x');
  const rotYAttr = attr(el, 'transform.rotation.y');
  const opacity = attr(el, 'opacity') ? Number(attr(el, 'opacity')) : undefined;
  const transformAttr = attr(el, 'transform');
  const backgroundColor = attr(el, 'backgroundColor');
  const cornerRadius = attr(el, 'cornerRadius') ? Number(attr(el, 'cornerRadius')) : undefined;
  const borderColor = attr(el, 'borderColor') || undefined;
  const borderWidth = attr(el, 'borderWidth') ? Number(attr(el, 'borderWidth')) : undefined;
  const textValue = attr(el, 'text');
  const fontFamily = attr(el, 'fontFamily');
  const fontSizeAttr = attr(el, 'fontSize');
  const fontSize = fontSizeAttr ? Number(fontSizeAttr) : undefined;
  const color = attr(el, 'color');
  const align = attr(el, 'align') as TextLayer['align'] | undefined;

  let imageSrc: string | undefined;
  const contents = el.getElementsByTagNameNS(CAML_NS, 'contents')[0]; //was supposed to be contents :P thats why images wouldn't render in mica 
  if (contents) {
    const images = contents.getElementsByTagNameNS(CAML_NS, 'CGImage');
    if (images && images[0]) {
      imageSrc = attr(images[0], 'src');
    }
  }

  let tRotZ: number | undefined;
  let tRotX: number | undefined;
  let tRotY: number | undefined;
  if (transformAttr && /rotate\(/i.test(transformAttr)) {
    try {
      const rx = /rotate\(([^)]+)\)/gi;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(transformAttr)) !== null) {
        const inside = m[1].trim();
        const parts = inside.split(/\s*,\s*/);
        const angleStr = parts[0].trim();
        const angle = parseFloat(angleStr.replace(/deg/i, '').trim());
        const deg = Number.isFinite(angle) ? angle : 0;
        if (parts.length >= 4) {
          const ax = parseFloat(parts[1]);
          const ay = parseFloat(parts[2]);
          const az = parseFloat(parts[3]);
          if (Math.abs(ax - 1) < 1e-6 && Math.abs(ay) < 1e-6 && Math.abs(az) < 1e-6) {
            tRotX = deg;
          } else if (Math.abs(ay - 1) < 1e-6 && Math.abs(ax) < 1e-6 && Math.abs(az) < 1e-6) {
            tRotY = deg;
          } else if (Math.abs(az - 1) < 1e-6 && Math.abs(ax) < 1e-6 && Math.abs(ay) < 1e-6) {
            tRotZ = deg;
          }
        } else {
          tRotZ = deg;
        }
      }
    } catch {}
  }

  const base = {
    id,
    name,
    position: { x: position[0] ?? 0, y: position[1] ?? 0 },
    size: { w: bounds[2] ?? 0, h: bounds[3] ?? 0 },
    opacity,
    backgroundColor,
    cornerRadius,
    borderColor,
    borderWidth,
    rotation: (rotZAttr ? ((Number(rotZAttr) * 180) / Math.PI) : undefined) ?? tRotZ,
    rotationX: (rotXAttr ? ((Number(rotXAttr) * 180) / Math.PI) : undefined) ?? tRotX,
    rotationY: (rotYAttr ? ((Number(rotYAttr) * 180) / Math.PI) : undefined) ?? tRotY,
    anchorPoint: (anchorPt.length === 2 && (anchorPt[0] !== 0.5 || anchorPt[1] !== 0.5)) ? { x: anchorPt[0], y: anchorPt[1] } : undefined,
    geometryFlipped: typeof geometryFlippedAttr !== 'undefined' ? ((geometryFlippedAttr === '1' ? 1 : 0) as 0 | 1) : undefined,
  } as const;

  const sublayersEl = el.getElementsByTagNameNS(CAML_NS, 'sublayers')[0];
  const sublayerNodesRaw = sublayersEl ? Array.from(sublayersEl.children).filter((n) => n.namespaceURI === CAML_NS) as Element[] : [];
  const sublayerNodes = sublayerNodesRaw;

  if (imageSrc && sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'image',
      src: imageSrc,
    } as AnyLayer;
  }

  if (textValue !== undefined && sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'text',
      text: textValue || '',
      fontFamily: fontFamily || undefined,
      fontSize,
      color: color || undefined,
      align: align || undefined,
    } as AnyLayer;
  }

  if (sublayersEl) {
    const children: AnyLayer[] = [];
    const kids = Array.from(sublayersEl.children).filter((n) => (n as any).namespaceURI === CAML_NS) as Element[];
    for (const n of kids) {
      if (n.localName === 'CALayer') children.push(parseCALayer(n));
      else if (n.localName === 'CATextLayer') children.push(parseCATextLayer(n));
    }
    if (children.length > 0) {
      const group: GroupLayer = {
        ...base,
        type: 'group',
        children,
      };
      return group;
    }
  }

  if (sublayerNodes.length === 0) {
    return {
      ...base,
      type: 'shape',
      shape: 'rect',
      fill: (base as any).backgroundColor,
      radius: (base as any).cornerRadius,
      borderColor: (base as any).borderColor,
      borderWidth: (base as any).borderWidth,
    } as AnyLayer;
  }
  // Fallback
  const children = sublayerNodes.map((n) => parseCALayer(n));
  const group: GroupLayer = { ...base, type: 'group', children };
  return group;
}

export function serializeCAML(
  root: AnyLayer,
  project?: CAProject,
  stateNamesInput?: string[],
  stateOverridesInput?: Record<string, Array<{ targetId: string; keyPath: string; value: string | number }>>,
  stateTransitionsInput?: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }>; }>
): string {
  const doc = document.implementation.createDocument(CAML_NS, 'caml', null);
  const caml = doc.documentElement;
  const rootEl = serializeLayer(doc, root, project);
  
  const scriptComponents = doc.createElementNS(CAML_NS, 'scriptComponents');
  const statesEl = doc.createElementNS(CAML_NS, 'states');
  const layerIndex: Record<string, AnyLayer> = {};
  const indexWalk = (l: AnyLayer) => {
    layerIndex[l.id] = l as AnyLayer;
    if ((l as any).type === 'group' && Array.isArray((l as any).children)) {
      ((l as any).children as AnyLayer[]).forEach(indexWalk);
    }
  };
  indexWalk(root);
  
  const filtered = (stateNamesInput || []).filter((n) => !/^base(\s*state)?$/i.test(n.trim()));
  const stateNames = (filtered.length ? filtered : ['Locked', 'Unlock', 'Sleep']);
  stateNames.forEach(stateName => {
    const state = doc.createElementNS(CAML_NS, 'LKState');
    state.setAttribute('name', stateName);
    const elements = doc.createElementNS(CAML_NS, 'elements');

  // state animations wont work unless every state overrides exists in every state. its really stupid and this next section of code should fix that problem when exporting from caplayground
  // - retronbv

  stateNames.forEach((stateName) => {
    let ovs = (stateOverridesInput || {})[stateName] || [];
    for (let override of ovs) {
      let defaultVal: any;
      switch (override.keyPath) {
        case "position.x":
          defaultVal = layerIndex[override.targetId].position.x;
          break;
        case "position.y":
          defaultVal = layerIndex[override.targetId].position.x;
          break;
        case "bounds.size.width":
          defaultVal = layerIndex[override.targetId].size.w;
          break;
        case "bounds.size.height":
          defaultVal = layerIndex[override.targetId].size.h;
          break;
        case "transform.rotation.z":
          defaultVal = layerIndex[override.targetId].rotation;
          break;
        case "opacity":
          defaultVal = layerIndex[override.targetId].opacity;
          break;
      }
      stateNames.forEach((checkState) => {
        let checkOverrides = (stateOverridesInput || {})[checkState] || [];
        let filtered = checkOverrides.filter(
          (o) =>
            o.targetId == override.targetId && o.keyPath == override.keyPath
        );
        if (filtered.length == 0) {
          checkOverrides.push({
            targetId: override.targetId,
            keyPath: override.keyPath,
            value: defaultVal,
          });
        }
        (stateOverridesInput || {})[checkState] = checkOverrides;
      });
    }
  });

    const ovs = (stateOverridesInput || {})[stateName] || [];
    for (const ov of ovs) {
      const el = doc.createElementNS(CAML_NS, 'LKStateSetValue');
      el.setAttribute('targetId', ov.targetId);
      el.setAttribute('keyPath', ov.keyPath);
      const vEl = doc.createElementNS(CAML_NS, 'value');
      if (typeof ov.value === 'number') {
        let outVal = ov.value;
        if (ov.keyPath === 'transform.rotation.z') {
          outVal = (ov.value as number) * Math.PI / 180;
        }
        const isInt = Number.isInteger(outVal);
        vEl.setAttribute("type", isInt ? "integer" : "real");
        vEl.setAttribute('value', String(outVal));
      } else {
        vEl.setAttribute('type', 'string');
        vEl.setAttribute('value', String(ov.value));
      }
      el.appendChild(vEl);
      elements.appendChild(el);
    }
    state.appendChild(elements);
    statesEl.appendChild(state);
  });

  const stateTransitions = doc.createElementNS(CAML_NS, 'stateTransitions');
  const transitionsToWrite = (stateTransitionsInput && stateTransitionsInput.length
    ? stateTransitionsInput
    : [
        { fromState: '*', toState: 'Unlock', elements: [] },
        { fromState: 'Unlock', toState: '*', elements: [] },
        { fromState: '*', toState: 'Locked', elements: [] },
        { fromState: 'Locked', toState: '*', elements: [] },
        { fromState: '*', toState: 'Sleep', elements: [] },
        { fromState: 'Sleep', toState: '*', elements: [] },
      ]);

  transitionsToWrite.forEach((t) => {
    const transition = doc.createElementNS(CAML_NS, 'LKStateTransition');
    transition.setAttribute('fromState', t.fromState);
    transition.setAttribute('toState', t.toState);
    const elements = doc.createElementNS(CAML_NS, 'elements');
    for (const elSpec of (t.elements || [])) {
      const el = doc.createElementNS(CAML_NS, 'LKStateTransitionElement');
      el.setAttribute('targetId', elSpec.targetId);
      el.setAttribute('keyPath', elSpec.keyPath);
      if (elSpec.animation) {
        const a = doc.createElementNS(CAML_NS, 'animation');
        if (elSpec.animation.type) a.setAttribute('type', String(elSpec.animation.type));
        if (typeof elSpec.animation.damping === 'number') a.setAttribute('damping', String(elSpec.animation.damping));
        if (typeof elSpec.animation.mass === 'number') a.setAttribute('mass', String(elSpec.animation.mass));
        if (typeof elSpec.animation.stiffness === 'number') a.setAttribute('stiffness', String(elSpec.animation.stiffness));
        if (typeof elSpec.animation.velocity === 'number') a.setAttribute('velocity', String(elSpec.animation.velocity));
        if (typeof elSpec.animation.duration === 'number') a.setAttribute('duration', String(elSpec.animation.duration));
        if (elSpec.animation.fillMode) a.setAttribute('fillMode', String(elSpec.animation.fillMode));
        if (elSpec.animation.keyPath) a.setAttribute('keyPath', String(elSpec.animation.keyPath));
        el.appendChild(a);
      }
      elements.appendChild(el);
    }
    transition.appendChild(elements);
    stateTransitions.appendChild(transition);
  });

  // Append all elements
  rootEl.appendChild(scriptComponents);
  rootEl.appendChild(statesEl);
  rootEl.appendChild(stateTransitions);
  caml.appendChild(rootEl);

  const xml = new XMLSerializer().serializeToString(doc);
  return '<?xml version="1.0" encoding="UTF-8"?>' + xml; //added this or else mica couldnt open the caml
}

function setAttr(el: Element, name: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') return;
  el.setAttribute(name, String(value));
}

function serializeLayer(doc: XMLDocument, layer: AnyLayer, project?: CAProject): Element {
  const isText = layer.type === 'text';
  const el = doc.createElementNS(CAML_NS, isText ? 'CATextLayer' : 'CALayer');
  setAttr(el, 'id', layer.id);
  setAttr(el, 'name', layer.name);
  setAttr(el, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(el, 'position', `${Math.round(layer.position.x)} ${Math.round(layer.position.y)}`);
  const ax = (layer as any).anchorPoint?.x;
  const ay = (layer as any).anchorPoint?.y;
  if (typeof ax === 'number' && typeof ay === 'number') {
    if (!(Math.abs(ax - 0.5) < 1e-6 && Math.abs(ay - 0.5) < 1e-6)) {
      setAttr(el, 'anchorPoint', `${ax} ${ay}`);
    }
  }
  const gf = (layer as any).geometryFlipped;
  if (gf === 0 || gf === 1) setAttr(el, 'geometryFlipped', String(gf));
  setAttr(el, 'opacity', layer.opacity ?? undefined);
  const rotZ = (layer as any).rotation;
  const rotX = (layer as any).rotationX;
  const rotY = (layer as any).rotationY;
  if (typeof rotZ === 'number' && Number.isFinite(rotZ)) {
    setAttr(el, 'transform.rotation.z', (rotZ * Math.PI) / 180);
  }
  if (typeof rotX === 'number' && Number.isFinite(rotX)) {
    setAttr(el, 'transform.rotation.x', (rotX * Math.PI) / 180);
  }
  if (typeof rotY === 'number' && Number.isFinite(rotY)) {
    setAttr(el, 'transform.rotation.y', (rotY * Math.PI) / 180);
  }
  const parts: string[] = [];
  if (typeof rotZ === 'number' && Number.isFinite(rotZ)) parts.push(`rotate(${rotZ}deg)`);
  if (typeof rotY === 'number' && Number.isFinite(rotY)) parts.push(`rotate(${rotY}deg, 0, 1, 0)`);
  if (typeof rotX === 'number' && Number.isFinite(rotX)) parts.push(`rotate(${rotX}deg, 1, 0, 0)`);
  if (parts.length) setAttr(el, 'transform', parts.join(' '));
  if (layer.type === 'shape') {
    setAttr(el, 'backgroundColor', (layer as any).fill || '#ffffffff'); //fixed shape fill 🤯
  }
  setAttr(el, 'cornerRadius', layer.cornerRadius);
  setAttr(el, 'borderColor', layer.borderColor);
  setAttr(el, 'borderWidth', layer.borderWidth);
  setAttr(el, 'allowsEdgeAntialiasing', '1');
  setAttr(el, 'allowsGroupOpacity', '1');
  setAttr(el, 'contentsFormat', 'RGBA8');
  setAttr(el, 'cornerCurve', 'circular');

  if (layer.type === 'image') {
    const contents = doc.createElementNS(CAML_NS, 'contents');
    const cg = doc.createElementNS(CAML_NS, 'CGImage');
    setAttr(cg, 'src', layer.src);
    contents.appendChild(cg);
    el.appendChild(contents);
  }

  if (layer.type === 'text') {
    const fg = hexToForegroundColor((layer as TextLayer).color || '#000000');
    setAttr(el, 'foregroundColor', fg);
    // font size
    setAttr(el, 'fontSize', (layer as TextLayer).fontSize ?? undefined);
    // alignment
    const align = (layer as TextLayer).align || 'left';
    const alignmentMode = align === 'justified' ? 'justified' : align;
    setAttr(el, 'alignmentMode', alignmentMode);
    // wrapping
    const wrapped = (layer as TextLayer).wrapped ?? 1;
    setAttr(el, 'wrapped', wrapped);
    setAttr(el, 'resizingMode', 'auto');
    setAttr(el, 'allowsEdgeAntialiasing', '1');
    setAttr(el, 'allowsGroupOpacity', '1');
    setAttr(el, 'contentsFormat', 'AutomaticAppKit');
    setAttr(el, 'cornerCurve', 'circular');
    const font = doc.createElementNS(CAML_NS, 'font');
    font.setAttribute('type', 'string');
    font.setAttribute('value', (layer as TextLayer).fontFamily || 'SFProText-Regular');
    el.appendChild(font);
    const str = doc.createElementNS(CAML_NS, 'string');
    str.setAttribute('type', 'string');
    str.setAttribute('value', (layer as TextLayer).text || '');
    el.appendChild(str);
  }

  if (layer.type === 'group') {
    const sublayers = doc.createElementNS(CAML_NS, 'sublayers');
    const children = (layer as GroupLayer).children || [];
    for (const child of children) {
      sublayers.appendChild(serializeLayer(doc, child, project));
    }
    if (children.length) el.appendChild(sublayers);
  }

  // Animations (position, position.x, position.y, transform.rotation.x, transform.rotation.y, transform.rotation.z)
  const anim = (layer as any).animations as
    | { enabled?: boolean; keyPath?: 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z'; autoreverses?: 0 | 1; values?: Array<{ x: number; y: number } | number>; durationSeconds?: number }
    | undefined;
  if (anim?.enabled && Array.isArray(anim.values) && anim.values.length > 0) {
    const keyPath = (anim.keyPath ?? 'position') as 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
    const animationsEl = doc.createElementNS(CAML_NS, 'animations');
    const a = doc.createElementNS(CAML_NS, 'animation');
    a.setAttribute('type', 'CAKeyframeAnimation');
    a.setAttribute('keyPath', keyPath);
    a.setAttribute('autoreverses', String((anim.autoreverses ?? 0) as number));
    a.setAttribute('beginTime', '1e-100');
    const providedDur = Number((anim as any).durationSeconds);
    const duration = Number.isFinite(providedDur) && providedDur > 0
      ? providedDur
      : Math.max(1, (anim.values?.length || 1) - 1);
    a.setAttribute('duration', String(duration));
    a.setAttribute('removedOnCompletion', '0');
    const infinite = Number((anim as any).infinite ?? 1) === 1;
    const providedRepeat = Number((anim as any).repeatDurationSeconds);
    const repeatDuration = Number.isFinite(providedRepeat) && providedRepeat > 0 ? providedRepeat : duration;
    if (infinite) {
      a.setAttribute('repeatCount', 'inf');
      a.setAttribute('repeatDuration', 'inf');
    } else {
      a.setAttribute('repeatDuration', String(repeatDuration));
    }
    a.setAttribute('calculationMode', 'linear');
    const valuesEl = doc.createElementNS(CAML_NS, 'values');
    if (keyPath === 'position') {
      for (const ptRaw of anim.values as Array<any>) {
        const pt = ptRaw || {};
        const p = doc.createElementNS(CAML_NS, 'CGPoint');
        const cx = Math.round(Number(pt?.x ?? 0));
        const cy = Math.round(Number(pt?.y ?? 0));
        p.setAttribute('value', `${cx} ${cy}`);
        valuesEl.appendChild(p);
      }
    } else if (keyPath === 'position.x') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cx = Math.round(Number.isFinite(n) ? n : 0);
        const numEl = doc.createElementNS(CAML_NS, 'NSNumber');
        numEl.setAttribute('value', String(cx));
        valuesEl.appendChild(numEl);
      }
    } else if (keyPath === 'position.y') {
      for (const v of anim.values as Array<any>) {
        const n = Number(v);
        const cy = Math.round(Number.isFinite(n) ? n : 0);
        const numEl = doc.createElementNS(CAML_NS, 'NSNumber');
        numEl.setAttribute('value', String(cy));
        valuesEl.appendChild(numEl);
      }
    } else if (keyPath === 'transform.rotation.x' || keyPath === 'transform.rotation.y' || keyPath === 'transform.rotation.z') {
      for (const v of anim.values as Array<any>) {
        const deg = Number(v);
        const rad = (Number.isFinite(deg) ? deg : 0) * Math.PI / 180;
        const realEl = doc.createElementNS(CAML_NS, 'real');
        realEl.setAttribute('value', String(rad));
        valuesEl.appendChild(realEl);
      }
    }
    a.appendChild(valuesEl);
    animationsEl.appendChild(a);
    el.appendChild(animationsEl);
  }

  return el;
}
