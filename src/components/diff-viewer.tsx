import { useState } from "react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { Button } from "@/components/ui/button";
import { IconCode, IconMenu, IconCircleCheck } from "obra-icons-react";
import yaml from "js-yaml";
import type { ManagedResource } from "@/types/api";

interface DiffViewerProps {
  resource: ManagedResource;
  isSynced?: boolean; // ArgoCD's determination of sync status
}

// Helper to convert JSON string to formatted YAML
function jsonToYaml(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    return yaml.dump(parsed, { indent: 2, lineWidth: -1 });
  } catch {
    // If it's already YAML or can't parse, return as-is
    return jsonString;
  }
}

export function DiffViewer({ resource, isSynced = false }: DiffViewerProps) {
  const [splitView, setSplitView] = useState(true);

  // Use normalizedLiveState for diff display (removes K8s runtime metadata)
  // Fall back to liveState if normalized not available
  const liveStateRaw = resource.normalizedLiveState || resource.liveState || "";
  const targetStateRaw = resource.targetState || "";

  // If both are empty, show a message
  if (!liveStateRaw && !targetStateRaw) {
    return (
      <div className="flex items-center justify-center p-8 text-neutral-600 dark:text-neutral-400">
        No diff available for this resource
      </div>
    );
  }

  // If ArgoCD says it's synced, trust that and don't show a diff
  if (isSynced) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <IconCircleCheck size={48} className="text-grass-11 mb-4" />
        <h3 className="text-base font-medium text-black dark:text-white mb-2">
          Resource is in sync
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md">
          ArgoCD has determined this resource matches the desired state.
        </p>
      </div>
    );
  }

  // Convert JSON strings to YAML for better readability
  const oldValue = jsonToYaml(liveStateRaw);
  const newValue = jsonToYaml(targetStateRaw);

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
