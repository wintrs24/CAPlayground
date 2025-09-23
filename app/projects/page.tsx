"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Trash2, Edit3, Plus, Folder, ArrowLeft, Check, Upload } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type React from "react";
import type { AnyLayer, CAProject } from "@/lib/ca/types";
import { unpackCA } from "@/lib/ca/ca-file";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
  createdAt: string;
  width?: number;
  height?: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useLocalStorage<Project[]>("caplayground-projects", []);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rootWidth, setRootWidth] = useState<number>(390);
  const [rootHeight, setRootHeight] = useState<number>(844);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isTosOpen, setIsTosOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [previews, setPreviews] = useState<Record<string, { bg: string; width?: number; height?: number }>>({});
  const [thumbDocs, setThumbDocs] = useState<Record<string, { meta: Pick<CAProject, 'id'|'name'|'width'|'height'|'background'>; layers: AnyLayer[] }>>({});

  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "7" | "30" | "year">("all");
  const [sortBy, setSortBy] = useState<"recent" | "name-asc" | "name-desc">("recent");

  const projectsArray = Array.isArray(projects) ? projects : [];

  const recordProjectCreated = () => {
    try {
      fetch("/api/analytics/project-created", { method: "POST", keepalive: true }).catch(() => {})
    } catch {}
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const hasSession = !!data.session;
      setIsSignedIn(hasSession);
      try {
        const accepted = localStorage.getItem("caplayground-tos-accepted") === "true";
        if (!hasSession && !accepted) {
          setIsTosOpen(true);
        }
      } catch {
        if (!hasSession) setIsTosOpen(true);
      }
    });
  }, []);

  useEffect(() => {
    try {
      const map: Record<string, { bg: string; width?: number; height?: number }> = {};
      const docs: Record<string, { meta: Pick<CAProject,'id'|'name'|'width'|'height'|'background'>; layers: AnyLayer[] }> = {};
      for (const p of projectsArray) {
        const key = `caplayground-project:${p.id}`;
        const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const meta = parsed?.meta ?? {};
            const bg = typeof meta.background === 'string' ? meta.background : '#e5e7eb';
            const width = Number(meta.width) || p.width;
            const height = Number(meta.height) || p.height;
            map[p.id] = { bg, width, height };
            const layers = Array.isArray(parsed?.layers) ? parsed.layers as AnyLayer[] : [];
            docs[p.id] = { meta: { id: p.id, name: p.name, width: width || 390, height: height || 844, background: bg }, layers };
          } catch {}
        } else {
          map[p.id] = { bg: '#e5e7eb', width: p.width, height: p.height };
          docs[p.id] = { meta: { id: p.id, name: p.name, width: p.width || 390, height: p.height || 844, background: '#e5e7eb' }, layers: [] };
        }
      }
      setPreviews(map);
      setThumbDocs(docs);
    } catch {}
  }, [projectsArray]);

  function ProjectThumb({ doc }: { doc: { meta: Pick<CAProject, 'width'|'height'|'background'>; layers: AnyLayer[] } }) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });
    useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => {
        const r = el.getBoundingClientRect();
        setWrapSize({ w: Math.round(r.width), h: Math.round(r.height) });
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);
    const w = doc.meta.width || 390;
    const h = doc.meta.height || 844;
    const s = wrapSize.w > 0 && wrapSize.h > 0 ? Math.min(wrapSize.w / w, wrapSize.h / h) : 1;
    const ox = (wrapSize.w - w * s) / 2;
    const oy = (wrapSize.h - h * s) / 2;

    const renderLayer = (l: AnyLayer): React.ReactNode => {
      const common: React.CSSProperties = {
        position: 'absolute',
        left: l.position.x,
        top: l.position.y,
        width: l.size.w,
        height: l.size.h,
        transform: `rotate(${(l as any).rotation ?? 0}deg)`,
        opacity: (l as any).opacity ?? 1,
        display: (l as any).visible === false ? 'none' as any : undefined,
        overflow: 'hidden',
      };
      if (l.type === 'text') {
        const t = l as any;
        return <div key={l.id} style={{ ...common, color: t.color, fontSize: t.fontSize, textAlign: t.align ?? 'left' }}>{t.text}</div>;
      }
      if (l.type === 'image') {
        const im = l as any;
        return <img key={l.id} src={im.src} alt={im.name} draggable={false} style={{ ...common, objectFit: 'fill' as const }} />;
      }
      if (l.type === 'shape') {
        const s = l as any;
        const corner = (s.cornerRadius ?? s.radius) ?? 0;
        const borderRadius = s.shape === 'circle' ? 9999 : corner;
        const style: React.CSSProperties = { ...common, background: s.fill, borderRadius };
        if (s.borderColor && s.borderWidth) {
          style.border = `${Math.max(0, Math.round(s.borderWidth))}px solid ${s.borderColor}`;
        }
        return <div key={l.id} style={style} />;
      }
      if ((l as any).type === 'group') {
        const g = l as any;
        return (
          <div key={g.id} style={{ ...common, background: g.backgroundColor }}>
            {Array.isArray(g.children) ? g.children.map((c: AnyLayer) => renderLayer(c)) : null}
          </div>
        );
      }
      return null;
    };

    return (
      <div ref={wrapRef} className="w-full h-full relative bg-background">
        <div
          className="absolute"
          style={{
            width: w,
            height: h,
            background: doc.meta.background ?? '#e5e7eb',
            transform: `translate(${ox}px, ${oy}px) scale(${s})`,
            transformOrigin: 'top left',
            borderRadius: 4,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)'
          }}
        >
          {(doc.layers || []).map((l) => renderLayer(l))}
        </div>
      </div>
    );
  }

  const filteredProjects = useMemo(() => {
    const now = new Date();
    const matchesQuery = (name: string) =>
      query.trim() === "" || name.toLowerCase().includes(query.trim().toLowerCase());
    const inDateRange = (createdAt: string) => {
      if (dateFilter === "all") return true;
      const created = new Date(createdAt);
      if (Number.isNaN(created.getTime())) return true;
      switch (dateFilter) {
        case "7": {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          return created >= d;
        }
        case "30": {
          const d = new Date(now);
          d.setDate(d.getDate() - 30);
          return created >= d;
        }
        case "year": {
          return created.getFullYear() === now.getFullYear();
        }
        default:
          return true;
      }
    };

    const arr = projectsArray.filter((p) => matchesQuery(p.name) && inDateRange(p.createdAt));

    const sorted = [...arr].sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });
    return sorted;
  }, [projectsArray, query, dateFilter, sortBy]);

  const createProject = () => {
    if (newProjectName.trim() === "") return;
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      createdAt: new Date().toISOString(),
    };
    setProjects([...projectsArray, newProject]);
    recordProjectCreated();
    setNewProjectName("");
  };

  const createProjectFromDialog = () => {
    const name = newProjectName.trim();
    if (!name) return;
    const w = Number(rootWidth);
    const h = Number(rootHeight);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;

    const newProject: Project = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      width: Math.round(w),
      height: Math.round(h),
    };
    setProjects([...projectsArray, newProject]);
    recordProjectCreated();
    setNewProjectName("");
    setRootWidth(390);
    setRootHeight(844);
    setIsCreateOpen(false);
  };

  const startEditing = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingName(project.name);
    setIsRenameOpen(true);
  };

  const saveEdit = () => {
    if (editingProjectId === null || editingName.trim() === "") return;
    
    setProjects(
      projectsArray.map((project) =>
        project.id === editingProjectId
          ? { ...project, name: editingName.trim() }
          : project
      )
    );
    
    try {
      const key = `caplayground-project:${editingProjectId}`;
      const current = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed?.meta) parsed.meta.name = editingName.trim();
        localStorage.setItem(key, JSON.stringify(parsed));
      }
    } catch {}
    
    setEditingProjectId(null);
    setEditingName("");
    setIsRenameOpen(false);
  };

  const deleteProject = (id: string) => {
    setProjects(projectsArray.filter((project) => project.id !== id));
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setIsDeleteOpen(true);
  };

  const toggleSelectMode = () => {
    setIsSelectMode((v) => {
      const next = !v;
      if (!next) setSelectedIds([]);
      return next;
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const bundle = await unpackCA(file);
      const id = Date.now().toString();
      const name = bundle.project.name || "Imported Project";
      const width = Math.round(bundle.project.width || (bundle.root?.size?.w ?? 0));
      const height = Math.round(bundle.project.height || (bundle.root?.size?.h ?? 0));

      const newProj: Project = {
        id,
        name,
        createdAt: new Date().toISOString(),
        width,
        height,
      };
      setProjects([...(projectsArray || []), newProj]);
      recordProjectCreated();

      const root = bundle.root as any;
      const layers = root?.type === 'group' && Array.isArray(root.children)
        ? root.children
        : root
          ? [root]
          : [];
      const importedStates = Array.isArray(bundle.states) ? bundle.states.filter((n) => !/^base(\s*state)?$/i.test((n || '').trim())) : [];
      const doc = {
        meta: { id, name, width, height, background: root?.backgroundColor ?? '#e5e7eb' },
        layers,
        selectedId: null,
        states: importedStates.length > 0 ? importedStates : ["Locked", "Unlock", "Sleep"],
        stateOverrides: bundle.stateOverrides || {},
        stateTransitions: bundle.stateTransitions || [],
      };
      try {
        localStorage.setItem(`caplayground-project:${id}`, JSON.stringify(doc));
      } catch {}

      router.push(`/editor/${id}`);
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const openBulkDelete = () => setIsBulkDeleteOpen(true);
  const performBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setProjects(projectsArray.filter((p) => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setIsSelectMode(false);
    setIsBulkDeleteOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      createProjectFromDialog();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      setEditingProjectId(null);
      setEditingName("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-6">
          <div className="flex-1">
            <div className="mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </Link>
            </div>
            <h1 className="font-sfpro text-3xl md:text-4xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground">Create and manage your CoreAnimation projects stored locally on your device.</p>
            {/* Search & filters */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects by name..."
                />
              </div>
              <div>
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="year">This year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Newest first</SelectItem>
                    <SelectItem value="name-asc">Name A → Z</SelectItem>
                    <SelectItem value="name-desc">Name Z → A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="w-full md:w-auto flex gap-2">
            <Button variant={isSelectMode ? "secondary" : "outline"} onClick={toggleSelectMode}>
              {isSelectMode ? "Done" : "Select"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".ca,application/zip"
              onChange={handleImportChange}
              className="hidden"
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="h-4 w-4 mr-2" /> Import .ca
            </Button>
            {isSelectMode && (
              <Button
                variant="destructive"
                onClick={openBulkDelete}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Selected ({selectedIds.length})
              </Button>
            )}
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>
        </div>

        {/* Create Project Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="project-name">Project name</label>
                <Input
                  id="project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="New Wallpaper"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="root-width">Width (px)</label>
                  <Input
                    id="root-width"
                    type="number"
                    min={1}
                    value={rootWidth}
                    onChange={(e) => setRootWidth(Number(e.target.value))}
                    onKeyDown={handleKeyPress}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="root-height">Height (px)</label>
                  <Input
                    id="root-height"
                    type="number"
                    min={1}
                    value={rootHeight}
                    onChange={(e) => setRootHeight(Number(e.target.value))}
                    onKeyDown={handleKeyPress}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={createProjectFromDialog}
                disabled={!newProjectName.trim() || !Number.isFinite(rootWidth) || !Number.isFinite(rootHeight) || rootWidth <= 0 || rootHeight <= 0}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Projects List */
        }
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Your Projects ({filteredProjects.length}
            {query || dateFilter !== "all" ? ` of ${projectsArray.length}` : ""})
          </h2>
          
          {projectsArray.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects yet. Create your first project to get started!</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No projects match your search/filter.</p>
              {(query || dateFilter !== "all") && (
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateFilter("all")}>Reset date</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const isSelected = selectedIds.includes(project.id);
                const pv = previews[project.id];
                const doc = thumbDocs[project.id] ?? { meta: { width: pv?.width || project.width || 390, height: pv?.height || project.height || 844, background: pv?.bg || '#e5e7eb' }, layers: [] } as any;
                return (
                  <Card 
                    key={project.id} 
                    className={`relative ${isSelectMode && isSelected ? 'border-accent ring-2 ring-accent/30' : ''}`}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleSelection(project.id);
                      } else {
                        router.push(`/editor/${project.id}`);
                      }
                    }}
                  >
                    <CardContent className="px-4 py-3">
                      {/* Selection checkmark */}
                      {isSelectMode && (
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-full border flex items-center justify-center bg-background/70">
                          {isSelected && <Check className="h-4 w-4 text-accent" />}
                        </div>
                      )}
                      {/* Preview thumbnail square */}
                      <div className="mb-3 overflow-hidden rounded-md border bg-background">
                        <AspectRatio ratio={1}>
                          <ProjectThumb doc={doc} />
                        </AspectRatio>
                      </div>
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectMode) toggleSelection(project.id);
                            else router.push(`/editor/${project.id}`);
                          }}
                        >
                          <h3 className="font-medium block truncate" title={project.name}>
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Under-card actions */}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Rename project"
                          title="Rename"
                          onClick={(e) => { e.stopPropagation(); startEditing(project); }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label="Delete project"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); confirmDelete(project.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Rename Project Dialog */}
        <Dialog open={isRenameOpen} onOpenChange={(open) => { setIsRenameOpen(open); if (!open) { setEditingProjectId(null); setEditingName(""); } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
            </DialogHeader>
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') { setIsRenameOpen(false); setEditingProjectId(null); setEditingName(""); }
              }}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsRenameOpen(false); setEditingProjectId(null); setEditingName(""); }}>Cancel</Button>
              <Button onClick={saveEdit} disabled={!editingName.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const p = projectsArray.find(p => p.id === pendingDeleteId);
                  return (
                    <span>
                      This action cannot be undone. This will permanently delete
                      {" "}
                      <span className="font-medium">{p?.name ?? "this project"}</span>.
                    </span>
                  );
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (pendingDeleteId) {
                    deleteProject(pendingDeleteId);
                  }
                  setPendingDeleteId(null);
                  setIsDeleteOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Selected Delete Confirmation */}
        <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.length} selected?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. These projects will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsBulkDeleteOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={performBulkDelete}
                disabled={selectedIds.length === 0}
              >
                Delete Selected
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* accept tos or go away when signed out */}
        <AlertDialog open={isTosOpen && !isSignedIn}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Agree to Terms of Service</AlertDialogTitle>
              <AlertDialogDescription>
                Please review and accept our
                {" "}
                <Link href="/tos" className="underline" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>
                {" "}
                to use Projects while signed out. Your projects are stored locally on your device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsTosOpen(false)
                  router.push("/")
                }}
              >
                Back
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  try { localStorage.setItem("caplayground-tos-accepted", "true") } catch {}
                  setIsTosOpen(false)
                }}
              >
                I Agree              
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
