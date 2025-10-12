import { useState } from 'react'
import { IconClose, IconSpinnerBall, IconDocumentCode, IconText } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useCreateApplication } from '@/services/applications'
import type { Application } from '@/types/api'
import yaml from 'js-yaml'

interface CreateApplicationPanelProps {
  onClose: () => void
  onSuccess?: () => void
}

export function CreateApplicationPanel({ onClose, onSuccess }: CreateApplicationPanelProps) {
  const createMutation = useCreateApplication()
  const [mode, setMode] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState('')
  const [yamlError, setYamlError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    project: 'default',
    repoURL: '',
    path: '',
    targetRevision: 'HEAD',
    destinationServer: 'https://kubernetes.default.svc',
    destinationNamespace: 'default',
    // Advanced options
    createNamespace: false,
    prune: false,
    selfHeal: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Build sync options array
    const syncOptions: string[] = []
    if (formData.createNamespace) syncOptions.push('CreateNamespace=true')

    const application: Application = {
      metadata: {
        name: formData.name,
        namespace: 'argocd',
      },
      spec: {
        project: formData.project,
        source: {
          repoURL: formData.repoURL,
          path: formData.path,
          targetRevision: formData.targetRevision,
        },
        destination: {
          server: formData.destinationServer,
          namespace: formData.destinationNamespace,
        },
        syncPolicy: {
          automated: (formData.prune || formData.selfHeal) ? {
            prune: formData.prune,
            selfHeal: formData.selfHeal,
          } : undefined,
          syncOptions: syncOptions.length > 0 ? syncOptions : undefined,
        },
      },
    }

    try {
      await createMutation.mutateAsync(application)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to create application:', error)
    }
  }

  const handleModeSwitch = (newMode: 'form' | 'yaml') => {
    if (newMode === 'yaml' && mode === 'form') {
      // Build sync options array
      const syncOptions: string[] = []
      if (formData.createNamespace) syncOptions.push('CreateNamespace=true')

      // Convert form to YAML
      const app = {
        metadata: {
          name: formData.name,
          namespace: 'argocd',
        },
        spec: {
          project: formData.project,
          source: {
            repoURL: formData.repoURL,
            path: formData.path,
            targetRevision: formData.targetRevision,
          },
          destination: {
            server: formData.destinationServer,
            namespace: formData.destinationNamespace,
          },
          syncPolicy: {
            automated: (formData.prune || formData.selfHeal) ? {
              prune: formData.prune,
              selfHeal: formData.selfHeal,
            } : undefined,
            syncOptions: syncOptions.length > 0 ? syncOptions : undefined,
          },
        },
      }
      setYamlContent(yaml.dump(app))
    }
    setMode(newMode)
  }

  const handleYamlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setYamlError(null)

    try {
      const application = yaml.load(yamlContent) as Application

      // Validate required fields
      if (!application?.metadata?.name) {
        setYamlError('Application name is required in metadata.name')
        return
      }
      if (!application?.spec?.source?.repoURL) {
        setYamlError('Repository URL is required in spec.source.repoURL')
        return
      }
      if (!application?.spec?.destination?.namespace) {
        setYamlError('Destination namespace is required in spec.destination.namespace')
        return
      }

      await createMutation.mutateAsync(application)
      onSuccess?.()
      onClose()
    } catch (error) {
      if (error instanceof yaml.YAMLException) {
        setYamlError(`YAML parsing error: ${error.message}`)
      } else {
        setYamlError(error instanceof Error ? error.message : 'Failed to create application')
      }
      console.error('Failed to parse or create application:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-black dark:text-white">Create Application</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Deploy a new application to your cluster</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-1">
              <button
                type="button"
                onClick={() => handleModeSwitch('form')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === 'form'
                    ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <IconText size={14} />
                Form
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('yaml')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  mode === 'yaml'
                    ? 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <IconDocumentCode size={14} />
                YAML
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <IconClose size={16} />
            </Button>
          </div>
        </div>

        {/* Form */}
        {mode === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* General */}
            <div>
              <h3 className="text-sm font-medium text-black dark:text-white mb-4">General</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Application Name *
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="my-app"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Project
                  </label>
                  <Input
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    placeholder="default"
                  />
                </div>
              </div>
            </div>

            {/* Source */}
            <div>
              <h3 className="text-sm font-medium text-black dark:text-white mb-4">Source</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Repository URL *
                  </label>
                  <Input
                    required
                    value={formData.repoURL}
                    onChange={(e) => setFormData({ ...formData, repoURL: e.target.value })}
                    placeholder="https://github.com/argoproj/argocd-example-apps"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Path
                  </label>
                  <Input
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="guestbook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Revision
                  </label>
                  <Input
                    value={formData.targetRevision}
                    onChange={(e) => setFormData({ ...formData, targetRevision: e.target.value })}
                    placeholder="HEAD"
                  />
                </div>
              </div>
            </div>

            {/* Destination */}
            <div>
              <h3 className="text-sm font-medium text-black dark:text-white mb-4">Destination</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Cluster URL
                  </label>
                  <Input
                    value={formData.destinationServer}
                    onChange={(e) => setFormData({ ...formData, destinationServer: e.target.value })}
                    placeholder="https://kubernetes.default.svc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Namespace *
                  </label>
                  <Input
                    required
                    value={formData.destinationNamespace}
                    onChange={(e) => setFormData({ ...formData, destinationNamespace: e.target.value })}
                    placeholder="default"
                  />
                </div>
              </div>
            </div>

            {/* Advanced */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <h3 className="text-sm font-medium text-black dark:text-white text-left">Advanced</h3>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="prune"
                        checked={formData.prune}
                        onCheckedChange={(checked) => setFormData({ ...formData, prune: checked as boolean })}
                      />
                      <Label htmlFor="prune" className="text-sm font-normal cursor-pointer">
                        Auto-Prune: Delete resources no longer defined in Git
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="selfHeal"
                        checked={formData.selfHeal}
                        onCheckedChange={(checked) => setFormData({ ...formData, selfHeal: checked as boolean })}
                      />
                      <Label htmlFor="selfHeal" className="text-sm font-normal cursor-pointer">
                        Self-Heal: Auto-correct drift when cluster state diverges
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="createNamespace"
                        checked={formData.createNamespace}
                        onCheckedChange={(checked) => setFormData({ ...formData, createNamespace: checked as boolean })}
                      />
                      <Label htmlFor="createNamespace" className="text-sm font-normal cursor-pointer">
                        Create Namespace: Auto-create destination namespace if it doesn't exist
                      </Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                type="submit"
                variant="default"
                disabled={createMutation.isPending}
                className="gap-1"
              >
                {createMutation.isPending && <IconSpinnerBall size={16} className="animate-spin" />}
                {createMutation.isPending ? 'Creating...' : 'Create Application'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>

            {/* Error */}
            {createMutation.isError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create application'}
                </p>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleYamlSubmit} className="p-6 space-y-6">
            {/* YAML Editor */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Application Manifest
              </label>
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                className="w-full h-96 px-3 py-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-md font-mono text-sm text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-0 resize-none"
                placeholder="metadata:&#10;  name: my-app&#10;spec:&#10;  project: default&#10;  source:&#10;    repoURL: https://github.com/argoproj/argocd-example-apps&#10;    path: guestbook&#10;    targetRevision: HEAD&#10;  destination:&#10;    server: https://kubernetes.default.svc&#10;    namespace: default"
                spellCheck={false}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                type="submit"
                variant="default"
                disabled={createMutation.isPending}
                className="gap-1"
              >
                {createMutation.isPending && <IconSpinnerBall size={16} className="animate-spin" />}
                {createMutation.isPending ? 'Creating...' : 'Create Application'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>

            {/* Error */}
            {(yamlError || createMutation.isError) && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  {yamlError || (createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Failed to create application')}
                </p>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
