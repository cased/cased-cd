import { IconUser, IconEmail, IconShield, IconClock3, IconKey } from 'obra-icons-react'
import { Badge } from '@/components/ui/badge'

export function UserInfoPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-6 py-3">
          <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">User Info</h1>
          <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            View your user information and permissions
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-4 max-w-4xl">
          {/* Profile Card */}
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 mb-3">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="h-12 w-12 rounded bg-white dark:bg-black flex items-center justify-center text-lg font-semibold text-black dark:text-white">
                AD
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-black dark:text-white">Admin User</h2>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 mb-2">
                  <IconEmail size={14} />
                  <span className="text-xs">admin@cased.cd</span>
                </div>
                <div className="flex gap-1.5">
                  <Badge variant="outline" className="gap-1">
                    <IconShield size={10} />
                    Administrator
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <IconClock3 size={10} />
                    Member since Jan 2024
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-3 md:grid-cols-2 mb-3">
            {/* Account Details */}
            <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
              <h3 className="font-medium text-sm text-black dark:text-white mb-2 flex items-center gap-1.5">
                <IconUser size={14} />
                Account Details
              </h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Username</dt>
                  <dd className="mt-0.5 text-xs text-neutral-800 dark:text-neutral-200 font-mono">admin</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">User ID</dt>
                  <dd className="mt-0.5 text-xs text-neutral-800 dark:text-neutral-200 font-mono">usr_2kj4h3k2j4h3</dd>
                </div>
                <div>
                  <dt className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Issuer</dt>
                  <dd className="mt-0.5 text-xs text-neutral-800 dark:text-neutral-200 font-mono">cased-cd</dd>
                </div>
              </dl>
            </div>

            {/* Groups & Permissions */}
            <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
              <h3 className="font-medium text-sm text-black dark:text-white mb-2 flex items-center gap-1.5">
                <IconShield size={14} />
                Groups & Permissions
              </h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Groups</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    <Badge>admins</Badge>
                    <Badge variant="outline">developers</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Permissions</dt>
                  <dd className="mt-1 text-xs text-neutral-800 dark:text-neutral-200">
                    <ul className="space-y-1">
                      <li className="flex items-center gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-grass-9" />
                        Full cluster access
                      </li>
                      <li className="flex items-center gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-grass-9" />
                        Create & delete applications
                      </li>
                      <li className="flex items-center gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-grass-9" />
                        Manage repositories
                      </li>
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* API Tokens */}
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
            <h3 className="font-medium text-sm text-black dark:text-white mb-2 flex items-center gap-1.5">
              <IconKey size={14} />
              API Tokens
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="font-medium text-xs text-black dark:text-white">Production Token</div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">•••••••••••••••••••••••••••</div>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="font-medium text-xs text-black dark:text-white">Staging Token</div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">•••••••••••••••••••••••••••</div>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserInfoPage
