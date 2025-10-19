import { IconClose, IconFolder } from 'obra-icons-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateRepository } from '@/services/repositories'
import type { Repository } from '@/types/api'
import { repositorySchema, type RepositoryFormValues } from '@/schemas/repository'

interface CreateRepositoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateRepositoryPanel({ isOpen, onClose, onSuccess }: CreateRepositoryPanelProps) {
  const createMutation = useCreateRepository()

  const form = useForm<RepositoryFormValues>({
    resolver: zodResolver(repositorySchema),
    defaultValues: {
      type: 'git',
      name: '',
      repo: '',
      username: '',
      password: '',
      insecure: false,
      project: '',
    },
  })

  const onSubmit = async (values: RepositoryFormValues) => {
    try {
      const repository: Repository = {
        repo: values.repo,
        type: values.type,
        name: values.name || undefined,
        username: values.username || undefined,
        password: values.password || undefined,
        insecure: values.insecure,
        project: values.project || undefined,
      }

      await createMutation.mutateAsync(repository)
      onSuccess?.()
      onClose()

      // Reset form
      form.reset()
    } catch (error) {
      // Error is already handled by React Query and displayed via toast
      console.error('Failed to create repository:', error)
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
            <h2 className="text-lg font-semibold text-black dark:text-white">Connect Repository</h2>
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
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="git">Git</SelectItem>
                        <SelectItem value="helm">Helm</SelectItem>
                        <SelectItem value="oci">OCI</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Name {form.watch('type') === 'helm' ? '' : '(optional)'}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="my-repository" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Repository URL */}
              <FormField
                control={form.control}
                name="repo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository URL *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://github.com/org/repo.git" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project */}
              <FormField
                control={form.control}
                name="project"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="default" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Authentication */}
              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Authentication (optional)
                </h3>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="username" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="password or token"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insecure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Skip server verification (insecure)</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
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
            {createMutation.isPending ? 'Connecting...' : 'Connect Repository'}
          </Button>
        </div>
      </div>
    </div>
  )
}
