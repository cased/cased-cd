import {
  IconSearch,
  IconAdd,
  IconCircleForward,
  IconGrid,
} from "obra-icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useApplications,
  useRefreshApplication,
  useSyncApplication,
} from "@/services/applications";
import { CreateApplicationPanel } from "@/components/create-application-panel";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ApplicationCard } from "@/components/-applications/application-card";
import { PageTitle } from "@/components/ui/page-title";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      app.metadata.name.toLowerCase().includes(searchQuery.toLowerCase()),
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <PageTitle>Applications</PageTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <IconCircleForward
                  size={16}
                  className={isLoading ? "animate-spin" : ""}
                />
                Refresh
              </Button>
              <Button
                variant="default"
                onClick={() => setShowCreatePanel(true)}
              >
                <IconAdd size={16} />
                New Application
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
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
                  {searchQuery
                    ? "No applications found"
                    : "No applications yet"}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : "Create your first application to get started with GitOps deployments"}
                </p>
                {!searchQuery && (
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
                />
              ))}

              {data?.items?.length === 0 && (
                <div
                  className="rounded border-2 border-dashed border-neutral-300 dark:border-neutral-800 bg-transparent p-3 flex flex-col items-center justify-center text-center hover:border-neutral-400 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors cursor-pointer group"
                  onClick={() => setShowCreatePanel(true)}
                >
                  <div className="h-8 w-8 rounded bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center mb-2 group-hover:bg-neutral-300 dark:group-hover:bg-neutral-800 transition-colors">
                    <IconAdd
                      size={16}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-black dark:text-white mb-0.5">
                    Create an application
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-500">
                    Deploy a new application to your cluster
                  </p>
                </div>
              )}
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
