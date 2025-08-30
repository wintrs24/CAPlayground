"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EditorProvider } from "@/components/editor/editor-context";
import { MenuBar } from "@/components/editor/menu-bar";
import { LayersPanel } from "@/components/editor/layers-panel";
import { Inspector } from "@/components/editor/inspector";
import { CanvasPreview } from "@/components/editor/canvas-preview";

export default function EditorPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [meta, setMeta] = useState<{ id: string; name: string; width: number; height: number; background?: string } | null>(null);
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(340);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) {
      router.replace("/projects");
      return;
    }

    const loadProject = async () => {
      try {
        const listRaw = localStorage.getItem("caplayground-projects");
        const list = listRaw ? (JSON.parse(listRaw) as Array<{ id: string; name: string; width?: number; height?: number }>) : [];
        const p = list.find((x) => x.id === projectId);
        if (p) {
          setMeta({ id: p.id, name: p.name, width: p.width ?? 390, height: p.height ?? 844 });
          return;
        }
      } catch {
      }

      try {
        const injected = (globalThis as any).__NEXT_DATA__?.assetPrefix as string | undefined;
        const base = (injected || process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
        const res = await fetch(`${base}/templates/${projectId}.json`);
        if (res.ok) {
          const projectData = await res.json();
          const { project, root } = projectData;
          const meta = {
            id: project.id || projectId,
            name: project.name || 'Template',
            width: project.width || root?.size?.w || 390,
            height: project.height || root?.size?.h || 844,
            background: root?.backgroundColor,
          };
          setMeta(meta);

          const doc = {
            meta,
            layers: root?.type === 'group' && Array.isArray(root.children) ? root.children : root ? [root] : [],
            selectedId: null,
          };
          localStorage.setItem(`caplayground-project:${projectId}`, JSON.stringify(doc));

          return;
        }
      } catch (err) {
        console.error('Failed to fetch template', err);
      }

      router.replace("/projects");
    };

    loadProject();
  }, [projectId, router]);

  if (!projectId || !meta) return null;

  return (
    <EditorProvider projectId={projectId} initialMeta={meta}>
      <div className="flex flex-col h-[calc(100vh)]" ref={containerRef}>
        <MenuBar
          projectId={projectId}
          showLeft={showLeft}
          showRight={showRight}
          toggleLeft={() => setShowLeft((v) => !v)}
          toggleRight={() => setShowRight((v) => !v)}
        />
        <div className="flex-1 px-4 py-4 overflow-hidden">
          <div className="h-full w-full flex gap-0">
            {showLeft && (
              <>
                <div className="min-h-0 flex-shrink-0" style={{ width: leftWidth }}>
                  <LayersPanel />
                </div>
                <div
                  className="relative w-2 mx-0 h-full self-stretch cursor-col-resize flex-shrink-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const start = leftWidth;
                    const onMove = (ev: MouseEvent) => {
                      const dx = ev.clientX - startX;
                      const next = Math.max(240, Math.min(560, start + dx));
                      setLeftWidth(next);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  aria-label="Resize left column"
                />
              </>
            )}

            <div className="min-h-0 flex-1">
              <CanvasPreview />
            </div>

            {showRight && (
              <>
                <div
                  className="relative w-2 mx-0 h-full self-stretch cursor-col-resize flex-shrink-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startX = e.clientX;
                    const start = rightWidth;
                    const onMove = (ev: MouseEvent) => {
                      const dx = startX - ev.clientX;
                      const next = Math.max(260, Math.min(560, start + dx));
                      setRightWidth(next);
                    };
                    const onUp = () => {
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  aria-label="Resize right column"
                />

                <div className="min-h-0 flex-shrink-0" style={{ width: rightWidth }}>
                  <Inspector />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
