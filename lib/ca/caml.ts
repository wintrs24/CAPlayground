import { AnyLayer, CAProject, GroupLayer, TextLayer } from './types';

const CAML_NS = 'http://www.apple.com/CoreAnimation/1.0';

function attr(node: Element, name: string): string | undefined {
  const v = node.getAttribute(name);
  return v === null ? undefined : v;
}

function parseNumberList(input?: string): number[] {
  if (!input) return [];
  return input
    .split(/[;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s));
}

export function parseCAML(xml: string): AnyLayer | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const caml = doc.getElementsByTagNameNS(CAML_NS, 'caml')[0] || doc.documentElement;
  if (!caml) return null;
  const root = caml.getElementsByTagNameNS(CAML_NS, 'CALayer')[0];
  if (!root) return null;
  return parseCALayer(root);
}

function parseCALayer(el: Element): AnyLayer {
  const id = attr(el, 'id') || crypto.randomUUID();
  const name = attr(el, 'name') || 'Layer';
  const bounds = parseNumberList(attr(el, 'bounds')); // x y w h
  const position = parseNumberList(attr(el, 'position')); // x y
  const opacity = attr(el, 'opacity') ? Number(attr(el, 'opacity')) : undefined;
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
  } as const;

  const sublayersEl = el.getElementsByTagNameNS(CAML_NS, 'sublayers')[0];
  const sublayerNodes = sublayersEl ? Array.from(sublayersEl.children).filter((n) => n.namespaceURI === CAML_NS && n.localName === 'CALayer') as Element[] : [];

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

  const children = sublayerNodes.map((n) => parseCALayer(n));
  const group: GroupLayer = {
    ...base,
    type: 'group',
    children,
  };
  return group;
}

export function serializeCAML(root: AnyLayer, project?: CAProject): string {
  const doc = document.implementation.createDocument(CAML_NS, 'caml', null);
  const caml = doc.documentElement;
  const rootEl = serializeLayer(doc, root, project);
  caml.appendChild(rootEl);
  const xml = new XMLSerializer().serializeToString(doc);
  return '<?xml version="1.0" encoding="UTF-8"?>' + xml; //added this or else mica couldnt open the caml
}

function setAttr(el: Element, name: string, value: string | number | undefined) {
  if (value === undefined || value === null || value === '') return;
  el.setAttribute(name, String(value));
}

function serializeLayer(doc: XMLDocument, layer: AnyLayer, project?: CAProject): Element {
  const el = doc.createElementNS(CAML_NS, 'CALayer');
  setAttr(el, 'id', layer.id);
  setAttr(el, 'name', layer.name);
  setAttr(el, 'bounds', `0 0 ${Math.max(0, layer.size.w)} ${Math.max(0, layer.size.h)}`);
  setAttr(el, 'position', `${Math.round(layer.position.x)} ${Math.round(layer.position.y)}`);
  setAttr(el, 'opacity', layer.opacity ?? undefined);
  setAttr(el, 'backgroundColor', layer.backgroundColor);
  setAttr(el, 'cornerRadius', layer.cornerRadius);
  setAttr(el, 'borderColor', layer.borderColor);
  setAttr(el, 'borderWidth', layer.borderWidth);

  if (layer.type === 'image') {
    const contents = doc.createElementNS(CAML_NS, 'contents');
    const img = doc.createElementNS(CAML_NS, 'CGImage');
    setAttr(img, 'src', layer.src);
    contents.appendChild(img);
    el.appendChild(contents);
  }

  if (layer.type === 'text') {
    setAttr(el, 'text', layer.text);
    setAttr(el, 'fontFamily', layer.fontFamily);
    setAttr(el, 'fontSize', layer.fontSize ?? undefined);
    setAttr(el, 'color', layer.color);
    setAttr(el, 'align', layer.align);
  }

  if (layer.type === 'group') {
    const sublayers = doc.createElementNS(CAML_NS, 'sublayers');
    const children = (layer as GroupLayer).children || [];
    for (const child of children) {
      sublayers.appendChild(serializeLayer(doc, child));
    }
    if (children.length) el.appendChild(sublayers);
  }

  return el;
}
