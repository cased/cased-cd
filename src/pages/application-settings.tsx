import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { IconArrowLeft } from 'obra-icons-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { useProjects } from '@/services/projects'
import { useRepositories } from '@/services/repositories'
import { useClusters } from '@/services/clusters'
import { useApplication, useUpdateApplicationSpec } from '@/services/applications'
import { toast } from 'sonner'

// Validation schema for high-priority settings
const settingsFormSchema = z.object({
  // General
  project: z.string().min(1, 'Project is required'),

  // Source
  repoURL: z.string().url('Must be a valid URL'),
  targetRevision: z.string().min(1, 'Target revision is required'),
  path: z.string().optional(),

  // Destination
  destinationServer: z.string().min(1, 'Destination cluster is required'),
  destinationNamespace: z.string().min(1, 'Destination namespace is required'),

  // Sync Policy
  autoSyncEnabled: z.boolean(),
  prune: z.boolean(),
  selfHeal: z.boolean(),
  allowEmpty: z.boolean(),

  // Advanced - Sync Options
  createNamespace: z.boolean(),
  pruneLast: z.boolean(),
  applyOutOfSyncOnly: z.boolean(),
  serverSideApply: z.boolean(),

  // Advanced - Retry Strategy
  retryEnabled: z.boolean(),
  retryLimit: z.number().min(1).optional(),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

export function ApplicationSettingsPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()

  // Fetch application data
  const { data: application, isLoading } = useApplication(name || '', !!name)

  // Fetch data for dropdowns
  const { data: projectsData } = useProjects()
  const { data: reposData } = useRepositories()
  const { data: clustersData } = useClusters()

  // Update mutation
  const updateSpecMutation = useUpdateApplicationSpec()

  // Initialize form with current application values
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      project: application?.spec.project || 'default',
      repoURL: application?.spec.source?.repoURL || '',
      targetRevision: application?.spec.source?.targetRevision || 'HEAD',
      path: application?.spec.source?.path || '',
      destinationServer: application?.spec.destination?.server || '',
      destinationNamespace: application?.spec.destination?.namespace || '',
      autoSyncEnabled: !!application?.spec.syncPolicy?.automated,
      prune: application?.spec.syncPolicy?.automated?.prune || false,
      selfHeal: application?.spec.syncPolicy?.automated?.selfHeal || false,
      allowEmpty: application?.spec.syncPolicy?.automated?.allowEmpty || false,
      // Sync options (check if they exist in syncOptions array)
      createNamespace: application?.spec.syncPolicy?.syncOptions?.includes('CreateNamespace=true') || false,
      pruneLast: application?.spec.syncPolicy?.syncOptions?.includes('PruneLast=true') || false,
      applyOutOfSyncOnly: application?.spec.syncPolicy?.syncOptions?.includes('ApplyOutOfSyncOnly=true') || false,
      serverSideApply: application?.spec.syncPolicy?.syncOptions?.includes('ServerSideApply=true') || false,
      // Retry strategy
      retryEnabled: !!application?.spec.syncPolicy?.retry,
      retryLimit: application?.spec.syncPolicy?.retry?.limit || 2,
    },
  })

  // Reset form when application data loads
  if (application && !form.formState.isDirty) {
    form.reset({
      project: application.spec.project || 'default',
      repoURL: application.spec.source?.repoURL || '',
      targetRevision: application.spec.source?.targetRevision || 'HEAD',
      path: application.spec.source?.path || '',
      destinationServer: application.spec.destination?.server || '',
      destinationNamespace: application.spec.destination?.namespace || '',
      autoSyncEnabled: !!application.spec.syncPolicy?.automated,
      prune: application.spec.syncPolicy?.automated?.prune || false,
      selfHeal: application.spec.syncPolicy?.automated?.selfHeal || false,
      allowEmpty: application.spec.syncPolicy?.automated?.allowEmpty || false,
      createNamespace: application.spec.syncPolicy?.syncOptions?.includes('CreateNamespace=true') || false,
      pruneLast: application.spec.syncPolicy?.syncOptions?.includes('PruneLast=true') || false,
      applyOutOfSyncOnly: application.spec.syncPolicy?.syncOptions?.includes('ApplyOutOfSyncOnly=true') || false,
      serverSideApply: application.spec.syncPolicy?.syncOptions?.includes('ServerSideApply=true') || false,
      retryEnabled: !!application.spec.syncPolicy?.retry,
      retryLimit: application.spec.syncPolicy?.retry?.limit || 2,
    })
  }

  // Watch auto-sync toggle to enable/disable prune and self-heal
  const autoSyncEnabled = form.watch('autoSyncEnabled')
  const retryEnabled = form.watch('retryEnabled')

  const onSubmit = async (values: SettingsFormValues) => {
    if (!application) return

    try {
      // Build sync options array
      const syncOptions: string[] = []
      if (values.createNamespace) syncOptions.push('CreateNamespace=true')
      if (values.pruneLast) syncOptions.push('PruneLast=true')
      if (values.applyOutOfSyncOnly) syncOptions.push('ApplyOutOfSyncOnly=true')
      if (values.serverSideApply) syncOptions.push('ServerSideApply=true')

      await updateSpecMutation.mutateAsync({
        name: application.metadata.name,
        spec: {
          ...application.spec,
          project: values.project,
          source: {
            ...application.spec.source,
            repoURL: values.repoURL,
            targetRevision: values.targetRevision,
            path: values.path,
          },
          destination: {
            ...application.spec.destination,
            server: values.destinationServer,
            namespace: values.destinationNamespace,
          },
          syncPolicy: {
            ...application.spec.syncPolicy,
            automated: values.autoSyncEnabled
              ? {
                  prune: values.prune,
                  selfHeal: values.selfHeal,
                  allowEmpty: values.allowEmpty,
                }
              : undefined,
            syncOptions: syncOptions.length > 0 ? syncOptions : undefined,
            retry: values.retryEnabled
              ? {
                  limit: values.retryLimit || 2,
                  backoff: {
                    duration: '5s',
                    factor: 2,
                    maxDuration: '3m0s',
                  },
                }
              : undefined,
          },
        },
      })

      toast.success('Settings updated', {
        description: 'Application settings have been saved successfully',
      })

      navigate(`/applications/${application.metadata.name}`)
    } catch (error) {
      toast.error('Failed to update settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const handleCancel = () => {
    navigate(`/applications/${application?.metadata.name}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-500">Application not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <IconArrowLeft size={16} />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-black dark:text-white">
                Settings: {application.metadata.name}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Configure core application settings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* General Settings */}
            <div className="space-y-4">
              <div className="pb-2">
                <h3 className="text-base font-semibold text-black dark:text-white">General</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Basic application configuration</p>
              </div>

              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectsData?.items?.map((project) => (
                          <SelectItem
                            key={project.metadata.name}
                            value={project.metadata.name}
                          >
                            {project.metadata.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The project that this application belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Source Settings */}
            <div className="space-y-4">
              <div className="pb-2">
                <h3 className="text-base font-semibold text-black dark:text-white">Source</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Repository and revision configuration</p>
              </div>

              <FormField
                control={form.control}
                name="repoURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a repository" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {reposData?.items?.map((repo) => (
                          <SelectItem key={repo.repo} value={repo.repo}>
                            {repo.name || repo.repo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The Git repository URL containing your application manifests
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetRevision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Revision</FormLabel>
                    <FormControl>
                      <Input placeholder="HEAD" {...field} />
                    </FormControl>
                    <FormDescription>
                      Git branch, tag, or commit SHA (e.g., HEAD, main, v1.0.0)
                    </FormDescription>
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
                      <Input placeholder="." {...field} />
                    </FormControl>
                    <FormDescription>
                      Path within the repository where manifests are located
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Destination Settings */}
            <div className="space-y-4">
              <div className="pb-2">
                <h3 className="text-base font-semibold text-black dark:text-white">Destination</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Deployment target cluster and namespace</p>
              </div>

              <FormField
                control={form.control}
                name="destinationServer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cluster</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cluster" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clustersData?.items?.map((cluster) => (
                          <SelectItem key={cluster.server} value={cluster.server}>
                            {cluster.name || cluster.server}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The Kubernetes cluster where the application will be deployed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationNamespace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Namespace</FormLabel>
                    <FormControl>
                      <Input placeholder="default" {...field} />
                    </FormControl>
                    <FormDescription>
                      The Kubernetes namespace for deployment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Sync Policy Settings */}
            <div className="space-y-4">
              <div className="pb-2">
                <h3 className="text-base font-semibold text-black dark:text-white">Sync Policy</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automated synchronization behavior</p>
              </div>

              <FormField
                control={form.control}
                name="autoSyncEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Automated Sync</FormLabel>
                      <FormDescription>
                        Automatically sync when Git repository changes are detected
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {autoSyncEnabled && (
                <>
                  <FormField
                    control={form.control}
                    name="prune"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Prune Resources</FormLabel>
                          <FormDescription>
                            Delete resources that are no longer defined in Git
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="selfHeal"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Self Heal</FormLabel>
                          <FormDescription>
                            Automatically correct drift when cluster state diverges from Git
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="allowEmpty"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow Empty</FormLabel>
                          <FormDescription>
                            Allow application to have zero resources
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* Advanced Settings */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border-none">
                <AccordionTrigger className="py-0 hover:no-underline">
                  <div className="pb-2">
                    <h3 className="text-base font-semibold text-black dark:text-white text-left">Advanced</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-left font-normal">Additional sync options and retry strategy</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Sync Options */}
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-black dark:text-white">Sync Options</p>

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
                        <FormLabel className="text-sm font-normal">Auto-Create Namespace</FormLabel>
                        <FormDescription>
                          Automatically create destination namespace if it doesn't exist
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pruneLast"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">Prune Last</FormLabel>
                        <FormDescription>
                          Prune resources as final step after all other resources are synced
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applyOutOfSyncOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">Apply Out-of-Sync Only</FormLabel>
                        <FormDescription>
                          Only apply resources that are out-of-sync
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serverSideApply"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">Server-Side Apply</FormLabel>
                        <FormDescription>
                          Use Kubernetes server-side apply instead of client-side
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Retry Strategy */}
              <div className="space-y-3 pt-2">
                <FormField
                  control={form.control}
                  name="retryEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Retry Strategy</FormLabel>
                        <FormDescription>
                          Automatically retry failed syncs with backoff
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {retryEnabled && (
                  <FormField
                    control={form.control}
                    name="retryLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Limit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of retry attempts (default: 2)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <Button type="submit" disabled={updateSpecMutation.isPending}>
                {updateSpecMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateSpecMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
