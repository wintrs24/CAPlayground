"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useEditor } from "./editor-context";

export function StatesPanel() {
  const { doc, addState, renameState, deleteState } = useEditor();
  const states = doc?.states ?? [];
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>("");

  const startEdit = (name: string) => {
    setEditingName(name);
    setTempName(name);
  };

  const commitEdit = () => {
    if (!editingName) return;
    const next = tempName.trim();
    if (next && next !== editingName) renameState(editingName, next);
    setEditingName(null);
    setTempName("");
  };

  return (
    <Card className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">States</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2">
              <Plus className="h-4 w-4 mr-1" /> Add State
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => addState()}>New State</DropdownMenuItem>
            <DropdownMenuItem onClick={() => addState("Locked")}>Locked</DropdownMenuItem>
            <DropdownMenuItem onClick={() => addState("Unlock")}>Unlock</DropdownMenuItem>
            <DropdownMenuItem onClick={() => addState("Sleep")}>Sleep</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="text-sm rounded border bg-muted/30 divide-y overflow-hidden">
        <div className="px-2 py-2 font-medium select-none">Project States</div>
        <div className="max-h-64 overflow-auto">
          {/* base state */}
          <div className="px-2 py-2 flex items-center justify-between bg-muted/20 select-none">
            <div className="truncate flex-1">Base State</div>
            <div className="flex items-center gap-1 ml-2 opacity-40">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {states.length === 0 && (
            <div className="px-2 py-2 text-muted-foreground">No additional states</div>
          )}
          {states.map((s) => (
            <div key={s} className="px-2 py-2 flex items-center justify-between hover:bg-muted/50">
              {editingName === s ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') { setEditingName(null); setTempName(""); }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={commitEdit}>Save</Button>
                </div>
              ) : (
                <div className="truncate flex-1">{s}</div>
              )}
              <div className="flex items-center gap-1 ml-2">
                {editingName !== s && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    aria-label="Rename state"
                    onClick={() => startEdit(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  aria-label="Delete state"
                  onClick={() => deleteState(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
