import * as z from 'zod'

// Project form validation schema
export const projectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, 'Name must be lowercase alphanumeric with hyphens (RFC 1123)'),
  description: z.string().optional(),
  sourceRepos: z.string().optional(),
  destinations: z.string().optional(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
