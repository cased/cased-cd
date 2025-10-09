import { IconBookOpen, IconBrandGithubFill, IconExternalLink, IconMessageCircle, IconDocument, IconRocketShip, IconSparkles } from 'obra-icons-react'

const resources = [
  {
    title: 'Official Documentation',
    description: 'Complete guide to Cased CD features and best practices',
    icon: IconBookOpen,
    href: 'https://argo-cd.readthedocs.io/',
  },
  {
    title: 'GitHub Repository',
    description: 'View source code, report issues, and contribute',
    icon: IconBrandGithubFill,
    href: 'https://github.com/argoproj/argo-cd',
  },
  {
    title: 'Getting Started',
    description: 'Quick start guide for new users',
    icon: IconRocketShip,
    href: 'https://argoproj.github.io/argo-cd/',
  },
  {
    title: 'Community Forum',
    description: 'Ask questions and connect with other users',
    icon: IconMessageCircle,
    href: 'https://github.com/argoproj/argo-cd/discussions',
  },
  {
    title: 'API Documentation',
    description: 'Explore the REST API reference',
    icon: IconDocument,
    href: '/swagger-ui',
  },
  {
    title: "What's New",
    description: 'Latest features and release notes',
    icon: IconSparkles,
    href: 'https://github.com/argoproj/argo-cd/releases',
  },
]

export function HelpPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">Documentation</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Get help, read the docs, and connect with the community
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-8">
          {/* Resources Grid */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {resources.map((resource) => {
              const Icon = resource.icon

              return (
                <a
                  key={resource.title}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  {/* Icon */}
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white dark:bg-black mb-4">
                    <Icon className="h-5 w-5 text-black dark:text-white" />
                  </div>

                  {/* Content */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-black dark:text-white">
                        {resource.title}
                      </h3>
                      <IconExternalLink className="h-3.5 w-3.5 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{resource.description}</p>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Quick Links */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 mb-8">
            <h2 className="font-medium text-black dark:text-white mb-4">Quick Links</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <a
                href="https://argo-cd.readthedocs.io/en/stable/user-guide/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group"
              >
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">User Guide</span>
                <IconExternalLink className="h-3 w-3 text-neutral-600 ml-auto" />
              </a>
              <a
                href="https://argo-cd.readthedocs.io/en/stable/operator-manual/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Operator Manual</span>
                <IconExternalLink className="h-3 w-3 text-neutral-600 ml-auto" />
              </a>
              <a
                href="https://argo-cd.readthedocs.io/en/stable/developer-guide/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group"
              >
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Developer Guide</span>
                <IconExternalLink className="h-3 w-3 text-neutral-600 ml-auto" />
              </a>
              <a
                href="https://argo-cd.readthedocs.io/en/stable/faq/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors group"
              >
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">FAQ</span>
                <IconExternalLink className="h-3 w-3 text-neutral-600 ml-auto" />
              </a>
            </div>
          </div>

          {/* Version Info */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-black dark:text-white mb-1">Cased CD Version</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">You're running the latest version</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-black dark:text-white font-mono">v2.12.0</div>
                <div className="text-xs text-neutral-500 mt-1">Released Oct 2024</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
