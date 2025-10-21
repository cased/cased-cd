import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconNotification, IconCircleInfo, IconArrowRightUp, IconFilter } from 'obra-icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useApplications } from '@/services/applications'
import {
  useGlobalNotificationSubscriptions,
  parseNotificationSubscriptions,
} from '@/services/notifications'
import type { Application, GlobalNotificationSubscription, NotificationSubscription } from '@/types/api'

interface AppWithSubscriptions {
  app: Application
  subscriptions: NotificationSubscription[]
  globalSubscriptions: GlobalNotificationSubscription[]
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')

  const { data: appsData, isLoading: isLoadingApps } = useApplications()
  const { data: globalSubsData, isLoading: isLoadingGlobal } = useGlobalNotificationSubscriptions()

  const apps = appsData?.items || []
  const globalSubs = globalSubsData?.items || []

  // Parse subscriptions for all apps
  const appsWithSubscriptions: AppWithSubscriptions[] = apps.map((app) => ({
    app,
    subscriptions: parseNotificationSubscriptions(app),
    globalSubscriptions: globalSubs,
  }))

  // Get unique triggers and services for filters
  const allTriggers = new Set<string>()
  const allServices = new Set<string>()

  globalSubs.forEach((sub) => {
    allTriggers.add(sub.trigger)
    allServices.add(sub.service)
  })

  appsWithSubscriptions.forEach(({ subscriptions }) => {
    subscriptions.forEach((sub) => {
      allTriggers.add(sub.trigger)
      allServices.add(sub.service)
    })
  })

  const triggers = Array.from(allTriggers).sort()
  const services = Array.from(allServices).sort()

