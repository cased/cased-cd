import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/applications/$name/')({
  component: RedirectToTree,
})

function RedirectToTree() {
  return (
    <Navigate
      to="/applications/$name/tree"
      params={(prev) => prev}
    />
  )
}
