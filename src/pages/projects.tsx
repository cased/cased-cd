import {
  IconFolder,
  IconAdd,
  IconDelete,
  IconCircleForward,
} from "obra-icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjects, useDeleteProject } from "@/services/projects";
import { CreateProjectPanel } from "@/components/create-project-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { PageContent } from "@/components/ui/page-content";
import { useDeleteHandler } from "@/hooks/useDeleteHandler";
import { useState } from "react";
import type { Project } from "@/types/api";

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const deleteMutation = useDeleteProject();
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  const deleteHandler = useDeleteHandler<Project>({
    deleteFn: deleteMutation.mutateAsync,
    resourceType: "Project",
    getId: (project) => project.metadata.name,
    getDisplayName: (project) => project.metadata.name,
    onSuccess: () => refetch(),
    isDeleting: deleteMutation.isPending,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Projects"
        description="Organize applications and control access with project-level permissions"
        actions={
          <>
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
            <Button variant="default" onClick={() => setShowCreatePanel(true)}>
              <IconAdd size={16} />
              Create Project
            </Button>
          </>
        }
      />

      {/* Content */}
      <PageContent>
        {/* Loading State */}
        {isLoading && <LoadingSpinner message="Loading projects..." />}

        {/* Error State */}
        {error && (
          <ErrorAlert
            error={error}
            onRetry={() => refetch()}
            title="Failed to load projects"
            size="sm"
          />
        )}

        {/* Projects List */}
        {!isLoading && !error && data?.items && data.items.length > 0 && (
          <div className="space-y-2">
              {data.items.map((project) => {
                const isDefaultProject = project.metadata.name === "default";
                const sourceReposCount = project.spec.sourceRepos?.length || 0;
                const destinationsCount =
                  project.spec.destinations?.length || 0;
                const rolesCount = project.spec.roles?.length || 0;

                return (
                  <div
                    key={project.metadata.name}
                    className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded bg-white dark:bg-black flex items-center justify-center">
                            <IconFolder
                              size={16}
                              className="text-black dark:text-white"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-medium text-sm text-black dark:text-white">
                                {project.metadata.name}
                              </h3>
                              {isDefaultProject && (
                                <Badge variant="secondary">Default</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                              {sourceReposCount === 0 ? (
                                <span>All sources</span>
                              ) : (
                                <span>
                                  {sourceReposCount} source
                                  {sourceReposCount !== 1 ? "s" : ""}
                                </span>
                              )}
                              <span>•</span>
                              {destinationsCount === 0 ? (
                                <span>All destinations</span>
                              ) : (
                                <span>
                                  {destinationsCount} destination
                                  {destinationsCount !== 1 ? "s" : ""}
                                </span>
                              )}
                              {rolesCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {rolesCount} role
                                    {rolesCount !== 1 ? "s" : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="pl-10 space-y-1.5">
                          {/* Source Repos */}
                          {sourceReposCount > 0 && sourceReposCount <= 3 && (
                            <div className="text-xs">
                              <span className="text-neutral-500 dark:text-neutral-500">
                                Sources:
                              </span>{" "}
                              <span className="text-neutral-600 dark:text-neutral-400 font-mono">
                                {project.spec.sourceRepos?.join(", ")}
                              </span>
                            </div>
                          )}
                          {sourceReposCount > 3 && (
                            <div className="text-xs">
                              <span className="text-neutral-500 dark:text-neutral-500">
                                Sources:
                              </span>{" "}
                              <span className="text-neutral-600 dark:text-neutral-400 font-mono">
                                {project.spec.sourceRepos
                                  ?.slice(0, 2)
                                  .join(", ")}{" "}
                                and {sourceReposCount - 2} more
                              </span>
                            </div>
                          )}

                          {/* Destinations */}
                          {destinationsCount > 0 && destinationsCount <= 3 && (
                            <div className="text-xs">
                              <span className="text-neutral-500 dark:text-neutral-500">
                                Destinations:
                              </span>{" "}
                              <span className="text-neutral-600 dark:text-neutral-400">
                                {project.spec.destinations
                                  ?.map(
                                    (d) =>
                                      `${d.name || d.server}${d.namespace ? `/${d.namespace}` : ""}`,
                                  )
                                  .join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isDefaultProject && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            deleteHandler.handleDeleteClick(project)
                          }
                          className="text-red-400 hover:text-red-300"
                        >
                          <IconDelete size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {/* Empty State */}
        {!isLoading &&
          !error &&
          (!data?.items || data.items.length === 0) && (
            <EmptyState
              icon={IconFolder}
              title="No projects yet"
              description="Create your first project to organize applications and control access"
              action={{
                label: "Create Project",
                onClick: () => setShowCreatePanel(true),
                icon: IconAdd,
              }}
            />
          )}
      </PageContent>

      {/* Create Project Panel */}
      <CreateProjectPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onSuccess={() => refetch()}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteHandler.dialogOpen}
        onOpenChange={deleteHandler.setDialogOpen}
        title="Delete Project"
        description={`Are you sure you want to delete the project "${deleteHandler.resourceToDelete?.metadata.name}"? This action cannot be undone and may affect applications in this project.`}
        confirmText="Delete"
        resourceName={deleteHandler.resourceToDelete?.metadata.name || ""}
        resourceType="project"
        onConfirm={deleteHandler.handleDeleteConfirm}
        isLoading={deleteHandler.isDeleting}
      />
    </div>
  );
}
