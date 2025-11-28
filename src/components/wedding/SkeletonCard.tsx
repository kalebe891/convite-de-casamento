import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonCardProps {
  hasImage?: boolean;
  lines?: number;
}

const SkeletonCard = ({ hasImage = false, lines = 3 }: SkeletonCardProps) => {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        {hasImage && <Skeleton className="h-40 w-full rounded-lg mb-4" />}
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
};

export default SkeletonCard;
