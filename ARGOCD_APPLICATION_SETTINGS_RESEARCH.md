# ArgoCD Application Settings Panel - Comprehensive Research

## Summary

ArgoCD's application settings are managed through an **EditablePanel** component that displays application metadata and configuration in an inline-editable format. The panel appears as a sliding sidebar when users click the "Details" menu item on an application. Settings are organized as individual editable fields rather than a traditional form, allowing users to edit specific fields independently.

**Key Findings:**
- Settings are edited inline using an `EditablePanel` component with individual field edit/save actions
- The panel uses a sliding sidebar layout (not a modal or separate page)
- Each field can be independently edited with validation
- Updates are sent via `PUT /api/v1/applications/{name}` (full update) or `PUT /api/v1/applications/{name}/spec` (spec-only update)
- The UI is highly dynamic, showing/hiding fields based on source type (Git, Helm, Kustomize, etc.)

---

## 1. UI Layout & Organization

### Access Pattern
```typescript
// From application-details.tsx
{
  iconClassName: 'fa fa-info-circle',
  title: <ActionMenuItem actionLabel='Details' />,
  action: () => selectNode(fullName)
}

<SlidingPanel isShown={selectedNode != null || isAppSelected} onClose={() => selectNode('')}>
  <ResourceDetails
    application={application}
    selectedNode={selectedNode}
  />
</SlidingPanel>
```

**Access Method:**
- Click "Details" menu item (with info-circle icon) on an application
- Opens a sliding panel from the right side of the screen
- Panel can be closed by clicking outside or close button

### Panel Structure

The settings use an **EditablePanel** component that renders a list of editable items:

```typescript
<EditablePanel
    save={updateApp}
    validate={input => ({
        'spec.project': !input.spec.project && 'Project name is required',
        'spec.destination.server': !input.spec.destination.server && 'Cluster server is required',
        // ... more validation
    })}
    values={app}
    title={app.metadata.name.toLocaleUpperCase()}
    items={attributes}
/>
```

**Layout Characteristics:**
- Title displays application name in uppercase
- Each setting field is a separate row with:
  - Field label (uppercase)
  - View mode: Read-only display of current value
  - Edit mode: Appropriate form control for editing
- "Edit" button to enter edit mode
- "Save" and "Cancel" buttons when in edit mode
- Individual fields can be edited without affecting others

**Visual Design:**
- Clean, minimal styling (SCSS shows simple padding/margins)
- Monospace font for technical values (URLs, paths, YAML)
- Light padding (5px) on sections
- Absolutely positioned YAML edit button (1em from right/top)

---

## 2. All Available Settings Fields

### Complete TypeScript Interface

```typescript
export interface Application {
  apiVersion?: string;
  kind?: string;
  metadata: models.ObjectMeta;  // includes name, namespace, labels, annotations, finalizers
  spec: ApplicationSpec;
  status: ApplicationStatus;
  operation?: Operation;
}

export interface ApplicationSpec {
  // Core settings
  project: string;                              // Required

  // Source configuration (single-source)
  source?: ApplicationSource;

  // Multi-source configuration
  sources?: ApplicationSource[];

  // Source hydrator (advanced)
  sourceHydrator?: SourceHydrator;

  // Destination
  destination: ApplicationDestination;          // Required

  // Sync configuration
  syncPolicy?: SyncPolicy;

  // Advanced settings
  ignoreDifferences?: ResourceIgnoreDifferences[];
  info?: Info[];                                // Custom metadata
  revisionHistoryLimit?: number;
}
```

### A. General Settings (Metadata)

#### Application Name
- **Field:** `metadata.name`
- **Type:** `string`
- **Required:** Yes
- **Editable:** No (cannot rename - would require delete/recreate)
- **UI Control:** Display only

#### Project
- **Field:** `spec.project`
- **Type:** `string`
- **Required:** Yes
- **Default:** `"default"`
- **UI Control:** Autocomplete dropdown (loads from projects API)
- **Validation:** "Project name is required"

```typescript
{
  title: 'PROJECT',
  view: <Link to={'/settings/projects/' + app.spec.project}>{app.spec.project}</Link>,
  edit: (formApi: FormApi) => (
    <DataLoader load={() => services.projects.list('items.metadata.name')}>
      {projects => <FormField formApi={formApi} field='spec.project' component={FormSelect} componentProps={{options: projects}} />}
    </DataLoader>
  )
}
```

#### Namespace
- **Field:** `metadata.namespace`
- **Type:** `string`
- **Default:** `"argocd"`
- **UI Control:** Text input
- **Notes:** This is the namespace where the Application CR lives, not the destination namespace

#### Labels
- **Field:** `metadata.labels`
- **Type:** `map[string]string`
- **UI Control:** Key-value pair editor (MapInputField-like component)
- **Features:**
  - Add new label
  - Remove existing label
  - Edit key and value independently

#### Annotations
- **Field:** `metadata.annotations`
- **Type:** `map[string]string`
- **UI Control:** Key-value pair editor with expandable view
- **Features:**
  - Add new annotation
  - Remove existing annotation
  - Expandable to show full values (can be long)

#### Finalizers
- **Field:** `metadata.finalizers`
- **Type:** `[]string`
- **Common Value:** `["resources-finalizer.argocd.argoproj.io"]`
- **Purpose:** Controls cascade deletion behavior
- **UI Control:** Array input (tags-input style)

---

### B. Source Settings

ArgoCD supports **single-source** or **multi-source** applications:
- Single source: Uses `spec.source`
- Multi-source: Uses `spec.sources` (array)

#### Repository URL
- **Field:** `spec.source.repoURL` or `spec.sources[n].repoURL`
- **Type:** `string`
- **Required:** Yes
- **UI Control:** Autocomplete (loads from repositories API)
- **Examples:**
  - Git: `https://github.com/argoproj/argocd-example-apps.git`
  - Helm: `https://charts.bitnami.com/bitnami`
  - OCI: `oci://ghcr.io/argoproj/argocd-example-apps`

