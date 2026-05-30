import { cn } from "@/shared/lib/utils";

export type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Shared dashed-border empty-state shell.
 * Replaces the ad-hoc `border-dashed` containers scattered across screens.
 */
export function EmptyState({
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-card p-5 text-center shadow-card",
        className,
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
