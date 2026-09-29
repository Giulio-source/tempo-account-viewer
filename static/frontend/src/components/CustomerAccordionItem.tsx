import { useEffect, useState } from "react";
import { TempoAccount } from "../hooks/useTempoAccounts";
import { AccountsTable } from "./AccountsTable";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { getUsageColors } from "../lib/utils";

interface CustomerAccordionItemProps {
  customerName: string;
  customerAccounts: TempoAccount[];
}

export function CustomerAccordionItem({
  customerName,
  customerAccounts,
}: CustomerAccordionItemProps) {
  const totalLogged = customerAccounts.reduce(
    (sum, acc) => sum + (acc.totalLoggedHours || 0),
    0,
  );
  const totalEstimated = customerAccounts.reduce(
    (sum, acc) => sum + (acc.estimatedHours || 0),
    0,
  );

  const customerPercent =
    totalEstimated > 0 ? (totalLogged / totalEstimated) * 100 : 0;
  const customerColors = getUsageColors(customerPercent);
  const targetWidth = Math.min(customerPercent, 100);

  // Animated width state starting at 0%
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    // Slight delay allows the browser to render 0% first before transitioning to target width
    setAnimatedWidth(0);
    const timer = setTimeout(() => {
      setAnimatedWidth(targetWidth);
    }, 100);

    return () => clearTimeout(timer);
  }, [targetWidth]);

  return (
    <AccordionItem
      value={customerName}
      className="border rounded-md px-4 shadow-sm bg-white"
    >
      <AccordionTrigger className="hover:no-underline text-lg font-medium py-4">
        <div className="flex items-center justify-between w-full pr-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">{customerName}</span>
            <span className="text-xs font-normal text-muted-foreground bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {customerAccounts.length}{" "}
              {customerAccounts.length === 1 ? "account" : "accounts"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {totalEstimated > 0 ? (
              <div
                className={`flex items-center gap-2.5 border px-3 py-1 rounded-full text-xs font-medium ${customerColors.badge}`}
              >
                <span>
                  {totalLogged.toFixed(1)} / {totalEstimated} hrs
                </span>
                <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                <span className="font-bold">{customerPercent.toFixed(1)}%</span>

                {/* Animated Mini Progress Bar */}
                <div className="w-12 h-1.5 bg-black/10 rounded-full overflow-hidden ml-1">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${customerColors.bar}`}
                    style={{
                      width: `${animatedWidth}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Total: {totalLogged.toFixed(1)} hrs
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-4">
        <AccountsTable accounts={customerAccounts} />
      </AccordionContent>
    </AccordionItem>
  );
}
