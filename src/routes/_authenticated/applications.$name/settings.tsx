import { createFileRoute } from '@tanstack/react-router'
import { ApplicationSettingsPage } from '@/pages/application-settings'

export const Route = createFileRoute('/_authenticated/applications/$name/settings')({
  component: ApplicationSettingsPage,
})
