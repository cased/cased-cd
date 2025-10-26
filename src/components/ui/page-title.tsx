interface PageTitleProps {
  children: React.ReactNode;
}

export function PageTitle({ children }: PageTitleProps) {
  return <h1 className="text-lg font-semibold text-foreground">{children}</h1>;
}
