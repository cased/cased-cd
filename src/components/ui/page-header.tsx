import { PageTitle } from "./page-title";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <PageTitle>{title}</PageTitle>
            {description && (
              <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