#### Target Revision
- **Field:** `spec.source.targetRevision`
- **Type:** `string`
- **Required:** Yes
- **Default:** `"HEAD"`
- **UI Control:** Text input (branch/tag/commit)
- **Examples:**
  - Branch: `"main"`, `"master"`, `"develop"`
  - Tag: `"v1.2.3"`
  - Commit SHA: `"abc123def456"`
  - Helm version: `"1.2.3"`, `"1.2.*"`, `"*"`

#### Path (for Git repositories)
- **Field:** `spec.source.path`
- **Type:** `string`
- **Required:** Yes for Git repos
- **UI Control:** Text input or directory picker
- **Examples:** `"guestbook"`, `"helm-charts/nginx"`, `"."`

#### Chart (for Helm repositories)
- **Field:** `spec.source.chart`
- **Type:** `string`
- **Required:** Yes for Helm repos
- **UI Control:** Autocomplete/dropdown (loads charts from repo)
- **Examples:** `"nginx"`, `"wordpress"`

#### Source Reference (Multi-Source)
- **Field:** `spec.source.ref` or `spec.sources[n].ref`
- **Type:** `string`
- **Purpose:** Named reference for use by other sources
- **UI Control:** Text input

---

### C. Source Type-Specific Settings

The UI dynamically shows fields based on the detected source type.

#### Helm Settings

**Complete Interface:**
```go
type ApplicationSourceHelm struct {
    ValueFiles              []string                // List of value files to use
    Parameters              []HelmParameter         // Parameter overrides
    ReleaseName             string                  // Helm release name
    Values                  string                  // Raw values YAML
    FileParameters          []HelmFileParameter     // File-based parameters
    Version                 string                  // Helm version
    PassCredentials         bool                    // Pass credentials to Helm
    IgnoreMissingValueFiles bool                    // Don't error on missing value files
    SkipCrds                bool                    // Skip CRD installation
    ValuesObject            *runtime.RawExtension   // Structured values object
    Namespace               string                  // Helm namespace override
    KubeVersion             string                  // Kubernetes version to template for
    APIVersions             []string                // API versions to template for
    SkipTests               bool                    // Skip Helm tests
    SkipSchemaValidation    bool                    // Skip values schema validation
}
```

**UI Fields:**

1. **Values Files**
   - **Field:** `spec.source.helm.valueFiles`
   - **Type:** `[]string`
   - **UI Control:** Tags input (add/remove files)
   - **Example:** `["values-prod.yaml", "values-secrets.yaml"]`

2. **Values (Raw YAML)**
   - **Field:** `spec.source.helm.values`
   - **Type:** `string` (YAML formatted)
   - **UI Control:** YAML editor (TextArea with syntax highlighting)
   - **Features:**
     - Multi-line text input
     - Expandable/collapsible
     - YAML validation

3. **Parameters**
   - **Field:** `spec.source.helm.parameters`
   - **Type:** `[]HelmParameter`
   - **UI Control:** Array of key-value pairs
   - **Fields per parameter:**
     - `name`: Parameter name
     - `value`: Parameter value
     - `forceString`: Boolean flag

4. **Release Name**
   - **Field:** `spec.source.helm.releaseName`
   - **Type:** `string`
   - **UI Control:** Text input

5. **Helm Version**
   - **Field:** `spec.source.helm.version`
   - **Type:** `string`
   - **UI Control:** Dropdown/autocomplete
   - **Options:** `["v2", "v3"]` (or specific versions)

6. **Skip CRDs**
   - **Field:** `spec.source.helm.skipCrds`
   - **Type:** `boolean`
   - **UI Control:** Checkbox

7. **Pass Credentials**
   - **Field:** `spec.source.helm.passCredentials`
   - **Type:** `boolean`
   - **UI Control:** Checkbox

8. **Ignore Missing Value Files**
   - **Field:** `spec.source.helm.ignoreMissingValueFiles`
   - **Type:** `boolean`
   - **UI Control:** Checkbox

---

#### Kustomize Settings

**Complete Interface:**
```go
type ApplicationSourceKustomize struct {
    NamePrefix                  string                    // Prefix for resource names
    NameSuffix                  string                    // Suffix for resource names
    Images                      KustomizeImages           // Image overrides
    CommonLabels                map[string]string         // Labels to add to all resources
    Version                     string                    // Kustomize version
    CommonAnnotations           map[string]string         // Annotations to add to all resources
    ForceCommonLabels           bool                      // Force labels even if conflict
    ForceCommonAnnotations      bool                      // Force annotations even if conflict
    Namespace                   string                    // Namespace override
    CommonAnnotationsEnvsubst   bool                      // Enable envsubst in annotations
    Replicas                    KustomizeReplicas         // Replica count overrides
    Patches                     KustomizePatches          // Strategic merge patches
    Components                  []string                  // Kustomize components
    IgnoreMissingComponents     bool                      // Don't error on missing components
    LabelWithoutSelector        bool                      // Add labels without selectors
    KubeVersion                 string                    // Kubernetes version
    APIVersions                 []string                  // API versions
    LabelIncludeTemplates       bool                      // Include labels in templates
}
```

**UI Fields:**

1. **Version**
   - **Field:** `spec.source.kustomize.version`
   - **Type:** `string`
   - **UI Control:** Autocomplete with available Kustomize versions

2. **Name Prefix**
   - **Field:** `spec.source.kustomize.namePrefix`
   - **Type:** `string`
   - **UI Control:** Text input

3. **Name Suffix**
   - **Field:** `spec.source.kustomize.nameSuffix`
   - **Type:** `string`
   - **UI Control:** Text input

