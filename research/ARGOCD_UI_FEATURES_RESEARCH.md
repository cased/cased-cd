# ArgoCD UI Features Research Report

**Research Date:** 2025-10-11
**Purpose:** Feature parity analysis for Cased CD implementation

This document provides detailed research on ArgoCD's official UI features for application logs, history/rollback, and resource actions to ensure Cased CD maintains perfect compatibility.

---

## 1. Application Logs / Pod Logs Viewer

### Summary
ArgoCD provides a comprehensive pod logs viewer that supports real-time streaming, filtering, and downloading of container logs. The feature is accessible by clicking any pod in the application resource tree and selecting the "LOGS" tab.

### API Specification

#### Endpoint: Stream Container Logs
- **Method & Path:** `GET /api/v1/applications/{name}/logs`
- **Alternative:** `GET /api/v1/applications/{name}/pods/{podName}/logs`
- **Authentication:** Bearer token required
- **Technology:** Server-Sent Events (EventSource) for streaming

#### Request Parameters (Query String)
```typescript
{
  applicationName: string;        // Required
  appNamespace: string;           // Application namespace
  namespace: string;              // Pod namespace
  podName: string;                // Required
  containerName: string;          // Required
  resource: {                     // Resource identifier
    group: string;
    kind: string;
    name: string;
  };

  // Optional filtering/streaming parameters
  tail?: number;                  // Number of lines from end
  follow?: boolean;               // Stream new logs in real-time
  sinceSeconds?: number;          // Show logs since N seconds ago
  sinceTime?: string;             // Show logs since specific time
  filter?: string;                // Filter logs by text content
  previous?: boolean;             // Show logs from previous container (before restart)
  untilTime?: string;             // Show logs until specific time
}
```

#### Response Structure
```typescript
interface LogEntry {
  content: string;              // Log line content
  timeStamp: string;            // ISO 8601 timestamp
  last: boolean;                // Indicates final log entry in stream
  podName?: string;
  containerName?: string;
}
```

### UI Components and Features

#### Source Code Location
- **Component:** `ui/src/app/applications/components/pod-logs-viewer/pod-logs-viewer.tsx`
- **Related:** `ui/src/app/applications/components/application-fullscreen-logs/`

#### UI Controls (Toolbar Icons)

1. **Container Selector** (Dropdown)
   - First control in toolbar
   - Allows switching between containers in multi-container pods
   - Defaults to alphabetically first container

2. **Follow/Auto-scroll Toggle** (Button)
   - Icon: Downward arrow in circle
   - Position: Second from left
   - Function: Auto-scrolls to bottom as new logs arrive
   - Can be disabled to examine specific log lines

3. **Previous Logs Toggle** (Button)
   - Shows logs from previous container instance (before restart)
   - Equivalent to `kubectl logs --previous`
   - Note: Feature request exists but may have limitations

4. **Timestamps Toggle** (Button)
   - Shows/hides log timestamps

5. **Dark/Light Mode Switch** (Button)
   - Toggles log viewer theme

6. **Line Wrapping Toggle** (Button)
   - Enables/disables text wrapping for long log lines

7. **Fullscreen Mode** (Button)
   - Opens logs in isolated tab/window

8. **Download Logs** (Button)
   - Icon: Arrow pointing down at a line
   - Position: Second from right
   - Downloads all logs buffered by Kubernetes (typically ~1 hour)
   - Format: Text file

9. **Copy Logs** (Button)
   - Copies visible logs to clipboard

#### Filtering Options

- **Text Filter Input**
  - Live filtering of log content
  - Case-sensitive option available
  - Highlights matching terms in results

- **Tail Lines Selector**
  - Limits initial logs to last N lines
  - Helpful for long-running pods

