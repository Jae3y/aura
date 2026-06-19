import { clsx } from "clsx";

interface SkeletonShimmerProps {
  className?: string;
}

export function SkeletonShimmer({ className }: SkeletonShimmerProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-zinc-800/50 rounded",
        className
      )}
    />
  );
}
