import { CAProjectBundle, AnyLayer } from './types';
import { parseCAML, parseStates, serializeCAML } from './caml';

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

export async function packCA(bundle: CAProjectBundle): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Files need to be in root not [project-name]/ :p
  const camlRaw = serializeCAML(bundle.root, bundle.project, bundle.states);
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
  const camlStr = camlFile ? await camlFile.async('string') : null;
  if (!camlStr) throw new Error('CAML scene not found in package');

  const root = parseCAML(camlStr);
  if (!root) throw new Error('Failed to parse CAML');
  const states = parseStates(camlStr);

  const assets: CAProjectBundle['assets'] = {};
  let assetsFolder = zip.folder('assets');
  if (!assetsFolder) {
    const files = Object.keys(zip.files);
    const assetsPath = files.find(f => f.includes('/assets/') || f.startsWith('assets/'));
    if (assetsPath) {
      const pathParts = assetsPath.split('/');
      const projectFolder = pathParts[0];
      const projectZip = zip.folder(projectFolder);
      if (projectZip) {
        assetsFolder = projectZip.folder('assets');
      }
    }
  }
  
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

  return { project, root, assets, states };
}
