import { useState } from 'react'
import { IconClose, IconCopy, IconDownload, IconDocumentCode, IconEdit } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml'
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import * as YAML from 'js-yaml'
import { ResourceEditModal } from './resource-edit-modal'
import { useResource } from '@/services/applications'
import type { Application } from '@/types/api'

SyntaxHighlighter.registerLanguage('yaml', yaml)

interface K8sResource {
  kind: string
  name: string
  namespace?: string
  status?: string
  health?: {
    status?: string
  }
  group?: string
  version?: string
}

interface ResourceDetailsPanelProps {
  resource: K8sResource
  onClose: () => void
  appName: string
  app: Application
}

export function ResourceDetailsPanel({ resource, onClose, appName, app }: ResourceDetailsPanelProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Fetch the resource manifest
  const { data: resourceData } = useResource({
    appName,
    resourceName: resource.name,
    kind: resource.kind,
    namespace: resource.namespace,
    group: resource.group,
    version: resource.version,
  })

  const manifest = resourceData as Record<string, unknown> | undefined

  // Convert manifest to YAML string
  const yamlString = manifest
    ? YAML.dump(manifest, { indent: 2, lineWidth: -1 })
    : `# Loading manifest...
# This is placeholder data for: ${resource.name}

kind: ${resource.kind}
metadata:
  name: ${resource.name}
  namespace: ${resource.namespace || 'default'}
status:
  health: ${resource.health?.status || 'Unknown'}
  sync: ${resource.status || 'Unknown'}
`

  // Detect if we're in dark mode by checking if body has dark class
  const isDark = document.body.classList.contains('dark')

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlString)
  }

  const handleDownload = () => {
    const blob = new Blob([yamlString], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${resource.kind}-${resource.name}.yaml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-card border-l border-border flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <IconDocumentCode size={20} className="text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground truncate">{resource.name}</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {resource.kind}
              </Badge>
              <span>·</span>
              <span>{resource.namespace || 'default'}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <IconClose size={16} />
          </Button>
        </div>

        {/* Resource status */}
        <div className="flex items-center gap-2">
          {resource.health?.status && (
            <Badge
              variant={resource.health.status === 'Healthy' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {resource.health.status}
            </Badge>
          )}
          {resource.status && (
            <Badge variant={resource.status === 'Synced' ? 'default' : 'destructive'} className="text-xs">
              {resource.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-b border-border p-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
          <IconCopy size={14} />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
          <IconDownload size={14} />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
          disabled={!manifest}
          className="gap-1"
        >
          <IconEdit size={14} />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-border overflow-hidden">
          <SyntaxHighlighter
            language="yaml"
            style={isDark ? atomOneDark : atomOneLight}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: isDark ? '#0a0a0a' : '#fafafa',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
            showLineNumbers
            wrapLines
          >
            {yamlString}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Edit Modal */}
      {manifest && (
        <ResourceEditModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          resource={{
            kind: resource.kind,
            name: resource.name,
            namespace: resource.namespace,
            manifest,
          }}
          app={app}
          appName={appName}
        />
      )}
    </div>
  )
}
