import { useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { Button } from "@/components/ui/button";
import { IconCode, IconMenu } from "obra-icons-react";
import type { ManagedResource } from "@/types/api";

interface DiffViewerProps {
  resource: ManagedResource;
}

export function DiffViewer({ resource }: DiffViewerProps) {
  const [splitView, setSplitView] = useState(true);

  // Get the old (live) and new (target) states
  const oldValue = resource.liveState || "";
  const newValue = resource.targetState || "";

  // If both are empty or identical, show a message
  if (!oldValue && !newValue) {
    return (
      <div className="flex items-center justify-center p-8 text-neutral-600 dark:text-neutral-400">
        No diff available for this resource
      </div>
    );
  }

  if (oldValue === newValue) {
    return (
      <div className="flex items-center justify-center p-8 text-grass-11">
        Resource is in sync - no differences detected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="flex items-center gap-2">
          <IconCode size={16} className="text-neutral-600 dark:text-neutral-400" />
          <span className="text-sm font-medium text-black dark:text-white">
            {resource.kind}/{resource.name}
          </span>
          {resource.namespace && (
            <span className="text-xs text-neutral-500 dark:text-neutral-600">
              ({resource.namespace})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={splitView ? "default" : "outline"}
            size="sm"
            onClick={() => setSplitView(true)}
          >
            <IconMenu size={14} />
            Split
          </Button>
          <Button
            variant={!splitView ? "default" : "outline"}
            size="sm"
            onClick={() => setSplitView(false)}
          >
            <IconCode size={14} />
            Unified
          </Button>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 overflow-auto [&_.diff-viewer]:min-h-full">
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={splitView}
          compareMethod={DiffMethod.WORDS}
          leftTitle={<span className="text-xs font-medium">Live State (Cluster)</span>}
          rightTitle={<span className="text-xs font-medium">Target State (Git)</span>}
          useDarkTheme={
            document.documentElement.classList.contains("dark") ||
            document.body.classList.contains("dark")
          }
          styles={{
            variables: {
              dark: {
                diffViewerBackground: "#000000",
                diffViewerColor: "#e5e5e5",
                addedBackground: "#0d3a26",
                addedColor: "#a6e3a1",
                removedBackground: "#3a0d0d",
                removedColor: "#f38ba8",
                wordAddedBackground: "#1a5c3a",
                wordRemovedBackground: "#5c1a1a",
                addedGutterBackground: "#0d3a26",
                removedGutterBackground: "#3a0d0d",
                gutterBackground: "#0a0a0a",
                gutterBackgroundDark: "#000000",
                highlightBackground: "#1a1a1a",
                highlightGutterBackground: "#1a1a1a",
              },
              light: {
                diffViewerBackground: "#ffffff",
                diffViewerColor: "#262626",
                addedBackground: "#d1fae5",
                addedColor: "#065f46",
                removedBackground: "#fee2e2",
                removedColor: "#991b1b",
                wordAddedBackground: "#86efac",
                wordRemovedBackground: "#fca5a5",
                addedGutterBackground: "#d1fae5",
                removedGutterBackground: "#fee2e2",
                gutterBackground: "#f5f5f5",
                gutterBackgroundDark: "#e5e5e5",
                highlightBackground: "#f5f5f5",
                highlightGutterBackground: "#e5e5e5",
              },
            },
            line: {
              padding: "4px 8px",
              fontSize: "11px",
              lineHeight: "1.5",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },
            gutter: {
              padding: "4px 8px",
              fontSize: "11px",
              lineHeight: "1.5",
            },
          }}
        />
      </div>
    </div>
  );
}
