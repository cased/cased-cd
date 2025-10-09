# Sync Functionality

## Overview
The sync functionality allows users to manually trigger a synchronization of an ArgoCD application with its Git source.

## Implementation

### API Endpoint
```
POST /api/v1/applications/{name}/sync
```

**Payload:**
```json
{
  "prune": true,
  "dryRun": false,
  "strategy": {
    "hook": {}
  }
}
```

### React Hook
`useSyncApplication()` - React Query mutation hook for triggering sync

**Usage:**
```tsx
const syncMutation = useSyncApplication()

const handleSync = async (name: string) => {
  try {
    await syncMutation.mutateAsync({ name, prune: true })
    refetch()
  } catch (error) {
    console.error('Sync failed:', error)
  }
}
```

### UI Integration
- Sync button added to application cards
- Uses `IconCodeCommit` icon from obra-icons-react
- Located in the card footer alongside refresh button
- Blue hover state to distinguish from refresh

## Testing

### Unit Tests
Location: `src/services/applications.test.tsx`

Tests cover:
- ✅ Successful sync operation
- ✅ Error handling
- ✅ Dry run mode
- ✅ Query cache invalidation
- ✅ API payload structure

**Run tests:**
```bash
npm run test        # Watch mode
npm run test:run    # Run once
npm run test:ui     # UI mode
```

### Integration Tests
Location: `src/test/integration/sync.test.tsx`

Tests cover:
- Real API sync calls (requires ArgoCD running)
- Error handling for non-existent apps
- Full end-to-end flow

## Manual Testing

1. Start the dev server:
   ```bash
   npm run dev:real
   ```

2. Navigate to Applications page (http://localhost:5174/applications)

3. Find an application with "OutOfSync" status

4. Click the sync button (commit icon) on the application card

5. Verify:
   - Network request to `/applications/{name}/sync`
   - Application status updates to "Synced"
   - No errors in console

## Architecture

```
ApplicationsPage
  ├─ useSyncApplication()         # React Query mutation
  │   └─ applicationsApi.syncApplication()  # API call
  │
  └─ ApplicationCard
      └─ onSync handler           # User interaction
          └─ syncMutation.mutateAsync()  # Trigger sync
```

## API Response
Sync operation is async - ArgoCD will process the sync in the background. The UI should:
1. Show loading state during request
2. Refetch application data after request completes
3. Application status will update once ArgoCD processes the sync

## Options

### prune
When `true`, deletes resources that exist in the cluster but not in Git.

### dryRun
When `true`, performs a dry run without actually applying changes. Useful for previewing what would be synced.

## Future Enhancements
- [ ] Add loading indicator during sync
- [ ] Show sync progress/status
- [ ] Add confirmation dialog for prune operations
- [ ] Support selective resource sync
- [ ] Add sync options panel (prune, dry-run, force)
