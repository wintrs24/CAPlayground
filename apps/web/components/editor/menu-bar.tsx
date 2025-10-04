"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Trash2, Sun, Moon, Keyboard, PanelLeft, PanelRight, Settings as Gear, ArrowUpDown, Layers as LayersIcon, Check, X, Star, MoreVertical } from "lucide-react";
import { useTheme } from "next-themes";
import { useEditor } from "./editor-context";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, JSX } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import JSZip from "jszip";
import { Slider } from "../ui/slider";
import { getProject, updateProject, deleteProject, listFiles, isUsingOPFS } from "@/lib/storage";
 

interface ProjectMeta { id: string; name: string; width?: number; height?: number; createdAt?: string }

type MenuBarProps = {
  projectId: string;
  showLeft?: boolean;
  showRight?: boolean;
  toggleLeft?: () => void;
  toggleRight?: () => void;
  leftWidth?: number;
  rightWidth?: number;
  statesHeight?: number;
  setLeftWidth?: (n: number) => void;
  setRightWidth?: (n: number) => void;
  setStatesHeight?: (n: number) => void;
};

export function MenuBar({ projectId, showLeft = true, showRight = true, toggleLeft, toggleRight, leftWidth, rightWidth, statesHeight, setLeftWidth, setRightWidth, setStatesHeight }: MenuBarProps) {
  const router = useRouter();
  const { doc, undo, redo, setDoc, activeCA, setActiveCA, savingStatus, lastSavedAt, flushPersist } = useEditor();
  const { toast } = useToast();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingTendies, setExportingTendies] = useState(false);
  const [showManualSave, setShowManualSave] = useState(false);
  const [snapEdgesEnabled, setSnapEdgesEnabled] = useLocalStorage<boolean>("caplay_settings_snap_edges", true);
  const [snapLayersEnabled, setSnapLayersEnabled] = useLocalStorage<boolean>("caplay_settings_snap_layers", true);
  const [snapResizeEnabled, setSnapResizeEnabled] = useLocalStorage<boolean>("caplay_settings_snap_resize", true);
  const [SNAP_THRESHOLD, setSnapThreshold] = useLocalStorage<number>("caplay_settings_snap_threshold", 12);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageFallback, setStorageFallback] = useState(false);
  const [exportView, setExportView] = useState<'select'|'success'>("select");

  useEffect(() => {
    if (doc?.meta.name) setName(doc.meta.name);
  }, [doc?.meta.name]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      try { setStorageFallback(!(await isUsingOPFS())); } catch {}
    })();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'e') {
        e.preventDefault();
        setExportOpen(true);
      } else if (e.shiftKey && key === 'l') {
        e.preventDefault();
        toggleLeft?.();
      } else if (e.shiftKey && key === 'i') {
        e.preventDefault();
        toggleRight?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, toggleLeft, toggleRight]);

  const exportCA = async (): Promise<boolean> => {
    try {
      if (!doc) return false;
      const proj = await getProject(doc.meta.id);
      const nameSafe = ((proj?.name || doc.meta.name) || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
      const folder = `${(proj?.name || doc.meta.name) || 'Project'}.ca`;
      const allFiles = await listFiles(doc.meta.id, `${folder}/`);
      const outputZip = new JSZip();
      const isGyro = doc.meta.gyroEnabled ?? false;
      
      if (isGyro) {
        const wallpaperPrefix = `${folder}/Wallpaper.ca/`;
        for (const f of allFiles) {
          let rel: string | null = null;
          if (f.path.startsWith(wallpaperPrefix)) {
            rel = `Wallpaper.ca/${f.path.substring(wallpaperPrefix.length)}`;
          } else {
            rel = null;
          }
          if (!rel) continue;
          if (f.type === 'text') {
            outputZip.file(rel, String(f.data));
          } else {
            const buf = f.data as ArrayBuffer;
            outputZip.file(rel, buf);
          }
        }
      } else {
        const backgroundPrefix = `${folder}/Background.ca/`;
        const floatingPrefix = `${folder}/Floating.ca/`;
        for (const f of allFiles) {
          let rel: string | null = null;
          if (f.path.startsWith(backgroundPrefix)) {
            rel = `Background.ca/${f.path.substring(backgroundPrefix.length)}`;
          } else if (f.path.startsWith(floatingPrefix)) {
            rel = `Floating.ca/${f.path.substring(floatingPrefix.length)}`;
          } else {
            rel = null;
          }
          if (!rel) continue;
          if (f.type === 'text') {
            outputZip.file(rel, String(f.data));
          } else {
            const buf = f.data as ArrayBuffer;
            outputZip.file(rel, buf);
          }
        }
      }
      
      const finalZipBlob = await outputZip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(finalZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameSafe}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Export failed', e);
      toast({
        title: "Export failed",
        description: "Failed to export .ca file. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const exportTendies = async () => {
    try {
      setExportingTendies(true);
      if (!doc) return;
      const proj = await getProject(doc.meta.id);
      const nameSafe = ((proj?.name || doc.meta.name) || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
      const isGyro = doc.meta.gyroEnabled ?? false;

      const templateEndpoint = isGyro ? '/api/templates/gyro-tendies' : '/api/templates/tendies';
      const templateResponse = await fetch(templateEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip',
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!templateResponse.ok) {
        throw new Error(`Failed to fetch tendies template: ${templateResponse.status} ${templateResponse.statusText}`);
      }
      
      const templateArrayBuffer = await templateResponse.arrayBuffer();
      
      if (templateArrayBuffer.byteLength === 0) {
        throw new Error('Error with length of tendies file');
      }

      const templateZip = new JSZip();
      await templateZip.loadAsync(templateArrayBuffer);

      const outputZip = new JSZip();

      for (const [relativePath, file] of Object.entries(templateZip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array');
          outputZip.file(relativePath, content);
        }
      }
      const folder = `${(proj?.name || doc.meta.name) || 'Project'}.ca`;
      const allFiles = await listFiles(doc.meta.id, `${folder}/`);
      
      if (isGyro) {
        const wallpaperPrefix = `${folder}/Wallpaper.ca/`;
        const caMap: Array<{ path: string; data: Uint8Array | string }> = [];
        for (const f of allFiles) {
          if (f.path.startsWith(wallpaperPrefix)) {
            caMap.push({ path: f.path.substring(wallpaperPrefix.length), data: f.type === 'text' ? String(f.data) : new Uint8Array(f.data as ArrayBuffer) });
          }
        }
        const caFolderPath = `descriptors/99990000-0000-0000-0000-000000000000/versions/0/contents/7400.WWDC_2022-390w-844h@3x~iphone.wallpaper/wallpaper.ca`;
        for (const file of caMap) {
          const fullPath = `${caFolderPath}/${file.path}`;
          if (typeof file.data === 'string') outputZip.file(fullPath, file.data);
          else outputZip.file(fullPath, file.data);
        }
      } else {
        const backgroundPrefix = `${folder}/Background.ca/`;
        const floatingPrefix = `${folder}/Floating.ca/`;
        const caMap: Record<'background'|'floating', Array<{ path: string; data: Uint8Array | string }>> = { background: [], floating: [] };
        for (const f of allFiles) {
          if (f.path.startsWith(backgroundPrefix)) {
            caMap.background.push({ path: f.path.substring(backgroundPrefix.length), data: f.type === 'text' ? String(f.data) : new Uint8Array(f.data as ArrayBuffer) });
          } else if (f.path.startsWith(floatingPrefix)) {
            caMap.floating.push({ path: f.path.substring(floatingPrefix.length), data: f.type === 'text' ? String(f.data) : new Uint8Array(f.data as ArrayBuffer) });
          }
        }
        const caKeys = ['background','floating'] as const;
        for (const key of caKeys) {
          const caFolderPath = key === 'floating'
            ? `descriptors/09E9B685-7456-4856-9C10-47DF26B76C33/versions/1/contents/7400.WWDC_2022-390w-844h@3x~iphone.wallpaper/7400.WWDC_2022_Floating-390w-844h@3x~iphone.ca`
            : `descriptors/09E9B685-7456-4856-9C10-47DF26B76C33/versions/1/contents/7400.WWDC_2022-390w-844h@3x~iphone.wallpaper/7400.WWDC_2022_Background-390w-844h@3x~iphone.ca`;
          for (const file of caMap[key]) {
            const fullPath = `${caFolderPath}/${file.path}`;
            if (typeof file.data === 'string') outputZip.file(fullPath, file.data);
            else outputZip.file(fullPath, file.data);
          }
        }
      }

      const finalZipBlob = await outputZip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(finalZipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameSafe}.tendies`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: `Tendies file "${nameSafe}.tendies" has been downloaded.`,
      });
      setExportView('success');
    } catch (e) {
      console.error('Tendies export failed', e);
      toast({
        title: "Export failed",
        description: "Failed to export tendies file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingTendies(false);
    }
  };

  const performRename = async () => {
    if (!name.trim()) return;
    const proj = await getProject(projectId);
    if (proj) await updateProject({ ...proj, name: name.trim() });
    setDoc((prev) => {
      if (!prev) return prev;
      return { ...prev, meta: { ...prev.meta, name: name.trim() } };
    });
    setRenameOpen(false);
  };

  const performDelete = async () => {
    await deleteProject(projectId);
    router.push("/projects");
  };

  return (
    <div className="w-full h-12 flex items-center justify-between px-3 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 border border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {doc?.meta.name ?? "Project"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={async () => { await flushPersist(); router.push('/projects'); }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Saving status + storage badge */}
        <div onMouseEnter={() => setShowManualSave(true)} onMouseLeave={() => setShowManualSave(false)}>
          {showManualSave ? (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={async () => { await flushPersist(); setShowManualSave(false); }}
              title="Save now"
            >
              Manual Save
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  savingStatus === 'saving'
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                    : savingStatus === 'saved'
                    ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                    : 'border-muted text-muted-foreground'
                }`}
                aria-live="polite"
                title={lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : undefined}
              >
                {savingStatus === 'saving' ? 'Saving…' : savingStatus === 'saved' ? 'Saved' : 'Idle'}
              </span>
              {storageFallback && (
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200" title="OPFS not available; using IndexedDB fallback">
                  IndexedDB fallback
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* switch between ca files */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="border rounded-md p-0.5">
            {doc?.meta.gyroEnabled ? (
              <Button
                variant="ghost"
                className="h-8 px-2 gap-2 cursor-default"
                disabled
              >
                <span className="text-sm">Wallpaper</span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 gap-2"
                    aria-label={`Active CA: ${activeCA === 'floating' ? 'Floating' : 'Background'}`}
                    aria-expanded={false}
                    role="button"
                  >
                    <span className="text-sm">{activeCA === 'floating' ? 'Floating' : 'Background'}</span>
                    <ArrowUpDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 p-2">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">Choose Active CA</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setActiveCA('background'); }}
                    className={`w-full justify-start text-left py-6 ${activeCA==='background' ? 'border-primary/50' : ''}`}
                    role="menuitemradio"
                    aria-checked={activeCA==='background'}
                  >
                    <div className="flex items-center gap-3">
                      <LayersIcon className="h-4 w-4" />
                      <div className="flex-1 text-left">
                        <div>Background</div>
                        <div className="text-xs text-muted-foreground">Appears behind the clock.</div>
                      </div>
                      {activeCA==='background' && <Check className="h-4 w-4" />}
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setActiveCA('floating'); }}
                    className={`w-full justify-start text-left py-6 ${activeCA==='floating' ? 'border-primary/50' : ''}`}
                    role="menuitemradio"
                    aria-checked={activeCA==='floating'}
                  >
                    <div className="flex items-center gap-3">
                      <LayersIcon className="h-4 w-4" />
                      <div className="flex-1 text-left">
                        <div>Floating</div>
                        <div className="text-xs text-muted-foreground">Appears over the clock.</div>
                      </div>
                      {activeCA==='floating' && <Check className="h-4 w-4" />}
                    </div>
                  </Button>
                </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1 border rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title={showLeft ? "Hide left panel" : "Show left panel"}
            aria-label={showLeft ? "Hide left panel" : "Show left panel"}
            onClick={() => toggleLeft?.()}
          >
            <PanelLeft className={`h-4 w-4 ${showLeft ? '' : 'opacity-50'}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 p-0"
            title={showRight ? "Hide right panel" : "Show right panel"}
            aria-label={showRight ? "Hide right panel" : "Show right panel"}
            onClick={() => toggleRight?.()}
          >
            <PanelRight className={`h-4 w-4 ${showRight ? '' : 'opacity-50'}`} />
          </Button>
        </div>

        <div className="border rounded-md p-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 p-0"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* Settings dropdown */}
        <div className="border rounded-md p-0.5">
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0" aria-label="Settings" data-tour-id="settings-button">
                <Gear className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-100 p-2">
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <DropdownMenuLabel className="p-0 m-0">Settings</DropdownMenuLabel>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mr-1"
                  aria-label="Close settings"
                  onClick={() => setSettingsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Snapping</DropdownMenuLabel>
              <div className="px-2 py-1.5 space-y-1">
                <div className="flex items-center justify-between gap-3 py-2">
                  <Label htmlFor="snap-edges" className="text-sm">Snap to canvas edges</Label>
                  <Switch id="snap-edges" checked={!!snapEdgesEnabled} onCheckedChange={(c) => setSnapEdgesEnabled(!!c)} />
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <Label htmlFor="snap-layers" className="text-sm">Snap to other layers</Label>
                  <Switch id="snap-layers" checked={!!snapLayersEnabled} onCheckedChange={(c) => setSnapLayersEnabled(!!c)} />
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <Label htmlFor="snap-resize" className="text-sm">Snap when resizing</Label>
                  <Switch id="snap-resize" checked={!!snapResizeEnabled} onCheckedChange={(c) => setSnapResizeEnabled(!!c)} />
                </div>
                <div className="flex items-center justify-between gap-3 py-2">
                  <Label htmlFor="snap-threshold" className="text-sm">Sensitivity</Label>
                  <Slider id="snap-threshold" value={[SNAP_THRESHOLD]} min={3} max={25} onValueChange={([c]) => setSnapThreshold(c)} />
                  <Button onClick={()=>{setSnapThreshold(12)}}>Reset</Button>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Keyboard Shortcuts</DropdownMenuLabel>
              <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between"><span>Undo</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Z</span></div>
                <div className="flex items-center justify-between"><span>Redo</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + Z</span></div>
                <div className="flex items-center justify-between"><span>Zoom In</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + +</span></div>
                <div className="flex items-center justify-between"><span>Zoom Out</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + -</span></div>
                <div className="flex items-center justify-between"><span>Reset Zoom</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + 0</span></div>
                <div className="flex items-center justify-between"><span>Export</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + E</span></div>
                <div className="flex items-center justify-between"><span>Pan</span><span className="font-mono">Shift + Drag or Middle Click</span></div>
                <div className="flex items-center justify-between"><span>Toggle Left Panel</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + L</span></div>
                <div className="flex items-center justify-between"><span>Toggle Right Panel</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + I</span></div>
                <div className="flex items-center justify-between"><span>Bring Forward</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + ]</span></div>
                <div className="flex items-center justify-between"><span>Send Backward</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + [</span></div>
                <div className="flex items-center justify-between"><span>Bring to Front</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + ]</span></div>
                <div className="flex items-center justify-between"><span>Send to Back</span><span className="font-mono">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + [</span></div>
                <div className="flex items-center justify-between"><span>Delete Layer</span><span className="font-mono">Delete</span></div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Panels</DropdownMenuLabel>
              <div className="px-2 py-1.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Left panel width</span>
                  <span className="font-mono text-muted-foreground">{leftWidth ?? '—'} px</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Right panel width</span>
                  <span className="font-mono text-muted-foreground">{rightWidth ?? '—'} px</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>States panel height</span>
                  <span className="font-mono text-muted-foreground">{statesHeight ?? '—'} px</span>
                </div>
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLeftWidth?.(320);
                      setRightWidth?.(400);
                      setStatesHeight?.(350);
                    }}
                  >
                    Reset to defaults
                  </Button>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('caplay:start-onboarding' as any));
                }
                setSettingsOpen(false);
              }}>
                Show onboarding
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div>
          <Button variant="secondary" disabled={!doc} onClick={() => { setExportView('select'); setExportOpen(true); }}>Export</Button>
          <Dialog open={exportOpen} onOpenChange={(v)=>{ setExportOpen(v); if (!v) setExportView('select'); }}>
            <DialogContent>
              <DialogHeader className={exportView === 'success' ? 'flex items-center justify-start' : undefined}>
                {exportView === 'success' ? (
                  <Button variant="ghost" className="h-8 w-auto px-2 gap-1 self-start" onClick={() => setExportView('select')}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                ) : (
                  <>
                    <DialogTitle>Export</DialogTitle>
                    <DialogDescription>Select a format to export your project.</DialogDescription>
                  </>
                )}
              </DialogHeader>
              <div className="relative overflow-hidden">
                <div className="flex w-[200%] transition-transform duration-300 ease-out"
                  style={{ transform: exportView === 'select' ? 'translateX(0%)' : 'translateX(-50%)' }}>
                  <div className="w-1/2 px-0">
                    <div className="grid gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const ok = await exportCA();
                          if (ok) setExportView('success');
                        }}
                        disabled={!doc}
                        className="w-full justify-start text-left py-10"
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span>Export .ca file</span>
                          <span className="text-xs text-muted-foreground">Download a .zip with your floating.ca and background.ca files.</span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { exportTendies(); }}
                        disabled={!doc || exportingTendies}
                        className="w-full justify-start text-left py-10"
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span>Export Tendies file</span>
                          <span className="text-xs text-muted-foreground">
                            {exportingTendies ? 'Creating tendies file...' : 'Create a tendies wallpaper file with your animation.'}
                          </span>
                        </div>
                      </Button>
                    </div>
                  </div>
                  {/* Success panel */}
                  <div className="w-1/2 px-0">
                    <div className="py-6 flex flex-col items-center text-center gap-3">
                      <div className="text-2xl font-semibold">Thank you for using CAPlayground!</div>
                      <div className="text-sm text-muted-foreground">Got a minute? Please consider starring the GitHub repo.</div>
                      <a
                        href="https://github.com/CAPlayground/CAPlayground"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted"
                      >
                        <Star className="h-4 w-4" />
                        Star the repo
                      </a>
                      <div className="pt-2">
                        <Button onClick={() => setExportOpen(false)}>Close</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* shortcuts modal */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Undo</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Z</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Redo</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + Z</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zoom in</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + +</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zoom out</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + -</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Re-center</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + 0</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Export</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + E</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zoom with scroll</span>
              <span className="font-mono text-muted-foreground">Shift + Scroll</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pan canvas</span>
              <span className="font-mono text-muted-foreground">Middle Click + Drag</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pan canvas (alt)</span>
              <span className="font-mono text-muted-foreground">Shift + Drag</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle left panel</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + L</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Toggle right panel</span>
              <span className="font-mono text-muted-foreground">{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Shift + I</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShortcutsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>Update the name of your project.</DialogDescription>
          </DialogHeader>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') performRename();
              if (e.key === 'Escape') setRenameOpen(false);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={performRename} disabled={!name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and its editor data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={performDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
