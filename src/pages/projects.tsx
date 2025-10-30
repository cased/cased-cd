import {
  IconFolder,
  IconAdd,
  IconDelete,
  IconCircleForward,
} from "obra-icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

        {/* Projects Table */}
        {!isLoading && !error && data?.items && data.items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Project</TableHead>
                <TableHead className="w-[200px]">Sources</TableHead>
                <TableHead className="w-[200px]">Destinations</TableHead>
                <TableHead className="w-[100px]">Roles</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((project) => {
                const isDefaultProject = project.metadata.name === "default";
                const sourceReposCount = project.spec.sourceRepos?.length || 0;
                const destinationsCount =
                  project.spec.destinations?.length || 0;
                const rolesCount = project.spec.roles?.length || 0;

                return (
                  <TableRow key={project.metadata.name}>
                    {/* Project Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-black dark:text-white truncate">
                          {project.metadata.name}
                        </span>
                        {isDefaultProject && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Sources */}
                    <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                      {sourceReposCount === 0 ? (
                        <span>All sources</span>
                      ) : sourceReposCount <= 2 ? (
                        <span className="font-mono">
                          {project.spec.sourceRepos?.join(", ")}
                        </span>
                      ) : (
                        <span>
                          {sourceReposCount} source
                          {sourceReposCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </TableCell>

                    {/* Destinations */}
                    <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                      {destinationsCount === 0 ? (
                        <span>All destinations</span>
                      ) : destinationsCount <= 2 ? (
                        <span>
                          {project.spec.destinations
                            ?.map(
                              (d) =>
                                `${d.name || d.server}${d.namespace ? `/${d.namespace}` : ""}`,
                            )
                            .join(", ")}
                        </span>
                      ) : (
                        <span>
                          {destinationsCount} destination
                          {destinationsCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </TableCell>

                    {/* Roles */}
                    <TableCell className="text-xs text-neutral-600 dark:text-neutral-400">
                      {rolesCount > 0 ? (
                        <span>
                          {rolesCount} role{rolesCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-600">
                          None
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
