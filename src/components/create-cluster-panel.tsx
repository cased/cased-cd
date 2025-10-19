import { IconClose, IconServer } from 'obra-icons-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useCreateCluster } from '@/services/clusters'
import type { Cluster } from '@/types/api'

interface CreateClusterPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// Validation schema
const clusterSchema = z.object({
  name: z.string().min(1, 'Cluster name is required'),
  server: z.string().min(1, 'Server URL is required'),
  namespaces: z.string().optional(),
  bearerToken: z.string().optional(),
  insecure: z.boolean(),
  caData: z.string().optional(),
  certData: z.string().optional(),
  keyData: z.string().optional(),
})

type ClusterFormValues = z.infer<typeof clusterSchema>

export function CreateClusterPanel({ isOpen, onClose, onSuccess }: CreateClusterPanelProps) {
  const createMutation = useCreateCluster()

  const form = useForm<ClusterFormValues>({
    resolver: zodResolver(clusterSchema),
    defaultValues: {
      name: '',
      server: '',
      namespaces: '',
      bearerToken: '',
      insecure: false,
      caData: '',
      certData: '',
      keyData: '',
    },
  })

  const onSubmit = async (values: ClusterFormValues) => {
    try {
      const cluster: Cluster = {
        name: values.name,
        server: values.server,
        config: {
          bearerToken: values.bearerToken || undefined,
          tlsClientConfig: {
            insecure: values.insecure,
            caData: values.caData || undefined,
            certData: values.certData || undefined,
            keyData: values.keyData || undefined,
          },
        },
      }

      await createMutation.mutateAsync(cluster)
      onSuccess?.()
      onClose()

      // Reset form
      form.reset()
    } catch (error) {
      // Error is already handled by React Query and displayed via toast
      console.error('Failed to create cluster:', error)
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
              <IconServer size={16} className="text-neutral-600 dark:text-neutral-400" />
            </div>
            <h2 className="text-lg font-semibold text-black dark:text-white">Add Cluster</h2>
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
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="production-cluster" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Server URL */}
              <FormField
                control={form.control}
                name="server"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Server URL *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://kubernetes.default.svc" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use "https://kubernetes.default.svc" for in-cluster access
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Namespaces */}
              <FormField
                control={form.control}
                name="namespaces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Namespaces (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="default, kube-system, production" {...field} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated list. Leave empty for all namespaces.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Authentication */}
              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Authentication
                </h3>

                <FormField
                  control={form.control}
                  name="bearerToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bearer Token (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
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

              {/* TLS Configuration */}
              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  TLS Configuration (optional)
                </h3>

                <FormField
                  control={form.control}
                  name="caData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CA Certificate Data</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                          className="w-full h-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Certificate Data</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                          className="w-full h-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keyData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Key Data</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                          className="w-full h-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-sm text-black dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
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
            {createMutation.isPending ? 'Adding...' : 'Add Cluster'}
          </Button>
        </div>
      </div>
    </div>
  )
}