  // Filter apps
  const filteredApps = appsWithSubscriptions.filter(({ app, subscriptions, globalSubscriptions }) => {
    // Search filter
    if (searchQuery && !app.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    // Trigger filter
    if (triggerFilter !== 'all') {
      const hasMatchingTrigger =
        subscriptions.some((sub) => sub.trigger === triggerFilter) ||
        globalSubscriptions.some((sub) => sub.trigger === triggerFilter)
      if (!hasMatchingTrigger) return false
    }

    // Service filter
    if (serviceFilter !== 'all') {
      const hasMatchingService =
        subscriptions.some((sub) => sub.service === serviceFilter) ||
        globalSubscriptions.some((sub) => sub.service === serviceFilter)
      if (!hasMatchingService) return false
    }

    return true
  })

  // Calculate statistics
  const appsWithNotifications = appsWithSubscriptions.filter(({ subscriptions }) => subscriptions.length > 0).length
  const appsWithGlobalOnly = appsWithSubscriptions.filter(
    ({ subscriptions }) => subscriptions.length === 0
  ).length
  const totalCustomSubscriptions = appsWithSubscriptions.reduce(
    (sum, { subscriptions }) => sum + subscriptions.length,
    0
  )

  if (isLoadingApps || isLoadingGlobal) {
    return <LoadingSpinner message="Loading notifications..." />
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <IconNotification size={20} className="text-neutral-600 dark:text-neutral-400" />
          <h1 className="text-lg font-semibold text-black dark:text-white">Notification Subscriptions</h1>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Manage notification subscriptions across all applications
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Global Subscriptions
          </p>
          <p className="text-2xl font-semibold text-black dark:text-white">{globalSubs.length}</p>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">
            Applied to all applications
          </p>
        </div>

        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Apps with Custom Subscriptions
          </p>
          <p className="text-2xl font-semibold text-black dark:text-white">{appsWithNotifications}</p>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">
            {((appsWithNotifications / apps.length) * 100).toFixed(0)}% of all apps
          </p>
        </div>

        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Apps with Global Only
          </p>
          <p className="text-2xl font-semibold text-black dark:text-white">{appsWithGlobalOnly}</p>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">
            No custom subscriptions
          </p>
        </div>

        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <p className="text-[10px] text-neutral-500 dark:text-neutral-500 uppercase tracking-wider mb-1">
            Total Custom Subscriptions
          </p>
          <p className="text-2xl font-semibold text-black dark:text-white">{totalCustomSubscriptions}</p>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">
            Across all applications
          </p>
        </div>
      </div>

      {/* Global Subscriptions Section */}
      {globalSubs.length > 0 && (
        <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <IconCircleInfo size={16} className="text-blue-500" />
            <h2 className="text-sm font-medium text-black dark:text-white">Global Subscriptions</h2>
            <Badge variant="outline" className="text-[10px]">
              Inherited by all apps
            </Badge>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
            These subscriptions are configured globally and apply to all applications by default.
          </p>
          <div className="space-y-2">
            {globalSubs.map((sub, index) => (
              <div
                key={index}
                className="rounded border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sub.trigger}
                    </Badge>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">→</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sub.service}
                    </Badge>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">→</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      {sub.recipients.join(', ')}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                    Global
                  </Badge>
                </div>
                {sub.description && (
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">{sub.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <IconFilter size={14} className="text-neutral-600 dark:text-neutral-400" />
        <Input
          placeholder="Search applications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs max-w-xs"
        />
        <Select value={triggerFilter} onValueChange={setTriggerFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Triggers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            {triggers.map((trigger) => (
              <SelectItem key={trigger} value={trigger}>
                {trigger}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(searchQuery || triggerFilter !== 'all' || serviceFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setTriggerFilter('all')
              setServiceFilter('all')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <div className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
            <IconNotification size={36} className="text-neutral-600 mx-auto mb-2" />
            <p className="text-xs text-neutral-600 dark:text-neutral-400">No applications match the filters</p>
          </div>
        ) : (
          filteredApps.map(({ app, subscriptions, globalSubscriptions }) => (
            <div
              key={app.metadata.name}
              className="rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-white">{app.metadata.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-neutral-600 dark:text-neutral-400">
                      Project: {app.spec.project}
                    </p>
                    {subscriptions.length === 0 && globalSubscriptions.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        Global only
                      </Badge>
                    )}
                    {subscriptions.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {subscriptions.length} custom
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/applications/${app.metadata.name}`)}
                >
                  <IconArrowRightUp size={14} />
                  View App
                </Button>
              </div>

              <div className="space-y-2">
                {/* Inherited Global Subscriptions */}
                {globalSubscriptions.map((sub, index) => (
                  <div
                    key={`global-${index}`}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-blue-50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900"
                  >
                    <Badge variant="outline" className="text-[10px] font-mono bg-white dark:bg-neutral-950">
                      {sub.trigger}
                    </Badge>
                    <span className="text-neutral-600 dark:text-neutral-400">→</span>
                    <Badge variant="outline" className="text-[10px] font-mono bg-white dark:bg-neutral-950">
                      {sub.service}
                    </Badge>
                    <span className="text-neutral-600 dark:text-neutral-400">→</span>
                    <span className="text-neutral-600 dark:text-neutral-400">{sub.recipients.join(', ')}</span>
                    <div className="ml-auto">
                      <Badge variant="outline" className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                        Inherited
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Custom Subscriptions */}
                {subscriptions.map((sub, index) => (
                  <div
                    key={`custom-${index}`}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                  >
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sub.trigger}
                    </Badge>
                    <span className="text-neutral-600 dark:text-neutral-400">→</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sub.service}
                    </Badge>
                    <span className="text-neutral-600 dark:text-neutral-400">→</span>
                    <span className="text-neutral-600 dark:text-neutral-400">{sub.recipients.join(', ')}</span>
                    <div className="ml-auto">
                      <Badge variant="outline" className="text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                        Custom
                      </Badge>
                    </div>
                  </div>
                ))}

                {subscriptions.length === 0 && globalSubscriptions.length === 0 && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 italic p-2">
                    No notification subscriptions configured
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
