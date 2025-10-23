import type { ComponentType, ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  icon?: ComponentType<{ className?: string; size?: number }>;
  action?: ReactNode;
}

export function PageHeader({ title, description, subtitle, icon: Icon, action }: PageHeaderProps) {
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="h-8 w-8 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <Icon className="text-neutral-600 dark:text-neutral-400" size={16} />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">
              {title}
            </h1>
            {(description || subtitle) && (
              <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
                {subtitle || description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
