import { useState, useRef, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusIndicatorProps {
  color: "green" | "yellow" | "red";
  label: string;
  ariaLabel: string;
  icon?: React.ReactNode;
}

export const StatusIndicator = ({ color, label, ariaLabel, icon }: StatusIndicatorProps) => {
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colorClasses: Record<string, string> = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  const handleTouch = useCallback(() => {
    setShowMobileTooltip(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowMobileTooltip(false), 2000);
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={showMobileTooltip || undefined}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={ariaLabel}
            onTouchStart={handleTouch}
          >
            {icon || (
              <span
                className={`block w-2.5 h-2.5 rounded-full ${colorClasses[color]}`}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
