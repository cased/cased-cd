import { IconClose, IconCopy, IconDownload, IconDocumentCode } from 'obra-icons-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter'
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import * as YAML from 'js-yaml'

SyntaxHighlighter.registerLanguage('yaml', yaml)

interface ResourceDetailsPanelProps {
  resource: any
  onClose: () => void
  manifest?: any
}

export function ResourceDetailsPanel({ resource, onClose, manifest }: ResourceDetailsPanelProps) {
  // Convert manifest to YAML string
  const yamlString = manifest
    ? YAML.dump(manifest, { indent: 2, lineWidth: -1 })
    : `# Manifest not available
# This is placeholder data for: ${resource.name}

kind: ${resource.kind}
metadata:
  name: ${resource.name}
  namespace: ${resource.namespace || 'default'}
status:
  health: ${resource.health?.status || 'Unknown'}
  sync: ${resource.status || 'Unknown'}
`

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
    <div className="fixed inset-y-0 right-0 w-[600px] bg-neutral-950 border-l border-neutral-800 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="border-b border-neutral-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <IconDocumentCode className="h-5 w-5 text-neutral-400" />
              <h2 className="text-lg font-semibold text-white truncate">{resource.name}</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Badge variant="outline" className="text-xs">
                {resource.kind}
              </Badge>
              <span>·</span>
              <span>{resource.namespace || 'default'}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <IconClose className="h-4 w-4" />
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
      <div className="border-b border-neutral-800 p-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          <IconCopy className="h-3.5 w-3.5" />
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
          <IconDownload className="h-3.5 w-3.5" />
          Download
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-neutral-800 overflow-hidden">
          <SyntaxHighlighter
            language="yaml"
            style={atomOneDark}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: '#0a0a0a',
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
    </div>
  )
}