4. **Images**
   - **Field:** `spec.source.kustomize.images`
   - **Type:** `[]KustomizeImage`
   - **UI Control:** Array input with fields:
     - `name`: Original image name
     - `newName`: New image name
     - `newTag`: New image tag
     - `digest`: Image digest

5. **Common Labels**
   - **Field:** `spec.source.kustomize.commonLabels`
   - **Type:** `map[string]string`
   - **UI Control:** Key-value pair editor

6. **Common Annotations**
   - **Field:** `spec.source.kustomize.commonAnnotations`
   - **Type:** `map[string]string`
   - **UI Control:** Key-value pair editor

7. **Namespace Override**
   - **Field:** `spec.source.kustomize.namespace`
   - **Type:** `string`
   - **UI Control:** Text input

8. **Force Common Labels**
   - **Field:** `spec.source.kustomize.forceCommonLabels`
   - **Type:** `boolean`
   - **UI Control:** Checkbox

9. **Replicas**
   - **Field:** `spec.source.kustomize.replicas`
   - **Type:** `[]KustomizeReplica`
   - **UI Control:** Array input with fields:
     - `name`: Resource name
     - `count`: Replica count

---

#### Directory Settings

**Complete Interface:**
```go
type ApplicationSourceDirectory struct {
    Recurse bool                          // Recurse into subdirectories
    Jsonnet ApplicationSourceJsonnet      // Jsonnet configuration
    Exclude string                        // Exclude pattern
    Include string                        // Include pattern
}
```

**UI Fields:**

1. **Recurse**
   - **Field:** `spec.source.directory.recurse`
   - **Type:** `boolean`
   - **UI Control:** Checkbox
   - **Default:** `false`

2. **Include**
   - **Field:** `spec.source.directory.include`
   - **Type:** `string` (glob pattern)
   - **UI Control:** Text input
   - **Example:** `"*.yaml"`

3. **Exclude**
   - **Field:** `spec.source.directory.exclude`
   - **Type:** `string` (glob pattern)
   - **UI Control:** Text input
   - **Example:** `"*.tmp"`

4. **Jsonnet Settings** (if applicable)
   - Top-level arguments (TLAs)
   - External variables
   - Libraries

---

#### Plugin Settings

**Complete Interface:**
```go
type ApplicationSourcePlugin struct {
    Name       string                             // Plugin name
    Env        Env                                // Environment variables
    Parameters ApplicationSourcePluginParameters // Plugin parameters
}
```

**UI Fields:**

1. **Plugin Name**
   - **Field:** `spec.source.plugin.name`
   - **Type:** `string`
   - **UI Control:** Dropdown/autocomplete (loads available plugins)

2. **Environment Variables**
   - **Field:** `spec.source.plugin.env`
   - **Type:** `[]EnvEntry`
   - **UI Control:** Key-value pair array

3. **Parameters**
   - **Field:** `spec.source.plugin.parameters`
   - **Type:** Dynamic based on plugin
   - **UI Control:** Dynamic form based on plugin announcement

---

### D. Destination Settings

```typescript
export interface ApplicationDestination {
  server: string;      // Cluster API URL
  namespace: string;   // Target namespace
  name: string;        // Cluster name (alternative to server)
}
```

#### Cluster
- **Field:** `spec.destination.server` OR `spec.destination.name`
- **Type:** `string`
- **Required:** Yes (one of server or name)
- **UI Control:** Dropdown toggle between "URL" and "NAME" modes
  - URL mode: Shows cluster server URL
  - Name mode: Shows cluster name
- **Validation:** One of server or name must be provided
- **Examples:**
  - Server: `"https://kubernetes.default.svc"`
  - Name: `"in-cluster"`

**UI Pattern:**
```typescript
{
  title: 'CLUSTER',
  view: app.spec.destination.server,
  edit: (formApi: FormApi) => (
    <DataLoader load={() => services.clusters.list()}>
      {clusters => (
        <FormField
          formApi={formApi}
          field='spec.destination.server'
          component={ClusterFormField}
          componentProps={{clusters}}
        />
      )}
    </DataLoader>
  )
}
```

#### Namespace
- **Field:** `spec.destination.namespace`
- **Type:** `string`
- **Required:** Yes
- **UI Control:** Text input
- **Validation:** Required
- **Notes:** This is where resources will be deployed

---

### E. Sync Policy Settings

```typescript
export interface SyncPolicy {
  automated?: Automated;
  syncOptions?: string[];
  retry?: RetryStrategy;
}

export interface Automated {
  prune?: boolean;
  selfHeal?: boolean;
  allowEmpty?: boolean;
}
```

#### Automated Sync
- **Field:** `spec.syncPolicy.automated`
- **Type:** `object | null`
- **UI Control:** Toggle or checkbox to enable/disable
- **When enabled, shows sub-options:**

  1. **Auto-Prune**
     - **Field:** `spec.syncPolicy.automated.prune`
     - **Type:** `boolean`
     - **Default:** `false`
     - **UI Control:** Checkbox
     - **Description:** Automatically delete resources not in Git

  2. **Self-Heal**
     - **Field:** `spec.syncPolicy.automated.selfHeal`
     - **Type:** `boolean`
     - **Default:** `false`
     - **UI Control:** Checkbox
     - **Description:** Force cluster state to match Git when drift detected

  3. **Allow Empty**
     - **Field:** `spec.syncPolicy.automated.allowEmpty`
     - **Type:** `boolean`
     - **Default:** `false`
     - **UI Control:** Checkbox
     - **Description:** Allow application to have zero resources

#### Sync Options
- **Field:** `spec.syncPolicy.syncOptions`
- **Type:** `[]string`
- **UI Control:** Multi-select checkboxes

**Complete List of Sync Options:**

1. **Validate=false**
   - Skip schema validation
   - Useful for resources with unknown/custom types

2. **CreateNamespace=true**
   - Automatically create destination namespace if it doesn't exist

