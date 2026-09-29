import { getUsageColors } from "../lib/utils";
import { useEffect, useState } from "react";

export function AnimatedProgressBar({ rawPercent }: { rawPercent: number }) {
  const targetWidth = Math.min(rawPercent, 100);
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const colors = getUsageColors(rawPercent);

  useEffect(() => {
    setAnimatedWidth(0);
    const timer = setTimeout(() => {
      setAnimatedWidth(targetWidth);
    }, 50);

    return () => clearTimeout(timer);
  }, [targetWidth]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between text-xs font-medium">
        <span className={colors.text}>{rawPercent.toFixed(2)}%</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  );
}
