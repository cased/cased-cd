interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
      <div className="px-6 py-3">
        <h1 className="text-lg font-semibold text-black dark:text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
