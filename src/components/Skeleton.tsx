interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

/** A placeholder block shown while content loads. */
export function Skeleton({ width = "100%", height = "1rem", radius }: SkeletonProps) {
  return <div className="skeleton" aria-hidden="true" style={{ width, height, borderRadius: radius }} />;
}