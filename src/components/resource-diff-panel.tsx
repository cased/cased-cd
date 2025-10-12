import { useState } from "react";
import { DiffViewer } from "./diff-viewer";
import { Badge } from "@/components/ui/badge";
import { IconCircleCheck, IconCircleWarning, IconCircleForward } from "obra-icons-react";
import type { ManagedResource } from "@/types/api";

interface ResourceDiffPanelProps {
  resources: ManagedResource[];
  resourceStatuses?: Array<{
    kind: string;
    name: string;
    namespace?: string;
    group?: string;
    status: string; // "Synced" or "OutOfSync"
  }>;
  isLoading?: boolean;
}

export function ResourceDiffPanel({ resources, resourceStatuses, isLoading }: ResourceDiffPanelProps) {
  const [selectedResource, setSelectedResource] = useState<ManagedResource | null>(
    resources.length > 0 ? resources[0] : null
  );

  // Get sync status for selected resource
  const selectedResourceStatus = selectedResource ? resourceStatuses?.find(
    (rs) =>
      rs.kind === selectedResource.kind &&
      rs.name === selectedResource.name &&
      (rs.namespace || '') === (selectedResource.namespace || '') &&
      (rs.group || '') === (selectedResource.group || '')
  ) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <IconCircleForward size={20} className="animate-spin" />
          <span>Loading resources...</span>
        </div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <IconCircleCheck size={48} className="text-grass-11 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            No resources to compare
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Resource List Sidebar */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-black">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-black dark:text-white">
            Resources ({resources.length})
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Select a resource to view diff
          </p>
        </div>
        <div className="flex-1 overflow-auto">
          {resources.map((resource, index) => {
            const isSelected =
              selectedResource &&
              selectedResource.name === resource.name &&
              selectedResource.kind === resource.kind &&
              selectedResource.namespace === resource.namespace;

            // Get ArgoCD's sync status for this resource
            const resourceStatus = resourceStatuses?.find(
              (rs) =>
                rs.kind === resource.kind &&
                rs.name === resource.name &&
                (rs.namespace || '') === (resource.namespace || '') &&
                (rs.group || '') === (resource.group || '')
            );

            const hasChanges = resourceStatus?.status === "OutOfSync";

            return (
              <button
                key={`${resource.kind}-${resource.namespace}-${resource.name}-${index}`}
                onClick={() => setSelectedResource(resource)}
                className={`
                  w-full text-left px-4 py-3 border-b border-neutral-200 dark:border-neutral-800
                  transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-950
                  ${
                    isSelected
                      ? "bg-neutral-100 dark:bg-neutral-900"
                      : "bg-white dark:bg-black"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-black dark:text-white truncate">
                      {resource.name}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                      {resource.kind}
                      {resource.namespace && ` · ${resource.namespace}`}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {hasChanges ? (
                      <Badge variant="outline" className="gap-1">
                        <IconCircleWarning size={10} className="text-amber-400" />
                        <span className="text-[10px]">Modified</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <IconCircleCheck size={10} className="text-grass-11" />
                        <span className="text-[10px]">Synced</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 min-w-0">
        {selectedResource ? (
          <DiffViewer
            resource={selectedResource}
            isSynced={selectedResourceStatus?.status === "Synced"}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600 dark:text-neutral-400">
            Select a resource to view diff
          </div>
        )}
      </div>
    </div>
  );
}
