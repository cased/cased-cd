import { IconUser as User, IconEmail as Mail, IconShield as Shield, IconClock3 as Clock, IconKey as Key } from 'obra-icons-react'
import { Badge } from '@/components/ui/badge'

export function UserInfoPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-black dark:text-white tracking-tight">User Info</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            View your user information and permissions
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white dark:bg-black">
        <div className="p-8 max-w-4xl">
          {/* Profile Card */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-8 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-full bg-white dark:bg-black flex items-center justify-center text-2xl font-semibold text-black dark:text-white">
                AD
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-semibold text-black dark:text-white">Admin User</h2>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 mb-4">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">admin@cased.cd</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="gap-1.5">
                    <Shield className="h-3 w-3" />
                    Administrator
                  </Badge>
                  <Badge variant="outline" className="gap-1.5">
                    <Clock className="h-3 w-3" />
                    Member since Jan 2024
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {/* Account Details */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
              <h3 className="font-medium text-black dark:text-white mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Details
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Username</dt>
                  <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 font-mono">admin</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500 uppercase tracking-wider">User ID</dt>
                  <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 font-mono">usr_2kj4h3k2j4h3</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Issuer</dt>
                  <dd className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 font-mono">cased-cd</dd>
                </div>
              </dl>
            </div>

            {/* Groups & Permissions */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
              <h3 className="font-medium text-black dark:text-white mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Groups & Permissions
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Groups</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    <Badge>admins</Badge>
                    <Badge variant="outline">developers</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Permissions</dt>
                  <dd className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Full cluster access
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Create & delete applications
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Manage repositories
                      </li>
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* API Tokens */}
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6">
            <h3 className="font-medium text-black dark:text-white mb-4 flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Tokens
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="font-medium text-sm text-black dark:text-white">Production Token</div>
                  <div className="text-xs text-neutral-500 font-mono mt-1">•••••••••••••••••••••••••••</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="font-medium text-sm text-black dark:text-white">Staging Token</div>
                  <div className="text-xs text-neutral-500 font-mono mt-1">•••••••••••••••••••••••••••</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