- **Since Seconds Selector**
  - Shows logs from last N seconds
  - Note: Known bug (#22330) where time field modifications may not work correctly

#### Technical Implementation Details

**Streaming Mechanism:**
- Uses RxJS Observables for reactive streaming
- Buffers logs every 100ms for performance
- Supports pause/resume of stream
- Automatic retry on connection errors
- EventSource API for Server-Sent Events

**Performance Optimizations:**
- Log virtualization for large log sets
- Uses AutoSizer for responsive layout
- Dynamic display adjustment based on preferences

**Key Features:**
- Multi-pod support (can view logs from multiple pods)
- Pod name highlighting
- Scrollable view with position memory
- Responsive design

### Known Limitations

1. **Limited History:** Log viewer cannot show extensive history. Downloading logs for local analysis is often necessary.

2. **Previous Logs:** Feature to view previous container logs (like `kubectl logs --previous`) is limited or unavailable (#4004, #7193).

3. **Time Filter Bug:** "Show logs since a given time" function may not work correctly (#22330).

4. **Hardcoded Line Limit:** Number of lines may be hardcoded to 100 in some versions (#6199).

5. **JSON Parsing:** No built-in JSON log parsing with click-to-expand (#7960).

### Recommendations for Cased CD Implementation

1. **Stream Logs with EventSource:** Use EventSource API or similar for real-time streaming
2. **Implement Core Controls:**
   - Container selector dropdown
   - Follow/auto-scroll toggle
   - Download button
   - Fullscreen mode
3. **Add Filtering:**
   - Text filter with highlight
   - Tail lines selector
   - Since seconds/time range
4. **Performance:**
   - Use virtualization for large logs (react-window or react-virtualized)
   - Buffer updates to avoid UI thrashing
   - Implement auto-scroll with ability to pause
5. **Error Handling:**
   - Graceful handling of connection errors
   - Retry mechanism for stream interruptions
6. **Future Enhancements:**
   - Consider adding JSON parsing (better than ArgoCD)
   - Implement working time range filters
   - Add export to various formats

---

## 2. Application History & Rollback

### Summary
ArgoCD provides a deployment history view showing all previous sync operations for an application. Users can view detailed information about each deployment and rollback to any previous revision (by default, last 10 revisions are kept).

### API Specification

#### Endpoint: Get Application (includes history)
- **Method & Path:** `GET /api/v1/applications/{name}`
- **Authentication:** Bearer token required
- **Note:** History is embedded in the Application resource under `status.history`

#### Endpoint: Get Revision Metadata
- **Method & Path:** `GET /api/v1/applications/{name}/revisions/{revision}/metadata`
- **Authentication:** Bearer token required

**Response Structure:**
```typescript
interface RevisionMetadata {
  author?: string;              // Git commit author
  date: string;                 // Commit date (ISO 8601)
  tags?: string[];              // Git tags
  message: string;              // Commit message
  signatureInfo?: string;       // GPG signature info
}
```

#### Endpoint: Get Chart Details (for Helm apps)
- **Method & Path:** `GET /api/v1/applications/{name}/revisions/{revision}/chartdetails`
- **Authentication:** Bearer token required

**Response Structure:**
```typescript
interface ChartDetails {
  description?: string;
  maintainers?: string[];
  home?: string;
  // ... other chart metadata
}
```

#### Endpoint: Rollback Application
- **Method & Path:** `POST /api/v1/applications/{name}/rollback`
- **Authentication:** Bearer token required

**Request Body:**
```typescript
interface RollbackRequest {
  id: number;                   // History ID to rollback to
  prune?: boolean;              // Delete resources that would become orphaned
  dryRun?: boolean;             // Preview rollback without applying
  appNamespace?: string;        // Application namespace
}
```

**Response:** Returns updated Application resource or error

### Data Model: Application History

The application history is stored in `Application.status.history` as an array:

```typescript
interface RevisionHistory {
  id: number;                           // Sequential ID (0, 1, 2...)
  revision: string;                     // Git commit SHA or Helm chart version
  deployedAt: string;                   // Timestamp (ISO 8601) - "2024-06-04T13:50:37Z"
  deployStartedAt: string;              // Timestamp when sync started
  initiatedBy: {
    username: string;                   // User who triggered sync (or "system" for auto-sync)
    automated?: boolean;                // True if auto-sync triggered
  };
  source?: ApplicationSource | ApplicationSource[];  // Source config at time of deployment
  sources?: ApplicationSource[];        // For multi-source apps (v2.6+)
  revisions?: string[];                 // For multi-source apps
}

interface ApplicationSource {
  repoURL: string;                      // Git repo URL
  path?: string;                        // Path within repo
  targetRevision: string;               // Branch/tag/commit
  helm?: HelmParameters;
  kustomize?: KustomizeParameters;
  // ... other source types
}
```

### UI Components and Features

#### Source Code Location
- **Component:** `ui/src/app/applications/components/application-deployment-history/application-deployment-history.tsx`
- **Used In:** `ui/src/app/applications/components/application-details/application-details.tsx`

#### Accessing History in UI
- Navigate to application details page
- Click on "HISTORY AND ROLLBACK" tab or "REVISION HISTORY" section
- Shows chronological list of deployments (most recent first)

#### Information Displayed Per Revision

1. **Revision ID** (e.g., #0, #1, #2)
2. **Deployment Timestamp** ("Deployed At")
   - Formatted as relative time (e.g., "2 hours ago")
   - Shows exact timestamp on hover
3. **Deploy Duration**
   - Time from deployStartedAt to deployedAt
4. **Initiator Details**
   - Username (e.g., "admin", "john.doe")
   - Badge indicating "automated" vs "manual"
5. **Time Active**
   - How long this revision was the active deployment
   - Calculated as time until next deployment
6. **Git/Source Information**
   - Commit SHA (short form, clickable to Git UI)
   - Commit message (if available via metadata endpoint)
   - Repository and path
   - Branch/tag

#### Actions Available

Each history entry has a dropdown menu (ellipsis button) with:

1. **Rollback** (for previous revisions)
   - Reverts application to selected revision
   - Shows confirmation dialog
   - Option to enable pruning

2. **Redeploy** (for current revision)
   - Re-syncs the current revision
   - Useful if manual changes were made

#### Rollback Confirmation Dialog

When user clicks "Rollback":

1. **Dialog Content:**
   ```
   Rollback application [app-name] to revision [revision-id]?

   Revision: [git-sha]
   Date: [deployed-at-timestamp]

   ☐ Prune resources (delete resources not in target revision)
   ```

2. **Buttons:**
   - "Cancel" (secondary)
   - "Rollback" (primary, destructive color)

3. **After Rollback:**
   - Shows success notification
   - Creates new history entry with rollback action
   - Triggers application sync to target revision

#### Configuration

**Revision History Limit:**
- Controlled by `spec.revisionHistoryLimit` in Application manifest
- Default: 10 revisions
- Set to 0 to disable history
- Older revisions have "Rollback" disabled with tooltip: "Release is not in history"

### UI Behavior and Patterns

1. **List Presentation:**
   - Reversed chronological order (newest first)
   - Compact, card-like entries
   - Current revision highlighted/badged

2. **Multi-Source Apps:**
   - Shows all source repositories
   - Uses collapsible sections for readability (PR #20566)
   - Displays revision for each source

3. **Time Display:**
   - Uses moment.js for time calculations
   - Relative times (e.g., "2 hours ago")
   - Exact timestamps on hover

4. **Empty State:**
   - If no history: "No deployment history available"

### Known Issues and Limitations

1. **History Disabled for Multi-Source Apps:** In earlier versions, rollback was disabled for applications with multiple sources. This was addressed in later versions.

2. **UI Bug (#8769):** Some display bugs in History & Rollback tab, though rollback function continues to work.

3. **History for Apps in Any Namespace (#16980):** History screen may fail to load data for apps-in-any-namespace feature.

4. **Automated Sync Conflict:** Cannot rollback if automated sync is enabled. Must disable auto-sync first.

5. **No Rollback for Deleted Apps:** If application was deleted and recreated with same name, cannot rollback to pre-deletion revisions.

6. **Pruning Not Automatic:** Rollback doesn't automatically prune orphaned resources unless explicitly enabled with `--prune` flag.

### Recommendations for Cased CD Implementation

1. **History Display:**
   - Fetch history from `Application.status.history`
   - Sort in reverse chronological order
   - Display all key fields: revision, timestamp, initiator, duration
   - Use relative time display with exact time on hover

2. **Revision Details:**
   - Lazy-load commit metadata (author, message) via `/revisions/{revision}/metadata`
   - For Helm apps, fetch chart details via `/revisions/{revision}/chartdetails`
   - Make commit SHAs clickable to Git provider (if URL available)

3. **Rollback Implementation:**
   - Use confirmation dialog with revision details
   - Include prune option as checkbox
   - POST to `/api/v1/applications/{name}/rollback` with `{ id, prune }`
   - Invalidate application queries after successful rollback
   - Show toast notification on success/error

4. **Service Layer Pattern:**
   ```typescript
   // Add to applications service
   export const applicationsApi = {
     getRevisionMetadata: (name: string, revision: string) =>
       api.get(`/api/v1/applications/${name}/revisions/${revision}/metadata`),

     rollbackApplication: (name: string, id: number, prune?: boolean) =>
       api.post(`/api/v1/applications/${name}/rollback`, { id, prune })
   };

   // React Query hooks
   export function useRevisionMetadata(name: string, revision: string) {
     return useQuery({
       queryKey: ['applications', name, 'revisions', revision, 'metadata'],
       queryFn: () => applicationsApi.getRevisionMetadata(name, revision),
     });
   }

   export function useRollbackApplication() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: ({ name, id, prune }) =>
         applicationsApi.rollbackApplication(name, id, prune),
       onSuccess: (_, variables) => {
         queryClient.invalidateQueries({ queryKey: ['applications', variables.name] });
         toast.success('Application rolled back successfully');
       },
     });
   }
   ```

5. **UI Component Structure:**
   ```typescript
   // Component structure suggestion
   <ApplicationHistory application={app}>
     {app.status?.history?.map(revision => (
       <RevisionCard
         key={revision.id}
         revision={revision}
         isCurrent={revision.id === currentId}
         onRollback={() => openRollbackDialog(revision)}
       >
         <RevisionInfo revision={revision} />
         <RevisionMetadata appName={app.name} revision={revision.revision} />
         <RevisionActions revision={revision} />
       </RevisionCard>
     ))}
   </ApplicationHistory>
   ```

6. **Validations:**
   - Check if auto-sync is enabled (warn/prevent rollback)
   - Disable rollback for revisions older than `revisionHistoryLimit`
   - Show appropriate error messages for failed rollbacks

---

## 3. Resource Action Buttons

### Summary
ArgoCD provides dynamic, extensible resource actions that allow users to perform operations on individual Kubernetes resources (pods, deployments, etc.). Actions can be built-in (restart, pause, resume, scale) or custom-defined via Lua scripts in the `argocd-cm` ConfigMap.

### API Specification

#### Endpoint: List Resource Actions
- **Method & Path:** `GET /api/v1/applications/{name}/resource/actions`
- **Authentication:** Bearer token required

**Query Parameters:**
```typescript
{
  namespace: string;            // Resource namespace
  resourceName: string;         // Resource name
  version: string;              // API version (e.g., "v1")
  kind: string;                 // Resource kind (e.g., "Deployment", "Pod")
  group: string;                // API group (empty string for core resources)
  appNamespace?: string;        // Application namespace
}
```

**Response Structure:**
```typescript
interface ResourceAction {
  name: string;                 // Action identifier (e.g., "restart", "pause", "delete")
  displayName?: string;         // Human-readable name for UI
  disabled?: boolean;           // Whether action is currently available
  iconClass?: string;           // CSS class for icon
  params?: ResourceActionParam[]; // Input parameters required
}

interface ResourceActionParam {
  name: string;                 // Parameter name
  type: string;                 // Type: "string", "number", "boolean", etc.
  default?: string;             // Default value
  description?: string;         // Help text
  required?: boolean;           // Whether parameter is mandatory
  enum?: string[];              // Allowed values (for select inputs)
}
```

**Example Response:**
```json
{
  "actions": [
    {
      "name": "restart",
      "displayName": "Restart",
      "disabled": false,
      "iconClass": "fa-redo"
    },
    {
      "name": "pause",
      "displayName": "Pause Rollout",
      "disabled": false
    },
    {
      "name": "scale",
      "displayName": "Scale",
      "params": [
        {
          "name": "replicas",
          "type": "number",
          "default": "3",
          "description": "Number of replicas",
          "required": true
        }
      ]
    }
  ]
}
```

#### Endpoint: Run Resource Action
- **Method & Path:** `POST /api/v1/applications/{name}/resource/actions`
- **Alternative (v2):** `POST /api/v1/applications/{name}/resource/actions/v2` (supports parameters)
- **Authentication:** Bearer token required

**Request Body:**
```typescript
interface RunResourceActionRequest {
  namespace: string;
  resourceName: string;
  version: string;
  kind: string;
  group: string;
  action: string;               // Action name to execute
  appNamespace?: string;
  resourceActionParameters?: ResourceActionParam[]; // For actions with inputs
}

// Example with parameters
{
  "namespace": "default",
  "resourceName": "my-deployment",
  "version": "v1",
  "kind": "Deployment",
  "group": "apps",
  "action": "scale",
  "resourceActionParameters": [
    {
      "name": "replicas",
      "value": "5"
    }
  ]
}
```

**Response:** Returns updated resource state or action result

### Built-in Resource Actions

ArgoCD includes several default actions for common resource types:

#### 1. Deployment, StatefulSet, DaemonSet
- **restart:** Triggers a rolling restart by updating annotations
  - No parameters
  - Equivalent to `kubectl rollout restart`

#### 2. Argo Rollouts (Rollout resource)
- **restart:** Restart rollout
- **retry:** Retry a rollout
- **abort:** Abort a progressing rollout
- **promote-full:** Promote a rollout to full deployment
- **pause:** Pause a rollout
- **resume:** Resume a paused rollout

#### 3. CronJob
- **suspend:** Suspend cron job execution
- **resume:** Resume cron job execution
- **create-job:** Manually trigger a job run

#### 4. Flux Resources
- Various suspend/resume actions for Flux CD resources

#### 5. Generic Actions (available for most resources)
- **delete:** Delete the resource
  - Requires explicit confirmation
  - Subject to RBAC permissions

### Custom Resource Actions

Administrators can define custom actions in `argocd-cm` ConfigMap:

**Configuration Example:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
data:
  resource.customizations.actions.apps_Deployment: |
    discovery.lua: |
      actions = {}
      actions["restart"] = {["disabled"] = false}
      actions["restart-with-delay"] = {
        ["displayName"] = "Restart with delay",
        ["disabled"] = false,
        ["iconClass"] = "fa-clock",
        ["params"] = {
          {
            ["name"] = "delay",
            ["type"] = "number",
            ["default"] = "30",
            ["description"] = "Delay in seconds"
          }
        }
      }
      return actions

    definitions:
    - name: restart-with-delay
      action.lua: |
        local os = require("os")
        os.execute("sleep " .. obj.delay)
        obj.spec.template.metadata.annotations = {
          ["kubectl.kubernetes.io/restartedAt"] = os.date("%Y-%m-%dT%H:%M:%S%z")
        }
        return obj
```

### UI Components and Features

#### Source Code Location
- **Service:** `ui/src/app/shared/services/applications-service.ts`
  - `getResourceActions()` method
  - `runResourceAction()` method
- **Usage:** `ui/src/app/applications/components/utils.tsx`
  - Action menu generation
  - Confirmation dialogs

#### Accessing Actions in UI

1. **Resource Tree View:**
   - Click on any resource node
   - Opens resource details panel
   - Actions available in dropdown menu

2. **Resource Details Panel:**
   - Three-dot menu (⋮) or "Actions" button in header
   - Dropdown shows available actions for that resource

3. **Action Button:**
   - Icon: Three vertical dots or gear icon
   - Label: "ACTIONS" or no label (just icon)

#### User Interaction Flow

1. **Select Resource:**
   - User clicks on resource in tree/list view
   - Details panel opens showing resource details

2. **Open Actions Menu:**
   - User clicks actions button/dropdown
   - System calls `getResourceActions()` API
   - Populates dropdown with available actions

3. **Select Action:**
   - User clicks specific action (e.g., "Restart")
   - If action has parameters, shows input form
   - If action is destructive, shows confirmation dialog

4. **Confirmation Dialog (for destructive actions):**
   ```
   Execute action "[action-name]" on [resource-type]/[resource-name]?

   [Parameter inputs if any]

   ☐ [Additional options]

   [Cancel] [Execute]
   ```

5. **Execute Action:**
   - System calls `runResourceAction()` API
   - Shows loading state
   - On success: Toast notification "Action executed successfully"
   - On error: Error toast with details
   - Refreshes resource state

### RBAC and Permissions

Resource actions respect ArgoCD's RBAC system:

**RBAC Policy Example:**
```csv
p, role:developer, applications, action/*/restart, */*, allow
p, role:developer, applications, delete/*/Pod/*, */*, allow
p, role:ops, applications, action/*/*, */*, allow
```

**Permission Structure:**
- `action/[Group]_[Kind]/[ActionName]`
- `delete/[Group]/[Kind]/[Name]` for delete operations

**Security Note:** Earlier versions had a vulnerability (#1827) where `RunResourceAction` only required "get" permission. This was fixed to require explicit action permissions.

### Error Handling

Common errors and their handling:

1. **Permission Denied:**
   - Error: "permission denied" or "application is not permitted to manage [resource]"
   - Cause: Insufficient RBAC permissions
   - UI: Show error toast with permission details

2. **Resource Not Found:**
   - Error: 400 or 404 status
   - Cause: Resource doesn't exist or hasn't been created yet
   - UI: Disable actions menu or show "No actions available"

3. **Action Failed:**
   - Error: Action execution error from Kubernetes
   - Cause: Invalid state, invalid parameters, etc.
   - UI: Show detailed error message

### Recommendations for Cased CD Implementation

1. **Service Layer:**
   ```typescript
   // Add to applications service
   export const applicationsApi = {
     getResourceActions: (
       name: string,
       resource: {
         namespace: string;
         name: string;
         version: string;
         kind: string;
         group: string;
       }
     ) => api.get(`/api/v1/applications/${name}/resource/actions`, {
       params: {
         namespace: resource.namespace,
         resourceName: resource.name,
         version: resource.version,
         kind: resource.kind,
         group: resource.group,
       }
     }),

     runResourceAction: (
       name: string,
       resource: {
         namespace: string;
         name: string;
         version: string;
         kind: string;
         group: string;
       },
       action: string,
       parameters?: Array<{ name: string; value: string }>
     ) => api.post(`/api/v1/applications/${name}/resource/actions/v2`, {
       namespace: resource.namespace,
       resourceName: resource.name,
       version: resource.version,
       kind: resource.kind,
       group: resource.group,
       action,
       resourceActionParameters: parameters,
     })
   };
   ```

2. **React Query Hooks:**
   ```typescript
   export function useResourceActions(appName: string, resource: ResourceIdentifier) {
     return useQuery({
       queryKey: ['applications', appName, 'resources', resource, 'actions'],
       queryFn: () => applicationsApi.getResourceActions(appName, resource),
       enabled: !!resource.name, // Only fetch when resource is selected
     });
   }

   export function useRunResourceAction() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: ({ appName, resource, action, parameters }) =>
         applicationsApi.runResourceAction(appName, resource, action, parameters),
       onSuccess: (_, variables) => {
         queryClient.invalidateQueries({
           queryKey: ['applications', variables.appName]
         });
         toast.success(`Action "${variables.action}" executed successfully`);
       },
       onError: (error) => {
         toast.error(`Action failed: ${error.message}`);
       },
     });
   }
   ```

3. **UI Component Structure:**
   ```typescript
   function ResourceActionsMenu({ appName, resource }) {
     const { data: actions, isLoading } = useResourceActions(appName, resource);
     const runAction = useRunResourceAction();
     const [selectedAction, setSelectedAction] = useState<ResourceAction | null>(null);

     return (
       <>
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="sm">
               <IconDotsVertical className="h-4 w-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent>
             {isLoading && <DropdownMenuItem disabled>Loading...</DropdownMenuItem>}
             {actions?.map(action => (
               <DropdownMenuItem
                 key={action.name}
                 disabled={action.disabled}
                 onClick={() => setSelectedAction(action)}
               >
                 {action.displayName || action.name}
               </DropdownMenuItem>
             ))}
           </DropdownMenuContent>
         </DropdownMenu>

         <ResourceActionDialog
           action={selectedAction}
           onConfirm={(params) => {
             runAction.mutate({ appName, resource, action: selectedAction.name, parameters: params });
             setSelectedAction(null);
           }}
           onCancel={() => setSelectedAction(null)}
         />
       </>
     );
   }
   ```

4. **Action Dialog Component:**
   ```typescript
   function ResourceActionDialog({ action, onConfirm, onCancel }) {
     const [parameters, setParameters] = useState({});

     if (!action) return null;

     const isDestructive = ['delete', 'abort'].includes(action.name);

     return (
       <Dialog open={!!action} onOpenChange={(open) => !open && onCancel()}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>
               Execute action: {action.displayName || action.name}
             </DialogTitle>
           </DialogHeader>

           {action.params?.map(param => (
             <div key={param.name}>
               <Label>{param.name}</Label>
               <Input
                 type={param.type}
                 defaultValue={param.default}
                 required={param.required}
                 onChange={(e) => setParameters({
                   ...parameters,
                   [param.name]: e.target.value
                 })}
               />
               {param.description && (
                 <p className="text-sm text-muted-foreground">{param.description}</p>
               )}
             </div>
           ))}

           <DialogFooter>
             <Button variant="outline" onClick={onCancel}>Cancel</Button>
             <Button
               variant={isDestructive ? "destructive" : "default"}
               onClick={() => onConfirm(Object.entries(parameters).map(([name, value]) => ({ name, value })))}
             >
               Execute
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

5. **Action-Specific Components:**

   For common actions, consider convenience wrappers:

   ```typescript
   // Restart action shortcut
   function RestartButton({ appName, resource }) {
     const runAction = useRunResourceAction();

     return (
       <Button
         onClick={() => {
           if (confirm(`Restart ${resource.kind}/${resource.name}?`)) {
             runAction.mutate({ appName, resource, action: 'restart' });
           }
         }}
       >
         <IconRotate className="h-4 w-4 mr-2" />
         Restart
       </Button>
     );
   }

   // Delete action with confirmation
   function DeleteResourceButton({ appName, resource }) {
     const [confirmName, setConfirmName] = useState('');
     const runAction = useRunResourceAction();

     return (
       <Dialog>
         <DialogTrigger asChild>
           <Button variant="destructive" size="sm">
             <IconTrash className="h-4 w-4 mr-2" />
             Delete
           </Button>
         </DialogTrigger>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Delete {resource.kind}?</DialogTitle>
             <DialogDescription>
               This action cannot be undone. Type the resource name to confirm:
             </DialogDescription>
           </DialogHeader>
           <Input
             placeholder={resource.name}
             value={confirmName}
             onChange={(e) => setConfirmName(e.target.value)}
           />
           <DialogFooter>
             <Button variant="outline">Cancel</Button>
             <Button
               variant="destructive"
               disabled={confirmName !== resource.name}
               onClick={() => runAction.mutate({
                 appName,
                 resource,
                 action: 'delete'
               })}
             >
               Delete
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

6. **Error Handling:**
   ```typescript
   // Handle specific error cases
   onError: (error) => {
     if (error.response?.status === 403) {
       toast.error('Permission denied. You do not have permission to execute this action.');
     } else if (error.response?.status === 404) {
       toast.error('Resource not found.');
     } else if (error.message?.includes('not permitted')) {
       toast.error('Application is not permitted to manage this resource.');
     } else {
       toast.error(`Action failed: ${error.message}`);
     }
   }
   ```

7. **Testing Considerations:**
   - Test with various resource types (Pod, Deployment, StatefulSet, etc.)
   - Test actions with and without parameters
   - Test permission denied scenarios
   - Test with custom resource actions if available
   - Verify confirmation dialogs for destructive actions

---

## Type Definitions

Add these to `/Users/tnm/cased-cd/src/types/api.ts`:

```typescript
// Pod Logs Types
export interface LogEntry {
  content: string;
  timeStamp: string;
  last?: boolean;
  podName?: string;
  containerName?: string;
}

export interface LogQueryParams {
  applicationName: string;
  appNamespace?: string;
  namespace: string;
  podName: string;
  containerName: string;
  resource: {
    group: string;
    kind: string;
    name: string;
  };
  tail?: number;
  follow?: boolean;
  sinceSeconds?: number;
  sinceTime?: string;
  filter?: string;
  previous?: boolean;
  untilTime?: string;
}

// Application History Types
export interface RevisionHistory {
  id: number;
  revision: string;
  deployedAt: string;
  deployStartedAt: string;
  initiatedBy: {
    username: string;
    automated?: boolean;
  };
  source?: ApplicationSource | ApplicationSource[];
  sources?: ApplicationSource[];
  revisions?: string[];
}

export interface RevisionMetadata {
  author?: string;
  date: string;
  tags?: string[];
  message: string;
  signatureInfo?: string;
}

export interface ChartDetails {
  description?: string;
  maintainers?: string[];
  home?: string;
}

// Rollback Types
export interface RollbackRequest {
  id: number;
  prune?: boolean;
  dryRun?: boolean;
  appNamespace?: string;
}

// Resource Actions Types
export interface ResourceAction {
  name: string;
  displayName?: string;
  disabled?: boolean;
  iconClass?: string;
  params?: ResourceActionParam[];
}

export interface ResourceActionParam {
  name: string;
  type: string;
  default?: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  value?: string;
}

export interface ResourceIdentifier {
  namespace: string;
  name: string;
  version: string;
  kind: string;
  group: string;
}

export interface RunResourceActionRequest {
  namespace: string;
  resourceName: string;
  version: string;
  kind: string;
  group: string;
  action: string;
  appNamespace?: string;
  resourceActionParameters?: ResourceActionParam[];
}
```

---

## References

### Official Documentation
- **Resource Actions:** https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- **API Documentation:** https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- **Swagger UI:** `{argocd-server-url}/swagger-ui`
- **App Logs Command:** https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_logs/
- **App History Command:** https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- **App Rollback Command:** https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/

### Source Code Files
- **Pod Logs Viewer:** `ui/src/app/applications/components/pod-logs-viewer/pod-logs-viewer.tsx`
- **Deployment History:** `ui/src/app/applications/components/application-deployment-history/application-deployment-history.tsx`
- **Applications Service:** `ui/src/app/shared/services/applications-service.ts`
- **Utils (Actions):** `ui/src/app/applications/components/utils.tsx`
- **Swagger Spec:** `assets/swagger.json`

### GitHub Issues and PRs
- **New Pod Logs Viewer:** PR #5233
- **Filterable Logs:** PR #5319
- **Logs in Isolated Tab:** PR #5323
- **Previous Logs Support:** Issue #4004, #7193
- **Log Viewer Bugs:** Issue #14402, #22330
- **JSON Log Parsing:** Issue #7960
- **Rollback Multi-Source:** PR #20566
- **History & Rollback Bug:** Issue #8769
- **Resource Actions RBAC:** Issue #1827
- **Resource Actions Permissions:** Issue #17315
- **Delete Pod Action:** Issue #12777

### API Endpoints Summary

| Feature | Method | Endpoint | Purpose |
|---------|--------|----------|---------|
| Pod Logs | GET | `/api/v1/applications/{name}/logs` | Stream container logs |
| Revision Metadata | GET | `/api/v1/applications/{name}/revisions/{revision}/metadata` | Get commit details |
| Chart Details | GET | `/api/v1/applications/{name}/revisions/{revision}/chartdetails` | Get Helm chart info |
| Rollback | POST | `/api/v1/applications/{name}/rollback` | Rollback to previous revision |
| List Actions | GET | `/api/v1/applications/{name}/resource/actions` | Get available resource actions |
| Run Action | POST | `/api/v1/applications/{name}/resource/actions/v2` | Execute resource action |

---

## Next Steps for Cased CD Implementation

### Priority 1: Application History & Rollback
- Add RevisionHistory types to `src/types/api.ts`
- Create `application-history.tsx` component
- Add rollback mutation and confirmation dialog
- Test with apps that have deployment history

### Priority 2: Resource Actions
- Add ResourceAction types to `src/types/api.ts`
- Create resource actions dropdown component
- Implement action confirmation dialogs
- Add parameter input forms for parameterized actions
- Test with Deployments (restart) and Pods (delete)

### Priority 3: Pod Logs Viewer
- Add LogEntry types to `src/types/api.ts`
- Create pod logs viewer component with streaming
- Implement log filtering and controls (follow, tail, download)
- Use EventSource or WebSocket for streaming
- Add virtualization for performance

### Testing Strategy
1. Set up local ArgoCD with `./scripts/setup-argocd.sh`
2. Create test application with multiple deployments
3. Verify all API endpoints match ArgoCD behavior
4. Test RBAC scenarios (permission denied, etc.)
5. Compare UI behavior side-by-side with ArgoCD

---

**Document Version:** 1.0
**Last Updated:** 2025-10-11
**Researcher:** Claude (ArgoCD Research Specialist)
