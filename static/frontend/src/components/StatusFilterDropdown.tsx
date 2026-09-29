import { useState } from "react";
import { Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { AVAILABLE_STATUSES, getStatusBadgeStyle } from "../lib/utils";

interface StatusFilterDropdownProps {
  appliedStatuses: string[];
  onApply: (statuses: string[]) => void;
}

export function StatusFilterDropdown({
  appliedStatuses,
  onApply,
}: StatusFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftStatuses, setDraftStatuses] = useState<string[]>(appliedStatuses);

  const handleOpenChange = (open: boolean) => {
    if (open) setDraftStatuses(appliedStatuses);
    setIsOpen(open);
  };

  const toggleStatus = (status: string) => {
    setDraftStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const isFiltered = appliedStatuses.length < AVAILABLE_STATUSES.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-dashed bg-white"
        >
          <Filter className="h-4 w-4 text-slate-500" />
          Status
          {isFiltered && (
            <span className="ml-1.5 rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
              {appliedStatuses.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white p-2 shadow-lg">
        <DropdownMenuLabel className="text-xs font-semibold px-2">
          Filter by Status
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1.5" />

        <div className="space-y-1">
          {AVAILABLE_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={draftStatuses.includes(status)}
              onCheckedChange={() => toggleStatus(status)}
              onSelect={(e) => e.preventDefault()}
              className="cursor-pointer"
            >
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeStyle(
                  status,
                )}`}
              >
                {status}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
            onClick={() => setDraftStatuses(AVAILABLE_STATUSES)}
          >
            Select All
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={() => {
              onApply(draftStatuses);
              setIsOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