3. **PruneLast=true**
   - Prune resources as final step (after all other resources are synced)

4. **ApplyOutOfSyncOnly=true**
   - Only apply resources that are out-of-sync

5. **RespectIgnoreDifferences=true**
   - Respect ignoreDifferences configuration during apply

6. **ServerSideApply=true**
   - Use Kubernetes server-side apply instead of client-side

7. **PrunePropagationPolicy=<policy>**
   - **Values:** `foreground`, `background`, `orphan`
   - **UI Control:** Dropdown (when selected)
   - Controls how resources are pruned

8. **Replace=true**
   - Use `kubectl replace` instead of `kubectl apply`
   - **Warning:** May recreate resources

9. **FailOnSharedResource=true**
   - Fail sync if resources are managed by multiple applications

10. **SkipDryRunOnMissingResource=true**
    - Skip dry run for resources not yet known to cluster

**UI Pattern for Sync Options:**
```typescript
<FormField
  formApi={formApi}
  field='spec.syncPolicy.syncOptions'
  component={ApplicationSyncOptionsField}
/>
```

---

#### Retry Strategy

```typescript
export interface RetryStrategy {
  limit?: number;        // Max number of retries
  backoff?: Backoff;
}

export interface Backoff {
  duration?: string;     // Initial backoff duration
  factor?: number;       // Backoff multiplier
  maxDuration?: string;  // Maximum backoff duration
}
```

**UI Fields:**

1. **Enable Retry** (checkbox to show/hide retry settings)

2. **Retry Limit**
   - **Field:** `spec.syncPolicy.retry.limit`
   - **Type:** `number`
   - **Default:** `2`
   - **UI Control:** Number input
   - **Validation:** Must be positive

3. **Backoff Duration**
   - **Field:** `spec.syncPolicy.retry.backoff.duration`
   - **Type:** `string` (duration format)
   - **Default:** `"5s"`
   - **UI Control:** Text input
   - **Format:** `"5s"`, `"1m"`, `"1h10m30s"`
   - **Validation:** Valid duration string

4. **Backoff Max Duration**
   - **Field:** `spec.syncPolicy.retry.backoff.maxDuration`
   - **Type:** `string` (duration format)
   - **Default:** `"3m0s"`
   - **UI Control:** Text input

5. **Backoff Factor**
   - **Field:** `spec.syncPolicy.retry.backoff.factor`
   - **Type:** `number`
   - **Default:** `2`
   - **UI Control:** Number input
   - **Validation:** Must be positive

**UI Component Reference:**
```typescript
// From application-retry-options.tsx
<ApplicationRetryOptions
  formApi={formApi}
  field="spec.syncPolicy.retry"
/>
```

---

### F. Advanced Settings

#### Ignore Differences

```go
type ResourceIgnoreDifferences struct {
    Group                   string   `json:"group,omitempty"`
    Kind                    string   `json:"kind"`
    Name                    string   `json:"name,omitempty"`
    Namespace               string   `json:"namespace,omitempty"`
    JSONPointers            []string `json:"jsonPointers,omitempty"`
    JQPathExpressions       []string `json:"jqPathExpressions,omitempty"`
    ManagedFieldsManagers   []string `json:"managedFieldsManagers,omitempty"`
}
```

- **Field:** `spec.ignoreDifferences`
- **Type:** `[]ResourceIgnoreDifferences`
- **UI Control:** Array of objects with fields:

  1. **Group** (text input) - K8s API group
  2. **Kind** (text input) - Resource kind (required)
  3. **Name** (text input) - Specific resource name (optional)
  4. **Namespace** (text input) - Specific namespace (optional)
  5. **JSON Pointers** (array input) - JSONPath expressions to ignore
  6. **JQ Path Expressions** (array input) - JQ path expressions
  7. **Managed Fields Managers** (array input) - Field managers to ignore

**Example:**
```yaml
ignoreDifferences:
- group: apps
  kind: Deployment
  jsonPointers:
  - /spec/replicas
```

#### Info (Custom Metadata)

```typescript
export interface Info {
  name: string;
  value: string;
}
```

- **Field:** `spec.info`
- **Type:** `[]Info`
- **Purpose:** Display custom information in UI
- **UI Control:** Key-value pair array
- **Example:**
```yaml
info:
- name: "Documentation:"
  value: "https://example.com/docs"
- name: "Owner:"
  value: "platform-team@example.com"
```

#### Revision History Limit

- **Field:** `spec.revisionHistoryLimit`
- **Type:** `number`
- **Default:** `10`
- **UI Control:** Number input
- **Description:** Number of previous sync revisions to keep

---

## 3. UI Patterns & Components

### Form Controls Used

Based on ArgoCD's codebase:

1. **Text Input**
   - Used for: namespace, path, URLs, names
   - Component: `<input type="text">` or `FormField`

2. **Autocomplete/Dropdown**
   - Used for: project, cluster, repository
   - Component: `AutocompleteField`, `FormSelect`
   - Loads options from API endpoints

3. **Checkbox**
   - Used for: boolean flags (prune, selfHeal, recurse, etc.)
   - Component: `<Checkbox>` or `FormField` with checkbox type

4. **Toggle/Switch**
   - Used for: enabling automated sync
   - Component: Custom toggle component

5. **Number Input**
   - Used for: revisionHistoryLimit, retry limit, backoff factor
   - Component: `NumberField`
   - Validation: Must be positive integer

6. **Tags Input**
   - Used for: valueFiles, finalizers, arrays of strings
   - Component: `TagsInputField`
   - Features: Add/remove items, chip-style display

7. **Key-Value Pair Editor**
   - Used for: labels, annotations, parameters
   - Component: `MapInputField` (or similar)
   - Features: Add row, remove row, edit key and value

8. **Array Input**
   - Used for: sync options, ignore differences
   - Component: `ArrayInput`
   - Features: Add item, remove item, reorder

