import { CAProjectBundle, AnyLayer } from './types';
import { parseCAML, parseStates, parseStateOverrides, parseStateTransitions, serializeCAML } from './caml';

const INDEX_XML_BASENAME = 'index.xml';
const DEFAULT_SCENE = 'main.caml';

function formatXml(xml: string): string {
  const normalized = xml.replace(/\?>\s*</, '?>\n<');
  const reg = /(>)(<)(\/*)/g;
  const xmlWithBreaks = normalized.replace(reg, '$1\n$2$3');
  let pad = 0;
  const lines = xmlWithBreaks.split('\n');
  const formatted = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      let indentChange = 0;
      if (/^<\/.+>/.test(line)) {
        pad = Math.max(pad - 1, 0);
      } else if (/^<[^!?][^>]*[^\/]>$/.test(line)) {
        indentChange = 1;
      } else if (/^<[^!?].*\/>$/.test(line)) {
        indentChange = 0;
      } else if (/^<\?xml/.test(line) || /^<!/.test(line)) {
        indentChange = 0;
      } else if (/^<[^>]+>.*<\/[^>]+>$/.test(line)) {
        indentChange = 0;
      }
      const indented = `${'  '.repeat(pad)}${line}`;
      pad += indentChange;
      return indented;
    })
    .join('\n');
  return formatted + '\n';
}

function buildIndexXml(rootDocument: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>${rootDocument}</string>\n</dict>\n</plist>`;
}

function parseIndexXml(xml: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const el = doc.getElementsByTagName('rootDocument')[0];
    if (el && el.textContent) return el.textContent.trim();

    const keys = Array.from(doc.getElementsByTagName('key'));
    for (const k of keys) {
      if ((k.textContent || '').trim() === 'rootDocument') {
        let vEl: Element | null = null;
        vEl = (k.nextElementSibling as Element | null);
        let s: Element | null = vEl;
        while (s && s.tagName.toLowerCase() !== 'string') s = s.nextElementSibling as Element | null;
        const txt = (s && s.textContent) ? s.textContent.trim() : (vEl && vEl.textContent ? vEl.textContent.trim() : '');
        if (txt) return txt;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function dataURLToBlob(dataURL: string): Promise<Blob> {
  try {
    const res = await fetch(dataURL);
    return await res.blob();
  } catch {
    try {
      const [meta, data] = dataURL.split(',');
      const isBase64 = /;base64/i.test(meta);
      const mimeMatch = meta.match(/^data:([^;]+)(;base64)?/i);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      if (isBase64) {
        const byteString = atob(data);
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        return new Blob([ia], { type: mime });
      } else {
        return new Blob([decodeURIComponent(data)], { type: mime });
      }
    } catch {
      return new Blob([]);
    }
  }
}

function mimeToExt(mime?: string): string {
  if (!mime) return 'bin';
  const m = mime.toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('svg')) return 'svg';
  return 'bin';
}

async function extractInlineAssetsToFiles(xml: string): Promise<{ xml: string; assets: Record<string, { path: string; data: Blob }> }> {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const outAssets: Record<string, { path: string; data: Blob }> = {};
    let counter = 0;
    const ensureUniqueName = (base: string): string => {
      let name = base;
      while (outAssets[name]) {
        const i = ++counter;
        const idx = base.lastIndexOf('.');
        if (idx > 0) name = `${base.slice(0, idx)}_${i}${base.slice(idx)}`;
        else name = `${base}_${i}`;
      }
      return name;
    };

    const replaceSrc = async (el: Element, attrName: string) => {
      const src = el.getAttribute(attrName) || '';
      if (!/^data:/i.test(src)) return;
      try {
        const blob = await dataURLToBlob(src);
        const meta = src.slice(0, src.indexOf(','));
        const mimeMatch = meta.match(/^data:([^;]+)(;base64)?/i);
        const ext = mimeToExt(mimeMatch ? mimeMatch[1] : undefined);
        const uid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const filename = ensureUniqueName(`inline_${uid}.${ext}`);
        el.setAttribute(attrName, `assets/${filename}`);
        outAssets[filename] = { path: `assets/${filename}`, data: blob };
      } catch {
      }
    };

    const cgImages = Array.from(doc.getElementsByTagName('CGImage')) as Element[];
    for (const img of cgImages) {
      await replaceSrc(img, 'src');
    }

    const contents = Array.from(doc.getElementsByTagName('contents')) as Element[];
    for (const c of contents) {
      const t = (c.getAttribute('type') || '').toLowerCase();
      if (t === 'cgimage' && c.hasAttribute('src')) {
        await replaceSrc(c, 'src');
      }
    }

    const newXml = new XMLSerializer().serializeToString(doc);
    return { xml: newXml, assets: outAssets };
  } catch {
    return { xml, assets: {} };
  }
}

export async function packCA(bundle: CAProjectBundle): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Files need to be in root not [project-name]/ :p
  const makeGeneratedTransitions = () => {
    const states = (bundle.states || []).filter((n) => !/^base(\s*state)?$/i.test((n || '').trim()));
    const overrides = bundle.stateOverrides || {};
    const anyProvided = Array.isArray(bundle.stateTransitions) && bundle.stateTransitions.length > 0;
    if (anyProvided) return bundle.stateTransitions;
    const gens: Array<{ fromState: string; toState: string; elements: Array<{ targetId: string; keyPath: string; animation?: any }> }> = [];
    const ensure = (fromState: string, toState: string) => {
      let tr = gens.find((t) => t.fromState === fromState && t.toState === toState);
      if (!tr) { tr = { fromState, toState, elements: [] }; gens.push(tr); }
      return tr;
    };
    for (const s of states) {
      const list = overrides[s] || [];
      if (!list.length) continue;
      for (const ov of list) {
        const anim = { type: 'CASpringAnimation', damping: 50, mass: 2, stiffness: 300, velocity: 0, duration: 0.8, fillMode: 'backwards', keyPath: ov.keyPath };
        ensure('*', s).elements.push({ targetId: ov.targetId, keyPath: ov.keyPath, animation: anim });
        ensure(s, '*').elements.push({ targetId: ov.targetId, keyPath: ov.keyPath, animation: anim });
      }
    }
    for (const s of states) {
      if (!gens.find(g => g.fromState === '*' && g.toState === s)) gens.push({ fromState: '*', toState: s, elements: [] });
      if (!gens.find(g => g.fromState === s && g.toState === '*')) gens.push({ fromState: s, toState: '*', elements: [] });
    }
    return gens;
  };

  const generatedTransitions = makeGeneratedTransitions();
  const camlRaw = serializeCAML(
    bundle.root,
    bundle.project,
    bundle.states,
    bundle.stateOverrides,
    generatedTransitions,
  );
  const caml = formatXml(camlRaw);
  zip.file(DEFAULT_SCENE, caml);

  zip.file(INDEX_XML_BASENAME, buildIndexXml(DEFAULT_SCENE));

  // Add assetManifest.caml file, i think this is needed bc my other working tendies have it :p
  const assetManifestContent = `<?xml version="1.0" encoding="UTF-8"?>

<caml xmlns="http://www.apple.com/CoreAnimation/1.0">
  <MicaAssetManifest>
    <modules type="NSArray"/>
  </MicaAssetManifest>
</caml>`;
  zip.file('assetManifest.caml', assetManifestContent);

  const assets = bundle.assets || {};
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    for (const [name, asset] of Object.entries(assets)) {
      const data = (asset.data instanceof Blob)
        ? await asset.data.arrayBuffer()
        : (asset.data as ArrayBuffer | string);
      assetsFolder.file(name, data as any);
    }
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  return new Blob([blob], { type: 'application/zip' });
}

export async function unpackCA(file: Blob): Promise<CAProjectBundle> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  let indexXml = await zip.file(INDEX_XML_BASENAME)?.async('string');
  if (!indexXml) indexXml = await zip.file('Index.xml')?.async('string');
  if (!indexXml) indexXml = await zip.file('index.plist')?.async('string');
  
  if (!indexXml) {
    const files = Object.keys(zip.files);
    const indexFile = files.find(f => f.endsWith('index.xml') || f.endsWith('Index.xml'));
    if (indexFile) indexXml = await zip.file(indexFile)?.async('string');
  }

  const rootDoc = indexXml ? parseIndexXml(indexXml) : null;
  const sceneName = (rootDoc || DEFAULT_SCENE).trim();

  let camlFile = zip.file(sceneName);
  if (!camlFile) {
    const files = Object.keys(zip.files);
    const basename = sceneName.split('/')?.pop() || sceneName;
    const candidate = files.find((f) => (f.split('/')?.pop() || f) === basename);
    if (candidate) camlFile = zip.file(candidate);
  }
  if (!camlFile) {
    const anyCaml = Object.keys(zip.files).find((f) => {
      const lf = f.toLowerCase();
      return lf.endsWith('.caml') || lf.endsWith('.xml');
    });
    if (anyCaml) camlFile = zip.file(anyCaml);
  }
  const camlStrOriginal = camlFile ? await camlFile.async('string') : null;
  if (!camlStrOriginal) throw new Error('CAML scene not found in package');

  const { xml: camlStr, assets: inlineAssets } = await extractInlineAssetsToFiles(camlStrOriginal);

  const root = parseCAML(camlStr);
  if (!root) throw new Error('Failed to parse CAML');
  const states = parseStates(camlStr);
  const stateOverrides = parseStateOverrides(camlStr);
  const stateTransitions = parseStateTransitions(camlStr);

  const assets: CAProjectBundle['assets'] = {};
  try {
    const allPaths = Object.keys(zip.files);
    for (const p of allPaths) {
      const entry = zip.files[p];
      if (!entry || entry.dir) continue;
      if (!/(^|\/)assets\//i.test(p)) continue;
      const fileObj = zip.file(p);
      if (!fileObj) continue;
      const data = await fileObj.async('blob');
      const afterAssets = p.split(/assets\//i)[1] || '';
      const filename = (afterAssets.split('/').pop() || '').trim();
      if (!filename) continue;
      if (data && data.size > 0 && !assets[filename]) {
        assets[filename] = { path: `assets/${filename}`, data };
      }
    }
  } catch {
  }

  try {
    const inlineNames = Object.keys(inlineAssets || {});
    if (inlineNames.length) {
      for (const name of inlineNames) {
        const info = (inlineAssets as any)[name] as { path: string; data: Blob };
        if (!assets[name]) assets[name] = { path: info.path, data: info.data };
      }
      try { console.warn(`[import] Extracted ${inlineNames.length} inline image(s) from CAML into assets/`); } catch {}
    }
  } catch {}

  const project = {
    id: crypto.randomUUID(),
    name: 'Imported Project',
    width: Math.max(0, root.size.w),
    height: Math.max(0, root.size.h),
    geometryFlipped: ((root as any).geometryFlipped ?? 0) as 0 | 1,
  };

  return { project, root, assets, states, stateOverrides, stateTransitions };
}
