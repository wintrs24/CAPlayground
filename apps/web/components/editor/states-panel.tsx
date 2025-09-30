"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Eye } from "lucide-react";
import { useEditor } from "./editor-context";
import { useState, useMemo } from "react";

export function StatesPanel() {
  const { doc, setActiveState } = useEditor();
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const states = current?.states ?? [];
  const active = current?.activeState || 'Base State';
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const allStates = useMemo(() => ['Base State', ...states], [states]);
  
  const stateOverrides = current?.stateOverrides || {};

  const overridesByLayer = useMemo(() => {
    const result: Record<string, Record<string, Array<{ keyPath: string; value: string | number }>>> = {};
    
    Object.entries(stateOverrides).forEach(([stateName, overrides]) => {
      overrides.forEach(override => {
        if (!result[override.targetId]) {
          result[override.targetId] = {};
        }
        if (!result[override.targetId][stateName]) {
          result[override.targetId][stateName] = [];
        }
        result[override.targetId][stateName].push({
          keyPath: override.keyPath,
          value: override.value
        });
      });
    });
    
    return result;
  }, [stateOverrides]);

  const findLayerName = (layerId: string): string => {
    const findInLayers = (layers: any[]): string | null => {
      for (const layer of layers) {
        if (layer.id === layerId) return layer.name || 'Unnamed Layer';
        if (layer.type === 'group' && layer.children) {
          const found = findInLayers(layer.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findInLayers(current?.layers || []) || 'Unknown Layer';
  };

  return (
    <Card className="p-0 gap-0 h-full flex flex-col" data-tour-id="states-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="font-medium">States</div>
        <Dialog open={viewAllOpen} onOpenChange={setViewAllOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Eye className="h-3.5 w-3.5 mr-1" />
              View All
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>State Transitions Overview</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* States Summary */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Available States</h3>
                <div className="flex flex-wrap gap-2">
                  {allStates.map(state => (
                    <Badge key={state} variant={state === active ? "default" : "secondary"}>
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* State Overrides by Layer */}
              {Object.keys(overridesByLayer).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">State Overrides by Layer</h3>
                  <div className="space-y-4">
                    {Object.entries(overridesByLayer).map(([layerId, stateData]) => (
                      <div key={layerId} className="border rounded-lg p-3 bg-muted/30">
                        <div className="font-medium text-sm mb-2">{findLayerName(layerId)}</div>
                        <div className="space-y-2">
                          {Object.entries(stateData).map(([stateName, overrides]) => (
                            <div key={stateName} className="text-xs">
                              <Badge variant="outline" className="mb-1">{stateName}</Badge>
                              <div className="ml-2 space-y-1">
                                {overrides.map((override, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                                    <code className="text-xs bg-muted px-1 rounded">{override.keyPath}</code>
                                    <ArrowRight className="h-3 w-3" />
                                    <span className="font-mono">{override.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(overridesByLayer).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">No state transitions configured yet.</p>
                  <p className="text-xs mt-1">Select a state and modify layer properties to create transitions.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-hidden p-3">
        <div className="text-sm rounded-lg border bg-card shadow-sm divide-y flex flex-col overflow-hidden">
          <div className="px-2 py-2 font-medium select-none bg-muted/30">Project States</div>
          <div className="flex-1 overflow-auto">
            {/* base state */}
            <button
              type="button"
              className={`w-full text-left px-2 py-2 flex items-center justify-between select-none ${active === 'Base State' ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
              onClick={() => setActiveState('Base State')}
            >
              <div className="truncate flex-1">Base State</div>
            </button>
            {states.map((s) => (
              <button
                key={s}
                type="button"
                className={`w-full text-left px-2 py-2 flex items-center justify-between ${active === s ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
                onClick={() => setActiveState(s as any)}
              >
                <div className="truncate flex-1">{s}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