9. **YAML Editor**
   - Used for: Helm values, raw manifests
   - Component: `YamlEditor` or `MonacoEditor`
   - Features: Syntax highlighting, validation, multi-line

10. **Multi-Select Checkboxes**
    - Used for: sync options
    - Component: Custom checkbox group
    - Some options expand to show additional fields (e.g., PrunePropagationPolicy)

### Validation Patterns

```typescript
validate={input => ({
  'spec.project': !input.spec.project && 'Project name is required',
  'spec.destination.server': !input.spec.destination.server &&
    input.spec.destination.hasOwnProperty('server') &&
    'Cluster server is required',
  'spec.destination.name': !input.spec.destination.name &&
    input.spec.destination.hasOwnProperty('name') &&
    'Cluster name is required'
})}
```

**Validation Rules:**
- Required fields checked on save
- Duration strings validated for retry settings
- YAML syntax validated for values/manifests
- Positive numbers for numeric fields
- Valid URLs for repository URLs
- At least one of `destination.server` or `destination.name`

### Error Display

- Errors shown inline below each field
- Error messages in red text
- Form cannot be saved until validation passes
- Errors persist until field is corrected

### Array/List Handling

**Pattern for Array Fields:**
```typescript
// Tags-style for simple string arrays
<TagsInputField
  values={valueFiles}
  onChange={setValueFiles}
/>

// Row-based for complex arrays (like parameters)
{parameters.map((param, index) => (
  <div key={index} className="parameter-row">
    <input value={param.name} onChange={...} />
    <input value={param.value} onChange={...} />
    <button onClick={() => removeParameter(index)}>Remove</button>
  </div>
))}
<button onClick={addParameter}>Add Parameter</button>
```

### Dynamic Form Behavior

The form shows/hides sections based on:
- **Source type detection:**
  - Git → Show path, hide chart
  - Helm → Show chart, valueFiles, values
  - OCI → Show path or chart based on content

- **Tool detection** (within Git):
  - Helm → Show `spec.source.helm.*` fields
  - Kustomize → Show `spec.source.kustomize.*` fields
  - Directory → Show `spec.source.directory.*` fields
  - Plugin → Show `spec.source.plugin.*` fields

- **Sync policy enabled:**
  - When `automated` is null/undefined → Hide prune, selfHeal, allowEmpty
  - When `automated` is object → Show automation options

- **Retry enabled:**
  - Checkbox to enable retry
  - When enabled → Show limit, backoff settings

---

## 4. Save/Cancel Behavior

### EditablePanel Pattern

```typescript
const EditablePanel = ({ save, validate, values, items }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState(values);

  const handleEdit = () => setEditing(true);

  const handleCancel = () => {
    setFormValues(values);  // Reset to original
    setEditing(false);
  };

  const handleSave = async (formApi) => {
    const errors = validate(formApi.values);
    if (Object.keys(errors).some(key => errors[key])) {
      formApi.setErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await save(formApi.values);
      setEditing(false);
    } catch (error) {
      // Show error notification
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {editing ? (
        <Form initialValues={formValues} onSubmit={handleSave}>
          {/* Edit mode */}
          <button onClick={handleCancel}>Cancel</button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </Form>
      ) : (
        <>
          {/* View mode */}
          <button onClick={handleEdit}>Edit</button>
        </>
      )}
    </div>
  );
};
```

### Save Process

1. **User clicks "Edit"**
   - Panel enters edit mode
   - All editable fields become active
   - Current values loaded into form

2. **User modifies fields**
   - Changes tracked in form state
   - No API calls yet (optimistic UI)

3. **User clicks "Save"**
   - Validation runs on all fields
   - If validation fails:
     - Errors displayed inline
     - Form remains in edit mode
     - User can fix errors and retry
   - If validation passes:
     - API call made to update application
     - Loading spinner shown on save button
     - Button disabled during save

4. **API Response:**
   - **Success:**
     - Panel exits edit mode
     - Updated values displayed in view mode
     - Success notification (toast/banner)
     - React Query cache invalidated
   - **Failure:**
     - Error notification shown
     - Form remains in edit mode
     - User can retry or cancel

5. **User clicks "Cancel"**
   - Form values reset to original
   - Panel exits edit mode
   - No API call made

### API Endpoints

**Full Application Update:**
```typescript
// PUT /api/v1/applications/{name}
update(app: Application): Promise<Application> {
  return requests.put(`/applications/${app.metadata.name}`, app);
}
```

**Spec-Only Update:**
```typescript
// PUT /api/v1/applications/{name}/spec
updateSpec(name: string, spec: ApplicationSpec): Promise<ApplicationSpec> {
  return requests.put(`/applications/${name}/spec`, spec);
}
```

**Request Body Structure:**
```json
{
  "metadata": {
    "name": "my-app",
    "namespace": "argocd",
    "labels": {
      "env": "production"
    },
    "annotations": {
      "notifications.argoproj.io/subscribe.on-sync-succeeded.slack": "my-channel"
    },
    "finalizers": ["resources-finalizer.argocd.argoproj.io"]
  },
  "spec": {
    "project": "default",
    "source": {
      "repoURL": "https://github.com/argoproj/argocd-example-apps",
      "targetRevision": "HEAD",
      "path": "guestbook",
      "helm": {
        "valueFiles": ["values-prod.yaml"],
        "parameters": [
          {"name": "image.tag", "value": "v1.2.3"}
        ]
      }
    },
    "destination": {
      "server": "https://kubernetes.default.svc",
      "namespace": "default"
    },
    "syncPolicy": {
      "automated": {
        "prune": true,
        "selfHeal": true,
        "allowEmpty": false
      },
      "syncOptions": [
        "CreateNamespace=true",
        "PruneLast=true"
      ],
      "retry": {
        "limit": 5,
        "backoff": {
          "duration": "5s",
          "factor": 2,
          "maxDuration": "3m"
        }
      }
    },
    "ignoreDifferences": [
      {
        "group": "apps",
        "kind": "Deployment",
        "jsonPointers": ["/spec/replicas"]
      }
    ],
    "info": [
      {"name": "Owner:", "value": "platform-team"}
    ]
  }
}
```

