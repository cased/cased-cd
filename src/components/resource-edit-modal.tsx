import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconCircleWarning, IconEdit } from 'obra-icons-react'
import {
  getEditableFields,
  getNestedValue,
  setNestedValue,
  canEditResource,
  type FieldDefinition,
} from '@/lib/k8s-field-rules'
import { usePatchResource } from '@/services/applications'
import type { Application } from '@/types/api'
import * as YAML from 'js-yaml'

interface ResourceEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: {
    kind: string
    name: string
    namespace?: string
    manifest: Record<string, unknown>
  }
  app: Application
  appName: string
}

export function ResourceEditModal({ open, onOpenChange, resource, app, appName }: ResourceEditModalProps) {
  const [mode, setMode] = useState<'quick' | 'yaml'>('quick')
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({})
  const [yamlContent, setYamlContent] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const patchMutation = usePatchResource()

  // Check if editing is allowed
  const editCheck = canEditResource(app)

  // Get common editable fields for this resource kind, filtered to only those that exist in manifest
  const allEditableFields = getEditableFields(resource.kind)
  const editableFields = Object.fromEntries(
    Object.entries(allEditableFields).filter(([, fieldDef]) => {
      const value = getNestedValue(resource.manifest, fieldDef.path)
      return value !== undefined
    })
  )
  const hasQuickEditFields = Object.keys(editableFields).length > 0

  // Initialize YAML content when modal opens
  useEffect(() => {
    if (open && resource.manifest) {
      setYamlContent(YAML.dump(resource.manifest, { indent: 2, lineWidth: -1 }))
      setEditedValues({})
    }
  }, [open, resource.manifest])

  const handleQuickEdit = async () => {
    try {
      // Build patch object from edited values
      const patch: Record<string, unknown> = {}

      Object.entries(editedValues).forEach(([fieldName, value]) => {
        const fieldDef = editableFields[fieldName]
        if (fieldDef && value !== undefined) {
          setNestedValue(patch, fieldDef.path, value)
        }
      })

      // Extract API version info
      const apiVersion = (resource.manifest.apiVersion as string) || 'v1'
      const [group, version] = apiVersion.includes('/') ? apiVersion.split('/') : ['', apiVersion]

      await patchMutation.mutateAsync({
        appName,
        resourceName: resource.name,
        kind: resource.kind,
        namespace: resource.namespace,
        group,
        version,
        patch,
        patchType: 'application/merge-patch+json',
      })

      onOpenChange(false)
    } catch (err) {
      console.error('Patch error:', err)
    }
  }

  const handleYamlEdit = async () => {
    try {
      const parsedManifest = YAML.load(yamlContent) as Record<string, unknown>

      // Extract API version info
      const apiVersion = (parsedManifest.apiVersion as string) || 'v1'
      const [group, version] = apiVersion.includes('/') ? apiVersion.split('/') : ['', apiVersion]

      await patchMutation.mutateAsync({
        appName,
        resourceName: resource.name,
        kind: resource.kind,
        namespace: resource.namespace,
        group,
        version,
        patch: parsedManifest,
        patchType: 'application/merge-patch+json',
      })

      onOpenChange(false)
    } catch (err) {
      console.error('YAML parse/patch error:', err)
    }
  }

  const handleApplyClick = () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    // Already confirmed, proceed with apply
    if (mode === 'quick') {
      handleQuickEdit()
    } else {
      handleYamlEdit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        {/* Header - Fixed */}
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconEdit size={20} />
              Edit {resource.kind}: {resource.name}
            </DialogTitle>
            <DialogDescription>
              {resource.namespace && `Namespace: ${resource.namespace}`}
            </DialogDescription>
          </DialogHeader>

          {/* Auto-sync warning */}
          {!editCheck.allowed && (
            <Alert variant="destructive" className="mt-4">
              <IconCircleWarning size={16} />
              <AlertDescription className="ml-2">{editCheck.reason}</AlertDescription>
            </Alert>
          )}

          {/* General warning */}
          {editCheck.warning && (
            <Alert className="mt-4">
              <IconCircleWarning size={16} />
              <AlertDescription className="ml-2">{editCheck.warning}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'yaml')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick" disabled={!hasQuickEditFields}>
                Quick Edit
              </TabsTrigger>
              <TabsTrigger value="yaml">YAML Mode</TabsTrigger>
            </TabsList>

            {/* Quick Edit Mode */}
            <TabsContent value="quick" className="space-y-4 mt-4">
              {!hasQuickEditFields ? (
                <Alert>
                  <AlertDescription>
                    Quick edit is not available for {resource.kind} resources. Use YAML mode instead.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {Object.entries(editableFields).map(([fieldName, fieldDef]) => (
                    <FieldEditor
                      key={fieldName}
                      fieldName={fieldName}
                      fieldDef={fieldDef}
                      manifest={resource.manifest}
                      value={editedValues[fieldName]}
                      onChange={(value) =>
                        setEditedValues((prev) => ({
                          ...prev,
                          [fieldName]: value,
                        }))
                      }
                    />
                  ))}
                </>
              )}
            </TabsContent>

            {/* YAML Mode */}
            <TabsContent value="yaml" className="mt-4">
              <div className="space-y-2">
                <Label>Resource Manifest (YAML)</Label>
                <textarea
                  className="w-full h-96 font-mono text-sm p-4 bg-muted rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  value={yamlContent}
                  onChange={(e) => setYamlContent(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Actions - Sticky Footer */}
        <div className="p-6 pt-4 border-t bg-card space-y-4">
          {/* Inline Confirmation Warning */}
          {showConfirm && (
            <Alert variant="destructive">
              <IconCircleWarning size={16} />
              <AlertDescription className="ml-2">
                <strong>Confirm:</strong> This will modify <strong>{resource.kind}/{resource.name}</strong> directly
                in the live cluster, bypassing GitOps. The application will show as OutOfSync until you sync from Git.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (showConfirm) {
                  setShowConfirm(false)
                } else {
                  onOpenChange(false)
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyClick}
              disabled={!editCheck.allowed || patchMutation.isPending}
              variant={showConfirm ? 'destructive' : 'default'}
            >
              {patchMutation.isPending ? 'Applying...' : showConfirm ? 'Confirm Apply' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Field editor component for different field types
interface FieldEditorProps {
  fieldName: string
  fieldDef: FieldDefinition
  manifest: Record<string, unknown>
  value: unknown
  onChange: (value: unknown) => void
}

function FieldEditor({ fieldName, fieldDef, manifest, value, onChange }: FieldEditorProps) {
  const currentValue = value !== undefined ? value : getNestedValue(manifest, fieldDef.path)

  if (fieldDef.type === 'number') {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{fieldDef.label}</Label>
        {fieldDef.description && (
          <p className="text-sm text-muted-foreground">{fieldDef.description}</p>
        )}
        <Input
          id={fieldName}
          type="number"
          min={fieldDef.min}
          max={fieldDef.max}
          value={typeof currentValue === 'number' ? currentValue : ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        />
      </div>
    )
  }

  if (fieldDef.type === 'string') {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{fieldDef.label}</Label>
        {fieldDef.description && (
          <p className="text-sm text-muted-foreground">{fieldDef.description}</p>
        )}
        <Input
          id={fieldName}
          type="text"
          placeholder={fieldDef.placeholder}
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  if (fieldDef.type === 'boolean') {
    return (
      <div className="flex items-center space-x-2">
        <input
          id={fieldName}
          type="checkbox"
          checked={typeof currentValue === 'boolean' ? currentValue : false}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-border"
        />
        <Label htmlFor={fieldName}>{fieldDef.label}</Label>
      </div>
    )
  }

  // For complex types (array, object), show YAML editor
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>{fieldDef.label}</Label>
      {fieldDef.description && <p className="text-sm text-muted-foreground">{fieldDef.description}</p>}
      <textarea
        id={fieldName}
        className="w-full h-32 font-mono text-sm p-2 bg-muted rounded border border-border"
        value={value !== undefined ? YAML.dump(value) : YAML.dump(currentValue) || ''}
        onChange={(e) => {
          try {
            const parsed = YAML.load(e.target.value)
            onChange(parsed)
          } catch {
            // Invalid YAML, keep the text but don't update
          }
        }}
        spellCheck={false}
      />
    </div>
  )
}
