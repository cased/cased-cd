import { type ReactNode } from "react";

interface PageContentProps {
  children: ReactNode;
  /** Custom className for additional styling */
  className?: string;
}

export function PageContent({
  children,
  className = "",
}: PageContentProps) {
  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-black">
      <div className={`py-4 px-8 ${className}`}>
        {children}
      </div>
    </div>
  );
}