**Response:**
- **200 OK:** Returns updated `Application` object
- **400 Bad Request:** Validation errors
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Application doesn't exist

### Cache Invalidation

After successful save:
```typescript
onSuccess: (data, variables) => {
  queryClient.invalidateQueries({
    queryKey: applicationKeys.detail(variables.name)
  });
  queryClient.invalidateQueries({
    queryKey: applicationKeys.lists()
  });
}
```

---

## 5. Code References

### Key Files

#### Main Application Summary Component
**File:** `ui/src/app/applications/components/application-summary/application-summary.tsx`
- **Lines:** ~100-500
- **Purpose:** Renders the editable application details panel
- **Key Features:**
  - EditablePanel usage
  - Field-by-field edit/view definitions
  - Validation logic
  - Save handler

**Example Code:**
```typescript
const attributes = [
  {
    title: 'PROJECT',
    view: <Link to={'/settings/projects/' + app.spec.project}>{app.spec.project}</Link>,
    edit: (formApi: FormApi) => (
      <DataLoader load={() => services.projects.list()}>
        {projects => (
          <FormField
            formApi={formApi}
            field='spec.project'
            component={FormSelect}
            componentProps={{options: projects.map(p => p.metadata.name)}}
          />
        )}
      </DataLoader>
    )
  },
  // ... more fields
];

const updateApp = async (input: Application) => {
  return services.applications.update(input);
};

return (
  <EditablePanel
    save={updateApp}
    validate={input => ({
      'spec.project': !input.spec.project && 'Project name is required',
      // ... more validation
    })}
    values={app}
    title={app.metadata.name.toLocaleUpperCase()}
    items={attributes}
  />
);
```

---

#### Application Parameters Component
**File:** `ui/src/app/applications/components/application-parameters/application-parameters.tsx`
- **Lines:** ~50-300
- **Purpose:** Renders source-specific configuration (Helm, Kustomize, etc.)
- **Key Features:**
  - Dynamic rendering based on source type
  - Helm values editor
  - Kustomize image overrides
  - Plugin configuration

**Pattern:**
```typescript
export const ApplicationParameters = ({source, formApi}) => {
  if (source.helm) {
    return <HelmParameters helm={source.helm} formApi={formApi} />;
  } else if (source.kustomize) {
    return <KustomizeParameters kustomize={source.kustomize} formApi={formApi} />;
  } else if (source.plugin) {
    return <PluginParameters plugin={source.plugin} formApi={formApi} />;
  } else if (source.directory) {
    return <DirectoryParameters directory={source.directory} formApi={formApi} />;
  }
  return null;
};
```

---

#### Editable Panel Component
**File:** `ui/src/app/shared/components/editable-panel/editable-panel.tsx`
- **Lines:** ~20-200
- **Purpose:** Reusable component for inline editing
- **Key Features:**
  - Edit/view mode toggling
  - Save/cancel buttons
  - Validation support
  - Loading states
  - Collapsible sections

**Interface:**
```typescript
interface EditablePanelProps<T> {
  values: T;
  save: (values: T) => Promise<any>;
  validate?: (values: T) => {[field: string]: string | boolean};
  onModeSwitch?: (isEditing: boolean) => void;
  items: EditablePanelItem[];
  title?: string;
  collapsible?: boolean;
}

interface EditablePanelItem {
  title: string;
  view: React.ReactNode;
  edit?: (formApi: FormApi) => React.ReactNode;
}
```

---

#### Sync Options Component
**File:** `ui/src/app/applications/components/application-sync-options/application-sync-options.tsx`
- **Lines:** ~30-150
- **Purpose:** Multi-select sync options
- **Key Features:**
  - Checkbox list of all sync options
  - Special handling for PrunePropagationPolicy (shows dropdown)
  - Tooltips/help text for each option
  - Warning for destructive options (Replace, Force)

**Available Options:**
```typescript
const SYNC_OPTIONS = [
  { value: 'Validate=false', label: 'Skip Schema Validation' },
  { value: 'CreateNamespace=true', label: 'Auto-Create Namespace' },
  { value: 'PruneLast=true', label: 'Prune Last' },
  { value: 'ApplyOutOfSyncOnly=true', label: 'Apply Out of Sync Only' },
  { value: 'RespectIgnoreDifferences=true', label: 'Respect Ignore Differences' },
  { value: 'ServerSideApply=true', label: 'Server-Side Apply' },
  {
    value: 'PrunePropagationPolicy=',
    label: 'Prune Propagation Policy',
    options: ['foreground', 'background', 'orphan']
  },
  {
    value: 'Replace=true',
    label: 'Replace',
    warning: 'May cause resource recreation'
  },
];
```

---

#### Retry Options Component
**File:** `ui/src/app/applications/components/application-retry-options/application-retry-options.tsx`
- **Lines:** ~20-100
- **Purpose:** Configure retry strategy
- **Key Features:**
  - Enable/disable checkbox
  - Numeric inputs for limit and factor
  - Duration inputs with validation
  - Default values

**Code:**
```typescript
export const ApplicationRetryOptions = ({formApi, field}) => {
  const retryEnabled = formApi.getValue(`${field}.limit`) != null;

  return (
    <div>
      <Checkbox
        checked={retryEnabled}
        onChange={() => {
          if (retryEnabled) {
            formApi.setValue(field, null);
          } else {
            formApi.setValue(field, {
              limit: 2,
              backoff: {
                duration: '5s',
                factor: 2,
                maxDuration: '3m0s'
              }
            });
          }
        }}
      />
      {retryEnabled && (
        <>
          <NumberField formApi={formApi} field={`${field}.limit`} label="Limit" />
          <DurationField formApi={formApi} field={`${field}.backoff.duration`} label="Duration" />
          <NumberField formApi={formApi} field={`${field}.backoff.factor`} label="Factor" />
          <DurationField formApi={formApi} field={`${field}.backoff.maxDuration`} label="Max Duration" />
        </>
      )}
    </div>
  );
};
```

