import { IconClose, IconFolder } from 'obra-icons-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCreateProject } from '@/services/projects'
import type { Project } from '@/types/api'
import { toast } from 'sonner'
import { projectSchema, type ProjectFormValues } from '@/schemas/project'

interface CreateProjectPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateProjectPanel({ isOpen, onClose, onSuccess }: CreateProjectPanelProps) {
  const createMutation = useCreateProject()

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      sourceRepos: '',
      destinations: '',
    },
  })

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      // Parse source repos (comma or newline separated)
      const sourceRepos = (values.sourceRepos || '')
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Parse destinations (format: server/namespace or name/namespace, one per line)
      const destinations = (values.destinations || '')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(dest => {
          const [serverOrName, namespace] = dest.split('/')
          return {
            server: serverOrName.startsWith('http') ? serverOrName : undefined,
            name: !serverOrName.startsWith('http') ? serverOrName : undefined,
            namespace: namespace || undefined,
          }
        })

      const project: Project = {
        metadata: {
          name: values.name,
        },
        spec: {
          sourceRepos: sourceRepos.length > 0 ? sourceRepos : ['*'], // Default to all if empty
          destinations: destinations.length > 0 ? destinations : [{ server: '*', namespace: '*' }], // Default to all if empty
        },
      }

      await createMutation.mutateAsync(project)
      toast.success('Project created', {
        description: `Successfully created project "${values.name}"`,
      })
      onSuccess?.()
      onClose()

      // Reset form
      form.reset()
    } catch (error) {
      console.error('Create project failed:', error)
      toast.error('Failed to create project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-black border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <IconFolder size={16} className="text-neutral-600 dark:text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Create Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="my-project" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be lowercase alphanumeric with hyphens (e.g., my-project)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of this project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source Repositories */}
              <FormField
                control={form.control}
                name="sourceRepos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Repositories (optional)</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        placeholder="https://github.com/org/repo1&#10;https://github.com/org/repo2&#10;&#10;Leave empty to allow all repositories (*)"
                        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono min-h-[120px]"
                      />
                    </FormControl>
                    <FormDescription>
                      One repository URL per line. Use * to allow all repositories.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Destinations */}
              <FormField
                control={form.control}
                name="destinations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destinations (optional)</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        placeholder="in-cluster/default&#10;in-cluster/production&#10;https://kubernetes.default.svc/staging&#10;&#10;Leave empty to allow all clusters and namespaces (*/*)"
                        className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono min-h-[120px]"
                      />
                    </FormControl>
                    <FormDescription>
                      Format: server/namespace or name/namespace. One per line.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Info Box */}
              <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-400">
                  Projects provide logical grouping and RBAC boundaries for applications. After creating a project, you can configure additional settings like resource whitelists, roles, and sync windows.
                </p>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </div>
    </div>
  )
}
