import { createFileRoute } from '@tanstack/react-router'
import { UserInfoPage } from '@/pages/user-info'

export const Route = createFileRoute('/_authenticated/user-info')({
  component: UserInfoPage,
})
