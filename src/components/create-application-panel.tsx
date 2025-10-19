import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconClose, IconSpinnerBall, IconDocumentCode, IconText } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useCreateApplication } from '@/services/applications'
import type { Application } from '@/types/api'
import yaml from 'js-yaml'
import { applicationSchema, type ApplicationFormValues } from '@/schemas/application'

interface CreateApplicationPanelProps {
  onClose: () => void
  onSuccess?: () => void
}

export function CreateApplicationPanel({ onClose, onSuccess }: CreateApplicationPanelProps) {
  const createMutation = useCreateApplication()
  const [mode, setMode] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState('')
  const [yamlError, setYamlError] = useState<string | null>(null)

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      name: '',
      project: 'default',
      repoURL: '',
      path: '',
      targetRevision: 'HEAD',
      destinationServer: 'https://kubernetes.default.svc',
      destinationNamespace: 'default',
      createNamespace: false,
      prune: false,
      selfHeal: false,
    },
  })

  const onSubmit = async (values: ApplicationFormValues) => {
    try {
      // Build sync options array
      const syncOptions: string[] = []
      if (values.createNamespace) syncOptions.push('CreateNamespace=true')

      const application: Application = {
        metadata: {
          name: values.name,
          namespace: 'argocd',
        },
        spec: {
          project: values.project,
          source: {
            repoURL: values.repoURL,
            path: values.path || undefined,
            targetRevision: values.targetRevision,
          },
          destination: {
            server: values.destinationServer,
            namespace: values.destinationNamespace,
          },
          syncPolicy: {
            automated: (values.prune || values.selfHeal) ? {
              prune: values.prune,
              selfHeal: values.selfHeal,
            } : undefined,
            syncOptions: syncOptions.length > 0 ? syncOptions : undefined,
          },
        },
      }

      await createMutation.mutateAsync(application)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Failed to create application:', error)
    }
  }

  const handleModeSwitch = (newMode: 'form' | 'yaml') => {
    if (newMode === 'yaml' && mode === 'form') {
      // Convert current form values to YAML
      const values = form.getValues()
      const syncOptions: string[] = []
      if (values.createNamespace) syncOptions.push('CreateNamespace=true')

      const app = {
        metadata: {
          name: values.name,
          namespace: 'argocd',
        },
        spec: {
          project: values.project,
          source: {
            repoURL: values.repoURL,
            path: values.path || undefined,
            targetRevision: values.targetRevision,
          },
          destination: {
            server: values.destinationServer,
            namespace: values.destinationNamespace,
          },
          syncPolicy: {
            automated: (values.prune || values.selfHeal) ? {
              prune: values.prune,
              selfHeal: values.selfHeal,
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

        {/* Form Mode */}
        {mode === 'form' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
              {/* General */}
              <div>
                <h3 className="text-sm font-medium text-black dark:text-white mb-4">General</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="my-app" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <FormControl>
                          <Input placeholder="default" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Source */}
              <div>
                <h3 className="text-sm font-medium text-black dark:text-white mb-4">Source</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="repoURL"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repository URL *</FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/argoproj/argocd-example-apps" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Path</FormLabel>
                        <FormControl>
                          <Input placeholder="guestbook" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetRevision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revision</FormLabel>
                        <FormControl>
                          <Input placeholder="HEAD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Destination */}
              <div>
                <h3 className="text-sm font-medium text-black dark:text-white mb-4">Destination</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="destinationServer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cluster URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://kubernetes.default.svc" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destinationNamespace"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Namespace *</FormLabel>
                        <FormControl>
                          <Input placeholder="default" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      <FormField
                        control={form.control}
                        name="prune"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Auto-Prune: Delete resources no longer defined in Git
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="selfHeal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Self-Heal: Auto-correct drift when cluster state diverges
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="createNamespace"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Create Namespace: Auto-create destination namespace if it doesn't exist
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
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
          </Form>
        ) : (
          /* YAML Mode */
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
