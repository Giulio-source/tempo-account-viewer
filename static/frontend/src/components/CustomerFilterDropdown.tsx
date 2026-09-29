import { useState, useMemo } from "react";
import { Users, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface CustomerFilterDropdownProps {
  allCustomers: string[];
  appliedCustomers: string[];
  onApply: (customers: string[]) => void;
}

export function CustomerFilterDropdown({
  allCustomers,
  appliedCustomers,
  onApply,
}: CustomerFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftCustomers, setDraftCustomers] =
    useState<string[]>(appliedCustomers);
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setDraftCustomers(appliedCustomers);
      setSearchQuery("");
    }
    setIsOpen(open);
  };

  const filteredOptions = useMemo(() => {
    const matches = searchQuery.trim()
      ? allCustomers.filter((c) =>
          c.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : allCustomers;

    return [...matches].sort((a, b) => a.localeCompare(b));
  }, [allCustomers, searchQuery]);

  const toggleCustomer = (customer: string) => {
    setDraftCustomers((prev) =>
      prev.includes(customer)
        ? prev.filter((c) => c !== customer)
        : [...prev, customer],
    );
  };

  const isFiltered =
    allCustomers.length > 0 && appliedCustomers.length < allCustomers.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-dashed bg-white"
        >
          <Users className="h-4 w-4 text-slate-500" />
          Customers
          {isFiltered && (
            <span className="ml-1.5 rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800">
              {appliedCustomers.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-white p-2 shadow-lg">
        <DropdownMenuLabel className="text-xs font-semibold px-2">
          Filter Customers ({allCustomers.length})
        </DropdownMenuLabel>

        <div className="px-1 py-1.5">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full pl-8 pr-3 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-slate-50"
            />
          </div>
        </div>

        <DropdownMenuSeparator className="my-1.5" />

        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No customers found
            </div>
          ) : (
            filteredOptions.map((customer) => (
              <DropdownMenuCheckboxItem
                key={customer}
                checked={draftCustomers.includes(customer)}
                onCheckedChange={() => toggleCustomer(customer)}
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer text-xs"
              >
                <span className="truncate">{customer}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs text-slate-500"
              onClick={() => setDraftCustomers(allCustomers)}
            >
              All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-xs text-slate-500"
              onClick={() => setDraftCustomers([])}
            >
              Clear
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-xs font-medium"
            onClick={() => {
              onApply(draftCustomers);
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
