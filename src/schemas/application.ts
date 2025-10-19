import * as z from 'zod'

// Application form validation schema
export const applicationSchema = z.object({
  name: z.string().min(1, 'Application name is required'),
  project: z.string().min(1, 'Project is required'),
  repoURL: z.string().min(1, 'Repository URL is required'),
  path: z.string().optional(),
  targetRevision: z.string().min(1, 'Target revision is required'),
  destinationServer: z.string().min(1, 'Cluster URL is required'),
  destinationNamespace: z.string().min(1, 'Namespace is required'),
  createNamespace: z.boolean(),
  prune: z.boolean(),
  selfHeal: z.boolean(),
})

export type ApplicationFormValues = z.infer<typeof applicationSchema>
