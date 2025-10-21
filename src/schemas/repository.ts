import * as z from 'zod'

// Repository form validation schema
export const repositorySchema = z.object({
  type: z.enum(['git', 'helm', 'oci']),
  name: z.string().optional(),
  repo: z.string().min(1, 'Repository URL is required'),
  username: z.string().optional(),
  password: z.string().optional(),
  insecure: z.boolean(),
  project: z.string().optional(),
}).refine(
  (data) => {
    // If type is helm, name is required
    if (data.type === 'helm' && !data.name) {
      return false
    }
    return true
  },
  {
    message: 'Name is required for Helm repositories',
    path: ['name'],
  }
).refine(
  (data) => {
    // If username is provided, password must be provided too
    if (data.username && !data.password) {
      return false
    }
    // If password is provided, username must be provided too
    if (data.password && !data.username) {
      return false
    }
    return true
  },
  {
    message: 'Both username and password are required for authentication',
    path: ['password'],
  }
)

export type RepositoryFormValues = z.infer<typeof repositorySchema>
