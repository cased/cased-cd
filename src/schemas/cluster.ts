import * as z from 'zod'

// Cluster form validation schema
export const clusterSchema = z.object({
  name: z.string().min(1, 'Cluster name is required'),
  server: z.string().min(1, 'Server URL is required'),
  namespaces: z.string().optional(),
  bearerToken: z.string().optional(),
  insecure: z.boolean(),
  caData: z.string().optional(),
  certData: z.string().optional(),
  keyData: z.string().optional(),
})

export type ClusterFormValues = z.infer<typeof clusterSchema>
