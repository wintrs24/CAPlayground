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
import { ArrowLeft, Pencil, Trash2, Sun, Moon, Keyboard, PanelLeft, PanelRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useEditor } from "./editor-context";
import { packCA } from "@/lib/ca/ca-file";
import type { AnyLayer, GroupLayer } from "@/lib/ca/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProjectMeta { id: string; name: string; width?: number; height?: number; createdAt?: string }

type MenuBarProps = {
  projectId: string;
  showLeft?: boolean;
  showRight?: boolean;
  toggleLeft?: () => void;
  toggleRight?: () => void;
};

export function MenuBar({ projectId, showLeft = true, showRight = true, toggleLeft, toggleRight }: MenuBarProps) {
  const router = useRouter();
  const { doc, undo, redo } = useEditor();
  const [projects, setProjects] = useLocalStorage<ProjectMeta[]>("caplayground-projects", []);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (doc?.meta.name) setName(doc.meta.name);
  }, [doc?.meta.name]);

  useEffect(() => {
    setMounted(true);
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

  const exportCA = async () => {
    try {
      if (!doc) return;
      const nameSafe = (doc.meta.name || 'Project').replace(/[^a-z0-9\-_]+/gi, '-');
      const root: GroupLayer = {
        id: doc.meta.id,
        name: doc.meta.name || 'Project',
        type: 'group',
        position: { x: Math.round((doc.meta.width || 0) / 2), y: Math.round((doc.meta.height || 0) / 2) },
        size: { w: doc.meta.width || 0, h: doc.meta.height || 0 },
        backgroundColor: doc.meta.background,
        children: (doc.layers as AnyLayer[]) || [],
      };

      const blob = await packCA({
        project: {
          id: doc.meta.id,
          name: doc.meta.name,
          width: doc.meta.width,
          height: doc.meta.height,
          background: doc.meta.background,
        },
        root,
        assets: {},
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nameSafe}.ca`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const performRename = () => {
    if (!name.trim()) return;
    const next = (projects ?? []).map((p) => (p.id === projectId ? { ...p, name: name.trim() } : p));
    setProjects(next);
    const key = `caplayground-project:${projectId}`;
    try {
      const current = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (current) {
        const parsed = JSON.parse(current);
        parsed.meta.name = name.trim();
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch {}
    setRenameOpen(false);
  };

  const performDelete = () => {
    const next = (projects ?? []).filter((p) => p.id !== projectId);
    setProjects(next);
    try { localStorage.removeItem(`caplayground-project:${projectId}`); } catch {}
    router.push("/projects");
  };

  return (
    <div className="w-full h-12 flex items-center justify-between px-3 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 border border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {doc?.meta.name ?? "Project"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/projects">
              <DropdownMenuItem className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to projects
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setRenameOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border rounded-md p-0.5">
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
        <div className="border rounded-md p-0.5">
          <Button
            variant="ghost"
            className="h-8 px-2"
            onClick={() => setShortcutsOpen(true)}
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Shortcuts
          </Button>
        </div>
        <div>
          <Button variant="secondary" disabled={!doc} onClick={() => setExportOpen(true)}>Export</Button>
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export</DialogTitle>
                <DialogDescription>Select a format to export your project.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Button
                  variant="default"
                  onClick={() => { exportCA(); setExportOpen(false); }}
                  disabled={!doc}
                  className="w-full justify-start text-left py-10"
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span>Export .ca file</span>
                    <span className="text-xs text-muted-foreground">Download a .ca archive you can re-import later.</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  disabled
                  className="w-full justify-start text-left py-10 opacity-70"
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span>Export Tendies file</span>
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  </div>
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExportOpen(false)}>Close</Button>
              </DialogFooter>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShortcutsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rename dialog */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setRenameOpen(false)}>
          <div className="bg-background rounded-md shadow p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium mb-2">Rename Project</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus onKeyDown={(e)=>{ if(e.key==='Enter') performRename(); if(e.key==='Escape') setRenameOpen(false); }} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button onClick={performRename} disabled={!name.trim()}>Save</Button>
            </div>
          </div>
        </div>
      )}

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