---

#### Applications Service
**File:** `ui/src/app/shared/services/applications-service.ts`
- **Lines:** ~50-500
- **Purpose:** API client for application operations
- **Key Methods:**

```typescript
export class ApplicationsService {
  // Create new application
  public async create(app: Application): Promise<Application> {
    return requests.post('/applications', app);
  }

  // Update entire application
  public async update(app: Application): Promise<Application> {
    return requests.put(`/applications/${app.metadata.name}`, app);
  }

  // Update only spec
  public async updateSpec(
    name: string,
    spec: ApplicationSpec
  ): Promise<ApplicationSpec> {
    return requests.put(`/applications/${name}/spec`, spec);
  }

  // Get single application
  public async get(
    name: string,
    refresh?: 'normal' | 'hard'
  ): Promise<Application> {
    return requests.get(`/applications/${name}`, {
      params: { refresh }
    });
  }

  // List applications
  public async list(
    projects?: string[],
    options?: { fields?: string[] }
  ): Promise<ApplicationList> {
    return requests.get('/applications', {
      params: { project: projects, fields: options?.fields }
    });
  }

  // Delete application
  public async delete(
    name: string,
    cascade?: boolean,
    propagationPolicy?: 'foreground' | 'background' | 'orphan'
  ): Promise<void> {
    return requests.delete(`/applications/${name}`, {
      params: { cascade, propagationPolicy }
    });
  }

  // Sync application
  public async sync(
    name: string,
    params: {
      revision?: string;
      prune?: boolean;
      dryRun?: boolean;
      strategy?: SyncStrategy;
      resources?: SyncOperationResource[];
      syncOptions?: string[];
    }
  ): Promise<Application> {
    return requests.post(`/applications/${name}/sync`, params);
  }
}
```

---

#### Type Definitions
**File:** `ui/src/app/shared/models.ts`
- **Lines:** ~100-800
- **Purpose:** TypeScript interfaces matching ArgoCD API
- **Key Types:**
  - `Application`
  - `ApplicationSpec`
  - `ApplicationSource` (+ Helm, Kustomize, Directory, Plugin)
  - `ApplicationDestination`
  - `SyncPolicy`
  - `Automated`
  - `RetryStrategy`
  - `ResourceIgnoreDifferences`

---

#### Go Type Definitions (API Contract)
**File:** `pkg/apis/application/v1alpha1/types.go`
- **Lines:** ~100-2000
- **Purpose:** Canonical type definitions in Go
- **Key Structs:**
  - `Application`
  - `ApplicationSpec`
  - `ApplicationSource`
  - `ApplicationSourceHelm`
  - `ApplicationSourceKustomize`
  - `ApplicationSourceDirectory`
  - `ApplicationSourcePlugin`
  - `ApplicationDestination`
  - `SyncPolicy`
  - `ResourceIgnoreDifferences`

---

## 6. Implementation Recommendations for Cased CD

### Architecture Alignment

Your existing patterns align well with ArgoCD's approach:

✅ **React Query for API calls** - ArgoCD uses similar caching patterns
✅ **Service layer** - Match ArgoCD's `applications-service.ts`
✅ **TypeScript interfaces** - Use ArgoCD's `models.ts` as reference
✅ **Form validation** - Implement similar validate functions

### Suggested Approach

#### 1. Create ApplicationSettings Component

```typescript
// src/components/application-settings/application-settings.tsx
import { Application } from '@/types/api';
import { useUpdateApplication } from '@/services/applications';

export function ApplicationSettings({ application }: { application: Application }) {
  const updateMutation = useUpdateApplication();

  const handleSave = async (updatedApp: Application) => {
    await updateMutation.mutateAsync({
      name: application.metadata.name,
      app: updatedApp
    });
  };

  return (
    <EditablePanel
      values={application}
      onSave={handleSave}
      validate={validateApplication}
      items={buildSettingsItems(application)}
    />
  );
}
```

#### 2. Build Reusable EditablePanel

Consider using shadcn/ui components:
- `Form` for form state management
- `Input` for text fields
- `Checkbox` for booleans
- `Select` for dropdowns
- `Textarea` for YAML values

```typescript
// src/components/ui/editable-panel.tsx
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';

export function EditablePanel({ values, onSave, validate, items }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="space-y-4">
      {isEditing ? (
        <Form
          defaultValues={values}
          onSubmit={async (data) => {
            const errors = validate(data);
            if (Object.values(errors).some(Boolean)) return;

            setIsSaving(true);
            try {
              await onSave(data);
              setIsEditing(false);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {/* Render editable items */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Form>
      ) : (
        <>
          {/* Render view-only items */}
          <Button onClick={() => setIsEditing(true)}>Edit</Button>
        </>
      )}
    </div>
  );
}
```

#### 3. Source-Specific Settings

Create separate components for each source type:

```typescript
// src/components/application-settings/helm-settings.tsx
export function HelmSettings({ source, onChange }) {
  return (
    <div className="space-y-4">
      <TagsInput
        label="Value Files"
        value={source.helm?.valueFiles || []}
        onChange={(files) => onChange({...source, helm: {...source.helm, valueFiles: files}})}
      />
      <YamlEditor
        label="Values"
        value={source.helm?.values || ''}
        onChange={(values) => onChange({...source, helm: {...source.helm, values}})}
      />
      {/* More helm-specific fields */}
    </div>
  );
}
```

