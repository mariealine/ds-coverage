// Sample clean file — no violations
import { cn } from "@/lib/utils";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("badge-default", className)}>
      {children}
    </span>
  );
}
