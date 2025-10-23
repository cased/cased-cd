import {
  IconCircleCheck,
  IconCodeBranch,
  IconClock3,
  IconCircleForward,
  IconCircleInfo,
} from "obra-icons-react";
import { Badge } from "@/components/ui/badge";
import { getHealthIcon } from "@/lib/status-icons";
import { formatDistanceToNow } from "date-fns";
import type { Application } from "@/types/api";
import { Link } from "react-router-dom";

interface ApplicationCardProps {
  app: Application;
  onRefresh: (name: string) => void;
  onSync: (name: string) => void;
}

export function ApplicationCard({
  app,
  onRefresh,
  onSync,
}: ApplicationCardProps) {
  const healthStatus = app.status?.health?.status || "Unknown";
  const syncStatus = app.status?.sync?.status || "Unknown";
  const operationPhase = app.status?.operationState?.phase;
  const isSyncing =
    operationPhase === "Running" || operationPhase === "Terminating";
  const { icon: HealthIcon, color: healthColor } = getHealthIcon(healthStatus);

  return (
    <Link
      to={`/applications/${app.metadata.name}`}
      className="group rounded- border border-border bg-card transition-colors hover:bg-accent block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 px-3 pt-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-medium text-card-foreground truncate">
              {app.metadata.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
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

        {/* Status Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Badge variant="outline" className="gap-1.5">
            <HealthIcon size={12} className={healthColor} />
            {healthStatus}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <IconCircleCheck
              size={12}
              className={
                syncStatus === "Synced" ? "text-grass-11" : "text-warning"
              }
            />
            {syncStatus}
          </Badge>
          {isSyncing && (
            <Badge variant="outline" className="gap-1.5">
              <IconCircleForward
                size={12}
                className="animate-spin text-blue-400"
              />
              Syncing
            </Badge>
          )}
        </div>
      </div>

      {/* Repository */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2 px-3">
        <IconCodeBranch size={12} className="text-muted-foreground" />
        <span className="truncate">{app.spec.source.repoURL}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border px-3 pb-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <IconClock3 size={14} />
          <span>
            {app.status?.reconciledAt
              ? formatDistanceToNow(new Date(app.status.reconciledAt), {
                  addSuffix: true,
                })
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
                : "text-muted-foreground hover:text-blue-400"
            }`}
            title={isSyncing ? "Syncing in progress..." : "Sync application"}
          >
            <IconCircleForward
              size={14}
              className={isSyncing ? "animate-spin" : ""}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRefresh(app.metadata.name);
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh application"
          >
            <IconCircleInfo size={14} />
          </button>
        </div>
      </div>
    </Link>
  );
}
