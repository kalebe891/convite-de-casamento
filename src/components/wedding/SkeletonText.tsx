import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

const SkeletonText = ({ lines = 1, className }: SkeletonTextProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4 w-full",
            i === lines - 1 && "w-3/4" // última linha mais curta
          )} 
        />
      ))}
    </div>
  );
};

export default SkeletonText;
