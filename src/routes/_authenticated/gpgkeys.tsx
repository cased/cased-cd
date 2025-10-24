import { createFileRoute } from '@tanstack/react-router'
import { GPGKeysPage } from '@/pages/gpgkeys'

export const Route = createFileRoute('/_authenticated/gpgkeys')({
  component: GPGKeysPage,
})
