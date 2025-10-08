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
- Use Radix UI primitives for accessible components
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

## Questions?

Open an issue or reach out to the team.
