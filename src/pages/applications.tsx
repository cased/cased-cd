import {
  IconSearch,
  IconAdd,
  IconCodeBranch,
  IconCircleInfo,
  IconCircleWarning,
  IconCircleCheck,
  IconClock3,
  IconArrowRightUp,
  IconCircleForward,
  IconGrid,
} from "obra-icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useApplications,
  useRefreshApplication,
  useSyncApplication,
} from "@/services/applications";
import { CreateApplicationPanel } from "@/components/create-application-panel";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Application } from "@/types/api";

const healthIcons = {
  Healthy: { icon: IconCircleCheck, color: "text-emerald-400" },
  Progressing: { icon: IconClock3, color: "text-blue-400" },
  Degraded: { icon: IconCircleWarning, color: "text-amber-400" },
  Suspended: { icon: IconCircleWarning, color: "text-neutral-400" },
  Missing: { icon: IconCircleWarning, color: "text-red-400" },
  Unknown: { icon: IconCircleInfo, color: "text-neutral-500" },
};

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const { data, isLoading, error, refetch } = useApplications();
  const refreshMutation = useRefreshApplication();
  const syncMutation = useSyncApplication();

  // Filter applications based on search
  const filteredApps =
    data?.items?.filter((app) =>
      app.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleRefresh = async (name: string) => {
    await refreshMutation.mutateAsync(name);
    refetch();
  };

  const handleSync = async (name: string) => {
    try {
      await syncMutation.mutateAsync({ name, prune: true });
      refetch();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">
                Applications
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Manage and monitor your deployments across all clusters
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <IconCircleForward
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="default"
                className="gap-2"
                onClick={() => setShowCreatePanel(true)}
              >
                <IconAdd className="h-4 w-4" />
                New Application
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search applications..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              All Clusters
            </Button>
            <Button variant="outline" size="sm">
              All Namespaces
            </Button>
            <Button variant="outline" size="sm">
              All States
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <IconCircleForward className="h-8 w-8 animate-spin text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  Loading applications...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
              <div className="flex items-start gap-3">
                <IconCircleWarning className="h-5 w-5 text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-400 mb-1">
                    Failed to load applications
                  </h3>
                  <p className="text-sm text-red-400/80 mb-3">
                    {error instanceof Error
                      ? error.message
                      : "Unable to connect to ArgoCD API"}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredApps.length === 0 && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                  <IconGrid className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="font-medium text-black dark:text-white mb-2">
                  {searchQuery
                    ? "No applications found"
                    : "No applications yet"}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : "Create your first application to get started with GitOps deployments"}
                </p>
                {!searchQuery && (
                  <Button
                    variant="default"
                    onClick={() => setShowCreatePanel(true)}
                  >
                    <IconAdd className="h-4 w-4 mr-2" />
                    Create Application
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Applications Grid */}
          {!isLoading && !error && filteredApps.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredApps.map((app) => (
                <ApplicationCard
                  key={app.metadata.name}
                  app={app}
                  onRefresh={handleRefresh}
                  onSync={handleSync}
                  onClick={() => navigate(`/applications/${app.metadata.name}`)}
                />
              ))}

              {/* Add New Card */}
              <div
                className="rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-800 bg-transparent p-5 flex flex-col items-center justify-center text-center hover:border-neutral-400 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors cursor-pointer group"
                onClick={() => setShowCreatePanel(true)}
              >
                <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-3 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-800 transition-colors">
                  <IconAdd className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <h3 className="font-medium text-black dark:text-white mb-1">
                  Create Application
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-500">
                  Deploy a new application to your cluster
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Application Panel */}
      {showCreatePanel && (
        <CreateApplicationPanel
          onClose={() => setShowCreatePanel(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

// Application Card Component
function ApplicationCard({
  app,
  onRefresh,
  onSync,
  onClick,
}: {
  app: Application;
  onRefresh: (name: string) => void;
  onSync: (name: string) => void;
  onClick: () => void;
}) {
  const healthStatus = app.status?.health?.status || "Unknown";
  const syncStatus = app.status?.sync?.status || "Unknown";
  const HealthIcon = healthIcons[healthStatus]?.icon || IconCircleInfo;
  const healthColor = healthIcons[healthStatus]?.color || "text-neutral-500";

  return (
    <div
      className="group rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-black dark:text-white truncate">
              {app.metadata.name}
            </h3>
            <IconArrowRightUp className="h-3.5 w-3.5 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-600">
            <span className="truncate">
              {app.spec.destination.namespace || "default"}
            </span>
            <span>·</span>
            <span className="truncate">
              {app.spec.destination.server ||
                app.spec.destination.name ||
                "unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant={
            healthStatus === "Healthy"
              ? "default"
              : healthStatus === "Degraded"
              ? "destructive"
              : "secondary"
          }
          className="gap-1.5"
        >
          <HealthIcon className={`h-3 w-3 ${healthColor}`} />
          {healthStatus}
        </Badge>
        <Badge variant={syncStatus === "Synced" ? "default" : "destructive"}>
          {syncStatus}
        </Badge>
      </div>

      {/* Repository */}
      <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mb-3">
        <IconCodeBranch className="h-3.5 w-3.5 text-neutral-600" />
        <span className="truncate">{app.spec.source.repoURL}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
        <span className="text-xs text-neutral-500 dark:text-neutral-600">
          {app.status?.reconciledAt
            ? `Synced ${new Date(app.status.reconciledAt).toLocaleString()}`
            : "Never synced"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSync(app.metadata.name);
            }}
            className="text-neutral-600 hover:text-blue-400 dark:hover:text-blue-400 transition-colors"
            title="Sync application"
          >
            <IconCircleForward className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh(app.metadata.name);
            }}
            className="text-neutral-600 hover:text-white dark:hover:text-black transition-colors"
            title="Refresh application"
          >
            <IconCircleInfo className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
