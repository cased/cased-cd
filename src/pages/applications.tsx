import {
  IconSearch,
  IconAdd,
  IconCodeBranch,
  IconCircleInfo,
  IconCircleCheck,
  IconArrowRightUp,
  IconCircleForward,
  IconGrid,
  IconClock3,
  IconChevronLeft,
  IconChevronRight,
} from "obra-icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useApplications,
  useRefreshApplication,
  useSyncApplication,
  applicationKeys,
  applicationsApi,
} from "@/services/applications";
import { CreateApplicationPanel } from "@/components/create-application-panel";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PageHeader } from "@/components/page-header";
import { getHealthIcon } from "@/lib/status-icons";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import type { Application } from "@/types/api";
import { useDebounce } from "@/hooks/useDebounce";

export function ApplicationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [continueToken, setContinueToken] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<Array<string | undefined>>([undefined]);

  const { data, isLoading, error, refetch } = useApplications({
    limit: pageSize,
    continue: continueToken,
  });
  const refreshMutation = useRefreshApplication();
  const syncMutation = useSyncApplication();

  // Prefetch next page for better UX
  useEffect(() => {
    const nextToken = data?.metadata?.continue;
    if (nextToken && !isLoading) {
      queryClient.prefetchQuery({
        queryKey: applicationKeys.list({ limit: pageSize, continue: nextToken }),
        queryFn: () => applicationsApi.getApplications({ limit: pageSize, continue: nextToken }),
      });
    }
  }, [data?.metadata?.continue, isLoading, pageSize, queryClient]);

  // Debounce search to avoid excessive filtering on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter applications based on debounced search
  const filteredApps =
    data?.items?.filter((app) =>
      app.metadata.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) || [];

  const handleRefresh = async (name: string) => {
    await refreshMutation.mutateAsync(name);
    // No need to manually refetch - React Query invalidation handles it
  };

  const handleSync = async (name: string) => {
    try {
      await syncMutation.mutateAsync({ name, prune: true });
      // No need to manually refetch - React Query invalidation + polling handles it
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  const handleNextPage = () => {
    const nextToken = data?.metadata?.continue;
    if (nextToken) {
      setPageHistory([...pageHistory, continueToken]);
      setContinueToken(nextToken);
    }
  };

  const handlePreviousPage = () => {
    if (pageHistory.length > 1) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      setPageHistory(newHistory);
      setContinueToken(newHistory[newHistory.length - 1]);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setContinueToken(undefined);
    setPageHistory([undefined]);
  };

  const currentPage = pageHistory.length;
  const hasNextPage = !!data?.metadata?.continue;
  const hasPreviousPage = pageHistory.length > 1;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Applications"
        description="Manage and monitor your deployments across all clusters"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        action={{
          label: 'New Application',
          onClick: () => setShowCreatePanel(true),
          icon: IconAdd,
        }}
      >
        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
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
      </PageHeader>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4">
          {/* Loading State */}
          {isLoading && (
            <LoadingSpinner message="Loading applications..." size="lg" />
          )}

          {/* Error State */}
          {error && (
            <ErrorAlert
              error={error}
              onRetry={() => refetch()}
              title="Failed to load applications"
              size="lg"
            />
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredApps.length === 0 && (
            <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
              <div className="max-w-md mx-auto">
                <div className="h-12 w-12 rounded bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-3">
                  <IconGrid size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                  {debouncedSearch
                    ? "No applications found"
                    : "No applications yet"}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                  {debouncedSearch
                    ? "Try adjusting your search or filters"
                    : "Create your first application to get started with GitOps deployments"}
                </p>
                {!debouncedSearch && (
                  <Button
                    variant="default"
                    onClick={() => setShowCreatePanel(true)}
                  >
                    <IconAdd size={16} />
                    Create Application
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Applications Grid */}
          {!isLoading && !error && filteredApps.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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
                className="rounded border-2 border-dashed border-neutral-300 dark:border-neutral-800 bg-transparent p-3 flex flex-col items-center justify-center text-center hover:border-neutral-400 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors cursor-pointer group"
                onClick={() => setShowCreatePanel(true)}
              >
                <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-2 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-800 transition-colors">
                  <IconAdd size={16} className="text-neutral-600 dark:text-neutral-400" />
                </div>
                <h3 className="text-sm font-medium text-black dark:text-white mb-0.5">
                  Create Application
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-500">
                  Deploy a new application to your cluster
                </p>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && !error && filteredApps.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Items per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  Page {currentPage}
                  {data?.metadata?.remainingItemCount !== undefined && (
                    <span className="ml-1">
                      ({data.metadata.remainingItemCount} more items)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!hasPreviousPage}
                >
                  <IconChevronLeft size={14} />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage}
                >
                  Next
                  <IconChevronRight size={14} />
                </Button>
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
  const operationPhase = app.status?.operationState?.phase;
  const isSyncing = operationPhase === "Running" || operationPhase === "Terminating";
  const { icon: HealthIcon, color: healthColor } = getHealthIcon(healthStatus);

  return (
    <div
      className="group rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-medium text-black dark:text-white truncate">
              {app.metadata.name}
            </h3>
            <IconArrowRightUp size={12} className="text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-600">
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
      <div className="flex items-center gap-1.5 mb-2">
        <Badge variant="outline" className="gap-1.5">
          <HealthIcon size={12} className={healthColor} />
          {healthStatus}
        </Badge>
        <Badge variant="outline" className="gap-1.5">
          <IconCircleCheck size={12} className={syncStatus === "Synced" ? "text-grass-11" : "text-amber-400"} />
          {syncStatus}
        </Badge>
        {isSyncing && (
          <Badge variant="outline" className="gap-1.5">
            <IconCircleForward size={12} className="animate-spin text-blue-400" />
            Syncing
          </Badge>
        )}
      </div>

      {/* Repository */}
      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 mb-2">
        <IconCodeBranch size={12} className="text-neutral-600" />
        <span className="truncate">{app.spec.source.repoURL}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-600">
          <IconClock3 size={11} />
          <span>
            {app.status?.reconciledAt
              ? formatDistanceToNow(new Date(app.status.reconciledAt), { addSuffix: true })
              : "Never synced"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isSyncing) {
                onSync(app.metadata.name);
              }
            }}
            disabled={isSyncing}
            className={`transition-colors ${
              isSyncing
                ? "text-blue-400 cursor-not-allowed"
                : "text-neutral-600 hover:text-blue-400 dark:hover:text-blue-400"
            }`}
            title={isSyncing ? "Syncing in progress..." : "Sync application"}
          >
            <IconCircleForward size={14} className={isSyncing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh(app.metadata.name);
            }}
            className="text-neutral-600 hover:text-white dark:hover:text-black transition-colors"
            title="Refresh application"
          >
            <IconCircleInfo size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
