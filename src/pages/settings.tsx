import {
  IconUsers,
  IconShieldCheck,
  IconKey,
  IconArrowRight,
  IconServer,
} from "obra-icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useAppearance } from "@/lib/theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { PageContent } from "@/components/ui/page-content";
import { useApplications } from "@/services/applications";
import { useCertificates } from "@/services/certificates";
import { useGPGKeys } from "@/services/gpgkeys";

export function SettingsPage() {
  const navigate = useNavigate();
  const { appearance, setAppearance } = useAppearance();
  const { data: appsData } = useApplications();
  const { data: certsData } = useCertificates();
  const { data: gpgData } = useGPGKeys();

  // Try to detect cluster info from applications
  const clusterInfo = appsData?.items?.[0]?.spec?.destination?.server ||
                      appsData?.items?.[0]?.spec?.destination?.name ||
                      'https://kubernetes.default.svc';

  const isLocalCluster = clusterInfo.includes('kubernetes.default.svc') ||
                         clusterInfo.includes('localhost') ||
                         clusterInfo.includes('127.0.0.1');

  const clusterName = isLocalCluster ? 'k3d-cased-cd (Local)' : 'Production Cluster';
  const appCount = appsData?.items?.length || 0;

  const settingsCards = [
    {
      title: "Accounts",
      description: "Manage user accounts and permissions",
      icon: IconUsers,
      count: appCount > 0 ? 1 : 0, // Show actual account count (for now just showing if we have data)
      path: "/accounts",
    },
    {
      title: "Certificates",
      description: "Manage TLS certificates",
      icon: IconShieldCheck,
      count: certsData?.items?.length || 0,
      path: "/certificates",
    },
    {
      title: "GPG Keys",
      description: "Configure GPG keys for commit verification",
      icon: IconKey,
      count: gpgData?.items?.length || 0,
      path: "/gpgkeys",
    },
  ];
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Settings"
        description="Configure repositories, clusters, projects, and access control"
      />

      {/* Content */}
      <PageContent>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {settingsCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  onClick={() => card.path && navigate({ to: card.path })}
                  className="group rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  {/* Icon */}
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-black mb-2">
                    <Icon size={16} className="text-black dark:text-white" />
                  </div>

                  {/* Content */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-sm text-black dark:text-white">
                        {card.title}
                      </h3>
                      <IconArrowRight
                        size={14}
                        className="text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {card.description}
                    </p>
                  </div>

                  {/* Count Badge */}
                  <div className="inline-flex items-center rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                    {card.count} {card.count === 1 ? "item" : "items"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full-bleed Divider */}
          <Separator className="my-6 -mx-4 w-[calc(100%+2rem)]" />

          {/* Cluster Info Section */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
              Cluster
            </h2>
            <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none">
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <IconServer size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm">{clusterName}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {appCount} {appCount === 1 ? 'application' : 'applications'} deployed
                    </CardDescription>
                  </div>
                  {!isLocalCluster && (
                    <div className="px-2 py-1 rounded text-xs font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      Production
                    </div>
                  )}
                  {isLocalCluster && (
                    <div className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                      Local
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-start gap-2">
                    <span className="font-medium">Endpoint:</span>
                    <span className="font-mono break-all">{clusterInfo}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* General Settings Section */}
          <div>
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">
              General
            </h2>
            <Card className="border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setAppearance("light")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      appearance === "light"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setAppearance("dark")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      appearance === "dark"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setAppearance("system")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      appearance === "system"
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    System
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

      </PageContent>
    </div>
  );
}
