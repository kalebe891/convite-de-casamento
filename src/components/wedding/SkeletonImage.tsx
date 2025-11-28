import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonImageProps {
  className?: string;
  aspectRatio?: "square" | "video" | "portrait";
}

const SkeletonImage = ({ className, aspectRatio = "video" }: SkeletonImageProps) => {
  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  return (
    <Skeleton 
      className={cn(
        "w-full rounded-lg",
        aspectClasses[aspectRatio],
        className
      )} 
    />
  );
};

export default SkeletonImage;
