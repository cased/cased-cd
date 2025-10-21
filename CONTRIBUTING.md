# Contributing to Cased CD

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd cased-cd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Choose your development mode**

   **Option A: Mock API (fastest for UI development)**
   ```bash
   # Terminal 1: Start mock API server
   npm run dev:mock

   # Terminal 2: Start frontend
   npm run dev
   ```

   **Option B: Real ArgoCD (for integration testing)**
   ```bash
   # Make sure Docker Desktop is running

   # Setup local ArgoCD cluster
   ./scripts/setup-argocd.sh

   # Start frontend with real API
   npm run dev:real
   ```

## Code Style

- Use TypeScript for all new code
- Follow the existing code structure
- Use 2 spaces for indentation
- Run `npm run lint` before committing

## Component Guidelines

- Place reusable UI components in `src/components/ui/`
- Place feature-specific components in `src/components/`
- **Use shadcn/ui components** from `@/components/ui/*` (install with `npx shadcn@latest add <component>`)
- **NEVER use Radix UI directly** - always use the shadcn wrapper
- **Use Obra Icons** from `obra-icons-react` (NEVER use lucide-react)
- Style with Tailwind CSS v4 utility classes

## Styling Guidelines

- Use Tailwind utility classes
- Follow the flat design aesthetic (borders, no shadows)
- Ensure dark/light mode support using `dark:` prefix
- Keep the Vercel-inspired minimal design

## Git Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/        # Base UI components
│   └── ...        # Feature components
├── pages/         # Page components
├── lib/           # Utilities and helpers
├── services/      # API services
└── types/         # TypeScript types
```

## Testing Changes

- Test with both mock API and real ArgoCD
- Verify dark/light mode works correctly
- Test responsive design
- Check for console errors

## Pull Request Process

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style guidelines
3. **Add tests** if you're adding new functionality
4. **Update documentation** if you're changing behavior
5. **Run linting and tests**:
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run build  # Ensure it builds successfully
   ```
6. **Commit with descriptive messages** following Conventional Commits format
7. **Push to your fork** and submit a pull request to `main`
8. **Respond to review feedback** promptly

### PR Title Format

Use Conventional Commits format:
- `feat: add application sync status indicator`
- `fix: resolve resource tree rendering bug`
- `docs: update deployment guide`
- `chore: upgrade dependencies`
- `refactor: simplify API client error handling`

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- **Be respectful** of differing viewpoints and experiences
- **Give and accept constructive feedback** gracefully
- **Focus on what is best** for the community
- **Show empathy** towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or derogatory comments
- Trolling, insulting comments, or personal attacks
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

- Place tests alongside the code in `*.test.ts` or `*.test.tsx` files
- Use React Testing Library for component tests
- Mock API calls using MSW (Mock Service Worker)
- Aim for meaningful tests, not just coverage numbers

Example:
```typescript
import { render, screen } from '@testing-library/react'
import { ApplicationCard } from './application-card'

describe('ApplicationCard', () => {
  it('displays application name and status', () => {
    const app = {
      metadata: { name: 'test-app' },
      status: { health: { status: 'Healthy' } }
    }

    render(<ApplicationCard application={app} />)

    expect(screen.getByText('test-app')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })
})
```

## Service Layer Pattern

When adding new API endpoints, follow the established pattern:

```typescript
// 1. Define query keys
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  detail: (id: string) => [...resourceKeys.all, 'detail', id] as const,
}

// 2. Create API functions
export const resourcesApi = {
  getResource: async (id: string): Promise<Resource> => {
    const response = await api.get<Resource>(`/resources/${id}`)
    return response.data
  },
}

// 3. Create React Query hooks
export function useResource(id: string) {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => resourcesApi.getResource(id),
  })
}

// 4. Create mutation hooks with invalidation
export function useUpdateResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => resourcesApi.updateResource(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() })
    },
  })
}
```

## Reporting Bugs

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Screenshots** if applicable
5. **Environment details**:
   - Browser and version
   - Kubernetes version
   - ArgoCD version
   - Cased CD version
6. **Console errors** (F12 → Console tab)
7. **Pod logs** if relevant:
   ```bash
   kubectl logs -n argocd -l app.kubernetes.io/name=cased-cd
   ```

## Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Propose a solution** if you have one in mind
4. **Explain the use case** and who would benefit
5. **Consider submitting a PR** to implement it yourself

## Development Resources

- **React**: https://react.dev
- **TanStack Query**: https://tanstack.com/query
- **Tailwind CSS**: https://tailwindcss.com
- **shadcn/ui**: https://ui.shadcn.com
- **Obra Icons**: https://obra-icons.com
- **ArgoCD API**: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/

## Questions?

- **GitHub Issues**: https://github.com/cased/cased-cd/issues
- **GitHub Discussions**: https://github.com/cased/cased-cd/discussions
- **Documentation**: See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development setup

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
