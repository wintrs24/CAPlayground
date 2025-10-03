"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useParams, useRouter } from "next/navigation";
import { EditorProvider } from "@/components/editor/editor-context";
import { MenuBar } from "@/components/editor/menu-bar";
import { LayersPanel } from "@/components/editor/layers-panel";
import { StatesPanel } from "@/components/editor/states-panel";
import { Inspector } from "@/components/editor/inspector";
import { CanvasPreview } from "@/components/editor/canvas-preview";
import EditorOnboarding from "@/components/editor/onboarding";
import { getProject } from "@/lib/idb";

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;
  const [meta, setMeta] = useState<{ id: string; name: string; width: number; height: number; background?: string } | null>(null);
  const [leftWidth, setLeftWidth] = useLocalStorage<number>("caplay_panel_left_width", 320);
  const [rightWidth, setRightWidth] = useLocalStorage<number>("caplay_panel_right_width", 400);
  const [statesHeight, setStatesHeight] = useLocalStorage<number>("caplay_panel_states_height", 350);
  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mobile portrait detection
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px) and (orientation: portrait)');
    const apply = () => setIsMobilePortrait(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  // Mobile bottom panels switching (two visible at a time)
  type PanelKey = 'layers' | 'states' | 'inspector';
  const [visiblePanels, setVisiblePanels] = useState<PanelKey[]>(['layers', 'inspector']);
  const [lastClicked, setLastClicked] = useState<PanelKey>('inspector');
  // Mobile: adjustable space between canvas (top) and panels (bottom)
  const [mobilePanelsHeight, setMobilePanelsHeight] = useLocalStorage<number>("caplay_mobile_panels_height", 300);
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const selectPanel = (k: PanelKey) => {
    setVisiblePanels((prev) => {
      if (prev.includes(k)) {
        setLastClicked(k);
        return prev;
      }
      // Evict the least recently clicked panel (the one not equal to lastClicked)
      const keep = prev.includes(lastClicked) ? lastClicked : prev[1];
      const next: PanelKey[] = [keep, k];
      setLastClicked(k);
      return next;
    });
  };

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const p = await getProject(projectId);
        if (!p) {
          router.replace("/projects");
          return;
        }
        setMeta({ id: p.id, name: p.name, width: p.width ?? 390, height: p.height ?? 844 });
      } catch {
        router.replace("/projects");
      }
    })();
  }, [projectId]);

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
          leftWidth={leftWidth}
          rightWidth={rightWidth}
          setLeftWidth={setLeftWidth}
          setRightWidth={setRightWidth}
          setStatesHeight={setStatesHeight}
        />
        <div className="flex-1 px-4 py-4 overflow-hidden">
          {isMobilePortrait ? (
            // Mobile portrait layout: Canvas always on top, two panels below with a switcher
            <div className="h-full w-full flex flex-col gap-3" ref={mobileContainerRef}>
              <div className="min-h-0" style={{ flex: `1 1 auto` }}>
                <CanvasPreview />
              </div>
              {/* Resize handle between canvas and panels (mobile) */}
              <div
                ref={handleRef}
                className="w-full h-3 flex-shrink-0 relative"
                style={{ touchAction: 'none' }}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize panels"
                onPointerDown={(e) => {
                  e.preventDefault();
                  const startY = e.clientY;
                  const startH = mobilePanelsHeight;
                  const MIN_H = 140;
                  const MAX_H = 0; // will compute relative to container below in move
                  const onMove = (ev: PointerEvent) => {
                    const containerEl = mobileContainerRef.current;
                    const total = containerEl ? containerEl.getBoundingClientRect().height : 0;
                    const dy = ev.clientY - startY;
                    let next = startH - dy;
                    const maxPanels = total > 0 ? Math.max(MIN_H, Math.min(total - 160, total - 160)) : undefined; // keep some space for canvas
                    if (total > 0) {
                      const cap = Math.max(MIN_H, Math.min(total - 160, maxPanels ?? (total - 160)));
                      next = Math.max(MIN_H, Math.min(cap, next));
                    } else {
                      next = Math.max(MIN_H, next);
                    }
                    setMobilePanelsHeight(next);
                  };
                  const onUp = () => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                  };
                  window.addEventListener('pointermove', onMove, { passive: false });
                  window.addEventListener('pointerup', onUp, { passive: false });
                }}
              >
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 flex items-center">
                  <div className="h-1.5 w-10 rounded-full bg-muted" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  className={`px-3 py-1 rounded text-sm border ${visiblePanels.includes('layers') ? 'bg-accent text-accent-foreground' : 'bg-background'}`}
                  onClick={() => selectPanel('layers')}
                >Layers</button>
                <button
                  className={`px-3 py-1 rounded text-sm border ${visiblePanels.includes('states') ? 'bg-accent text-accent-foreground' : 'bg-background'}`}
                  onClick={() => selectPanel('states')}
                >States</button>
                <button
                  className={`px-3 py-1 rounded text-sm border ${visiblePanels.includes('inspector') ? 'bg-accent text-accent-foreground' : 'bg-background'}`}
                  onClick={() => selectPanel('inspector')}
                >Inspector</button>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0" style={{ height: Math.max(140, mobilePanelsHeight) }}>
                {visiblePanels.map((k) => (
                  <div key={k} className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full overflow-auto">
                      {k === 'layers' && <LayersPanel />}
                      {k === 'states' && <StatesPanel />}
                      {k === 'inspector' && <Inspector />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Desktop/tablet layout: original side panels
            <div className="h-full w-full flex gap-0">
              {showLeft && (
                <>
                  <div className="min-h-0 flex-shrink-0" style={{ width: leftWidth }}>
                    <div ref={leftPaneRef} className="h-full min-h-0 flex flex-col pr-1">
                      <div className="flex-1 min-h-0 overflow-hidden" style={{ flex: '1 1 auto' }}>
                        <LayersPanel />
                      </div>
                      <div
                        className="relative w-full h-2 cursor-row-resize flex-shrink-0"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startY = e.clientY;
                          const start = statesHeight;
                          const RESIZER = 2;
                          const MIN_TOP = 140;
                          const MIN_BOTTOM = 120;
                          const paneEl = leftPaneRef.current;
                          const total = paneEl ? paneEl.getBoundingClientRect().height : 0;
                          const onMove = (ev: MouseEvent) => {
                            const dy = ev.clientY - startY;
                            let next = start - dy;
                            if (total > 0) {
                              const maxBottom = Math.max(MIN_BOTTOM, total - MIN_TOP - RESIZER);
                              next = Math.max(MIN_BOTTOM, Math.min(maxBottom, next));
                            } else {
                              next = Math.max(MIN_BOTTOM, next);
                            }
                            setStatesHeight(next);
                          };
                          const onUp = () => {
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                        aria-label="Resize layers/states panels"
                      />
                      <div className="min-h-[120px] overflow-auto" style={{ flex: `0 0 ${statesHeight}px` }}>
                        <StatesPanel />
                      </div>
                    </div>
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
          )}
        </div>
        {/* Onboarding overlay (portal) */}
        <EditorOnboarding showLeft={showLeft} showRight={showRight} />
      </div>
    </EditorProvider>
  );
}
