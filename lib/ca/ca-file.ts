import { CAProjectBundle, AnyLayer } from './types';
import { parseCAML, serializeCAML } from './caml';

const INDEX_XML_BASENAME = 'index.xml';
const DEFAULT_SCENE = 'main.caml';

function buildIndexXml(rootDocument: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<plist>\n  <rootDocument>${rootDocument}</rootDocument>\n</plist>`;
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

export async function packCA(bundle: CAProjectBundle): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const caml = serializeCAML(bundle.root, bundle.project);
  zip.file(DEFAULT_SCENE, caml);

  zip.file(INDEX_XML_BASENAME, buildIndexXml(DEFAULT_SCENE));

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

  return zip.generateAsync({ type: 'blob' });
}

export async function unpackCA(file: Blob): Promise<CAProjectBundle> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  let indexXml = await zip.file(INDEX_XML_BASENAME)?.async('string');
  if (!indexXml) indexXml = await zip.file('Index.xml')?.async('string');
  if (!indexXml) indexXml = await zip.file('index.plist')?.async('string');

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
  const camlStr = camlFile ? await camlFile.async('string') : null;
  if (!camlStr) throw new Error('CAML scene not found in package');

  const root = parseCAML(camlStr);
  if (!root) throw new Error('Failed to parse CAML');

  const assets: CAProjectBundle['assets'] = {};
  const assetsFolder = zip.folder('assets');
  if (assetsFolder) {
    const files = Object.keys(assetsFolder.files);
    for (const path of files) {
      const fileObj = assetsFolder.file(path);
      if (!fileObj) continue;
      const data = await fileObj.async('blob');
      const name = path.replace(/^assets\//, '');
      assets[name] = { path: `assets/${name}`, data };
    }
  }

  const project = {
    id: crypto.randomUUID(),
    name: 'Imported Project',
    width: Math.max(0, root.size.w),
    height: Math.max(0, root.size.h),
  };

  return { project, root, assets };
}
