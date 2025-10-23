interface PageTitleProps {
  children: React.ReactNode;
}

export function PageTitle({ children }: PageTitleProps) {
  return <h1 className="text-xl font-medium text-foreground">{children}</h1>;
}
