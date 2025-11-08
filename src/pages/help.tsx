import { useState } from 'react'
import {
  IconBookOpen,
  IconBrandGithubFill,
  IconExternalLink,
  IconGrid,
  IconRotate,
  IconClock3,
  IconCodeBranch,
  IconCircleInfo,
  IconChevronDown,
  IconChevronRight,
  IconCheck,
  IconShieldCheck,
} from 'obra-icons-react'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'

interface GuideSection {
  id: string
  title: string
  icon: typeof IconGrid
  content: React.ReactNode
}

const guides: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Cased CD',
    icon: IconBookOpen,
    content: (
      <div className="space-y-3 text-sm">
        <p className="text-neutral-700 dark:text-neutral-300">
          Welcome to Cased CD! This modern interface for ArgoCD makes managing your GitOps deployments easier and more intuitive.
        </p>
        <div className="space-y-2">
          <h4 className="font-medium text-black dark:text-white">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-neutral-700 dark:text-neutral-300 ml-2">
            <li><strong>Resource Tree View</strong> - Visualize your application's Kubernetes resources in a hierarchical tree</li>
            <li><strong>Network Graph</strong> - See how your services, deployments, and pods are connected</li>
            <li><strong>Deployment History</strong> - Track all deployments with easy rollback capabilities</li>
            <li><strong>Live Status Updates</strong> - Real-time sync status and health monitoring</li>
            <li><strong>Dark Mode</strong> - Easy on the eyes for long sessions</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'create-application',
    title: 'Creating Your First Application',
    icon: IconGrid,
    content: (
      <div className="space-y-3 text-sm">
        <ol className="list-decimal list-inside space-y-2 text-neutral-700 dark:text-neutral-300">
          <li>Click <strong>Applications</strong> in the sidebar</li>
          <li>Click the <strong>Create</strong> button in the top right</li>
          <li>Fill in the application details:
            <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
              <li><strong>Name</strong> - Unique identifier for your app</li>
              <li><strong>Project</strong> - ArgoCD project (usually "default")</li>
              <li><strong>Repository URL</strong> - Git repository containing your manifests</li>
              <li><strong>Path</strong> - Path within the repo to your manifests</li>
              <li><strong>Cluster</strong> - Target Kubernetes cluster</li>
              <li><strong>Namespace</strong> - Target namespace</li>
            </ul>
          </li>
          <li>Click <strong>Create</strong> to deploy</li>
        </ol>
        <div className="rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 mt-3">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <strong>Tip:</strong> Cased CD will automatically detect if your repo contains Helm charts, Kustomize overlays, or raw YAML manifests.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'sync-application',
    title: 'Syncing Applications',
    icon: IconRotate,
    content: (
      <div className="space-y-3 text-sm">
        <p className="text-neutral-700 dark:text-neutral-300">
          Syncing deploys the latest changes from your Git repository to your Kubernetes cluster.
        </p>
        <div className="space-y-2">
          <h4 className="font-medium text-black dark:text-white">Manual Sync:</h4>
          <ol className="list-decimal list-inside space-y-1 text-neutral-700 dark:text-neutral-300 ml-2">
            <li>Open your application</li>
            <li>Click the <strong>Sync</strong> button in the header</li>
            <li>Review the resources that will be synchronized</li>
            <li>Click <strong>Synchronize</strong> to apply changes</li>
          </ol>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-black dark:text-white">Auto-Sync:</h4>
          <p className="text-neutral-700 dark:text-neutral-300">
            Toggle the <strong>Auto-Sync</strong> switch in the application header to automatically deploy Git changes.
          </p>
        </div>
        <div className="rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
          <p className="text-xs text-amber-900 dark:text-amber-200">
            <strong>Note:</strong> Auto-sync will continuously monitor your Git repository and deploy changes automatically. Be careful in production!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'understanding-views',
    title: 'Understanding Different Views',
    icon: IconCodeBranch,
    content: (
      <div className="space-y-3 text-sm">
        <p className="text-neutral-700 dark:text-neutral-300">
          Cased CD offers multiple ways to visualize your application:
        </p>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-black dark:text-white mb-1">Tree View</h4>
            <p className="text-neutral-700 dark:text-neutral-300">
              Hierarchical view showing parent-child relationships (e.g., Deployment → ReplicaSet → Pods). Groups resources by type with collapsible sections.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-black dark:text-white mb-1">Network Graph</h4>
            <p className="text-neutral-700 dark:text-neutral-300">
              Visual network diagram showing how services connect to deployments and pods. Great for understanding service mesh and traffic flow.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-black dark:text-white mb-1">List View</h4>
            <p className="text-neutral-700 dark:text-neutral-300">
              Flat list of all resources with sync status, health, and quick actions. Best for finding specific resources quickly.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-black dark:text-white mb-1">Pods View</h4>
            <p className="text-neutral-700 dark:text-neutral-300">
              Focus view showing only pods with their status, age, and restart counts. Perfect for troubleshooting deployments.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-black dark:text-white mb-1">Diff View</h4>
            <p className="text-neutral-700 dark:text-neutral-300">
              Side-by-side comparison of Git (desired state) vs cluster (live state). Shows exactly what will change on sync.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-black dark:text-white mb-1">History View</h4>
            <p className="text-neutral-700 dark:text-neutral-300">
              Timeline of all deployments with commit messages and rollback capability. Track who deployed what and when.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'deployment-history',
    title: 'Using Deployment History & Rollback',
    icon: IconClock3,
    content: (
      <div className="space-y-3 text-sm">
        <p className="text-neutral-700 dark:text-neutral-300">
          Every sync creates a history entry, allowing you to track changes and rollback if needed.
        </p>
        <div className="space-y-2">
          <h4 className="font-medium text-black dark:text-white">Viewing History:</h4>
          <ol className="list-decimal list-inside space-y-1 text-neutral-700 dark:text-neutral-300 ml-2">
            <li>Open your application</li>
            <li>Click the <strong>History</strong> tab</li>
            <li>See all deployments with timestamps and commit messages</li>
            <li>The <strong>Current</strong> badge shows the active deployment</li>
          </ol>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-black dark:text-white">Rolling Back:</h4>
          <ol className="list-decimal list-inside space-y-1 text-neutral-700 dark:text-neutral-300 ml-2">
            <li>Find the deployment you want to restore</li>
            <li>Click the <strong>Rollback</strong> button</li>
            <li>Confirm the rollback operation</li>
            <li>Cased CD will sync your cluster to that previous state</li>
          </ol>
        </div>
        <div className="rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3">
          <p className="text-xs text-red-900 dark:text-red-200">
            <strong>Warning:</strong> Rollback immediately deploys the previous version. Consider reviewing the diff first if you have auto-sync enabled.
          </p>
        </div>
      </div>
    ),
  },
]

const resources = [
  {
    title: 'Cased CD on GitHub',
    description: 'Report issues, view source code, and contribute',
    icon: IconBrandGithubFill,
    href: 'https://github.com/cased/cased-cd',
  },
  {
    title: 'ArgoCD Documentation',
    description: 'Deep dive into ArgoCD concepts and best practices',
    icon: IconBookOpen,
    href: 'https://argo-cd.readthedocs.io/',
  },
  {
    title: 'Learn About Cased',
    description: 'Discover Cased\'s security and compliance platform',
    icon: IconCircleInfo,
    href: 'https://cased.com',
  },
]

export function HelpPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started')

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Help & Documentation"
        description="Learn how to use Cased CD and master GitOps deployments"
      />

      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-6 max-w-4xl mx-auto">
          {/* Getting Started Guides */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">Quick Start Guides</h2>
            <div className="space-y-2">
              {guides.map((guide) => {
                const Icon = guide.icon
                const isExpanded = expandedSection === guide.id

                return (
                  <div
                    key={guide.id}
                    className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : guide.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                    >
                      <div className="h-8 w-8 rounded bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-sm text-black dark:text-white">{guide.title}</h3>
                      </div>
                      {isExpanded ? (
                        <IconChevronDown size={16} className="text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                      ) : (
                        <IconChevronRight size={16} className="text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900/50">
                        {guide.content}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resources */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-black dark:text-white mb-3">External Resources</h2>
            <div className="grid gap-2 md:grid-cols-3">
              {resources.map((resource) => {
                const Icon = resource.icon
                return (
                  <a
                    key={resource.title}
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded bg-white dark:bg-black mb-2">
                      <Icon size={16} className="text-black dark:text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <h3 className="font-medium text-sm text-black dark:text-white">{resource.title}</h3>
                        <IconExternalLink
                          size={12}
                          className="text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{resource.description}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Version Info */}
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm text-black dark:text-white mb-1 flex items-center gap-2">
                  <IconCheck size={16} className="text-green-600 dark:text-green-400" />
                  You're using Cased CD Community Edition
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  A modern UI for ArgoCD
                </p>
                <a
                  href="https://cased.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn more about Cased
                  <IconExternalLink size={10} />
                </a>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-black dark:text-white font-mono">v0.2.12</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Latest</div>
              </div>
            </div>
          </div>

          {/* Enterprise Upsell */}
          <div className="mt-4 rounded border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <IconShieldCheck size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-black dark:text-white mb-1">
                    Upgrade to Cased CD Enterprise
                  </h3>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-3">
                    Get advanced features for teams managing production deployments at scale
                  </p>
                  <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300 mb-3">
                    <li className="flex items-center gap-2">
                      <IconCheck size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span><strong>RBAC Management</strong> - Granular per-app permissions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <IconCheck size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span><strong>SSO Integration</strong> - OIDC/SAML authentication</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <IconCheck size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span><strong>Audit Logging</strong> - Complete deployment history</span>
                    </li>
                  </ul>
                  <a
                    href="https://cased.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      View Enterprise Features
                    </Button>
                  </a>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}
