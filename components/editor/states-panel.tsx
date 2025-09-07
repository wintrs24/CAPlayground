"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEditor } from "./editor-context";

export function StatesPanel() {
  const { doc } = useEditor();
  const states = doc?.states ?? [];

  return (
    <Card className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">States</div>
      </div>

      <div className="text-sm rounded border bg-muted/30 divide-y overflow-hidden">
        <div className="px-2 py-2 font-medium select-none">Project States</div>
        <div className="max-h-64 overflow-auto">
          {/* base state */}
          <div className="px-2 py-2 flex items-center justify-between bg-muted/20 select-none">
            <div className="truncate flex-1">Base State</div>
          </div>
          {states.map((s) => (
            <div key={s} className="px-2 py-2">
              <div className="truncate flex-1">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