#### 4. Validation

```typescript
// src/lib/validation/application.ts
export function validateApplication(app: Application): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!app.spec.project) {
    errors['spec.project'] = 'Project is required';
  }

  if (!app.spec.destination.server && !app.spec.destination.name) {
    errors['spec.destination'] = 'Either server or name must be specified';
  }

  if (!app.spec.destination.namespace) {
    errors['spec.destination.namespace'] = 'Namespace is required';
  }

  // Validate retry durations
  if (app.spec.syncPolicy?.retry?.backoff?.duration) {
    if (!isValidDuration(app.spec.syncPolicy.retry.backoff.duration)) {
      errors['spec.syncPolicy.retry.backoff.duration'] = 'Invalid duration format';
    }
  }

  return errors;
}

function isValidDuration(duration: string): boolean {
  return /^\d+[smh](\d+[smh])*$/.test(duration);
}
```

#### 5. API Service Methods

Add to your existing `src/services/applications.ts`:

```typescript
// Add to applicationsApi object
updateApplication: async (name: string, app: Application) => {
  const response = await api.put<Application>(
    `/applications/${name}`,
    app
  );
  return response.data;
},

updateApplicationSpec: async (name: string, spec: ApplicationSpec) => {
  const response = await api.put<ApplicationSpec>(
    `/applications/${name}/spec`,
    spec
  );
  return response.data;
},

// Add React Query hook
export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, app }: { name: string; app: Application }) =>
      applicationsApi.updateApplication(name, app),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(variables.name)
      });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.lists()
      });
    }
  });
}
```

### Component Structure

Suggested file organization:

```
src/components/application-settings/
├── application-settings.tsx          # Main settings panel
├── editable-panel.tsx                # Reusable edit/view wrapper
├── general-settings.tsx              # Project, namespace, labels
├── source-settings.tsx               # Repository, revision, path
├── helm-settings.tsx                 # Helm-specific fields
├── kustomize-settings.tsx            # Kustomize-specific fields
├── directory-settings.tsx            # Directory-specific fields
├── plugin-settings.tsx               # Plugin-specific fields
├── destination-settings.tsx          # Cluster, namespace
├── sync-policy-settings.tsx          # Automated, prune, self-heal
├── sync-options.tsx                  # Multi-select sync options
├── retry-settings.tsx                # Retry strategy
├── ignore-differences-settings.tsx   # Ignore diffs configuration
└── info-settings.tsx                 # Custom metadata
```

### UI Components to Install

```bash
# Core form components
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add checkbox
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add switch
npx shadcn@latest add label

# Advanced components
npx shadcn@latest add combobox    # For autocomplete
npx shadcn@latest add tabs         # If using tabs for organization
npx shadcn@latest add accordion    # If using collapsible sections
npx shadcn@latest add separator    # For visual separation
```

### Custom Components Needed

1. **TagsInput** - For arrays of strings (valueFiles, finalizers)
2. **KeyValueEditor** - For labels, annotations, parameters
3. **YamlEditor** - For Helm values (consider monaco-react or CodeMirror)
4. **DurationInput** - For retry backoff durations with validation
5. **ClusterSelect** - Toggle between URL/Name modes

### Testing Strategy

1. **Unit Tests:**
   - Validation functions
   - Form state management
   - Individual field components

2. **Integration Tests:**
   - Save/cancel flow
   - API call verification
   - Cache invalidation

3. **E2E Tests (Playwright):**
   - Open settings panel
   - Edit various fields
   - Save and verify changes
   - Cancel and verify rollback
   - Test validation errors

4. **Compatibility Tests:**
   - Test against real ArgoCD API
   - Verify request/response structure matches
   - Test with various application configurations

### Potential Pitfalls

1. **Deep Object Updates**
   - Be careful updating nested fields like `spec.source.helm.parameters`
   - Use immutable update patterns or libraries like Immer

2. **Conditional Fields**
   - Ensure UI properly shows/hides fields based on state
   - Example: Don't show `automated.prune` if `automated` is null

3. **Duration Format**
   - Validate format: `"5s"`, `"1m"`, `"1h30m45s"`
   - ArgoCD uses Go duration strings

4. **Cluster Server vs Name**
   - Only one should be set, not both
   - UI should toggle between modes, clearing the unused field

5. **Multi-Source Apps**
   - Handle both `spec.source` (single) and `spec.sources` (array)
   - UI should detect and render appropriately

6. **YAML Parsing**
   - Helm values are YAML strings, not objects
   - Parse/validate YAML before saving

### Performance Considerations

1. **Lazy Loading:**
   - Load autocomplete options (clusters, projects, repos) on demand
   - Don't fetch all on page load

2. **Debouncing:**
   - Debounce YAML validation
   - Debounce autocomplete searches

3. **Optimistic Updates:**
   - Update UI immediately on save
   - Rollback if API call fails

4. **Cache Strategy:**
   - Use React Query's staleTime for settings data
   - Invalidate on save to refetch latest

---

## Summary

ArgoCD's application settings interface is a comprehensive, inline-editable panel that provides access to all application configuration fields. The implementation uses:

- **EditablePanel component** for inline editing with save/cancel
- **Dynamic field rendering** based on source type (Git/Helm/Kustomize/etc.)
- **Field-level validation** with inline error display
- **PUT /api/v1/applications/{name}** for updates
- **React Query-style** cache invalidation after mutations
- **Sliding sidebar** layout for the settings panel

For Cased CD, you should:
1. Create an `EditablePanel` component using shadcn/ui primitives
2. Build source-type-specific settings components
3. Implement validation matching ArgoCD's rules
4. Use your existing service layer pattern with React Query
5. Test thoroughly against real ArgoCD API for compatibility

The settings panel should be accessible from the application details view, likely via a "Settings" or "Edit" button that opens a sheet/drawer component (shadcn/ui Sheet).
