import { createFileRoute } from '@tanstack/react-router'
import { CertificatesPage } from '@/pages/certificates'

export const Route = createFileRoute('/_authenticated/certificates')({
  component: CertificatesPage,
})
