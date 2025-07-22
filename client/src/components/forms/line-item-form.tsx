import { useState, useRef, useEffect, useLayoutEffect } from "react"; // Added useEffect
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Assuming these are correctly defined:
import { LOCATIONS, UNITS_OF_MEASURE } from "@/lib/constants"; 
import type { LineItemFormData } from "@/lib/types"; // Your type definition
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { formatDate } from "@/lib/utils"; // Assuming this is correctly implemented
import { useQuery } from "@tanstack/react-query";
import type { User } from "@/lib/types";

// Define a Zod schema for the Vendor type
const vendorSchema = z.object({
  vendoraccountnumber: z.string().min(1, "Vendor account number is required"),
  vendorsearchname: z.string().min(1, "Vendor name is required"),
  vendororganizationname: z.string().optional(),
});

// Update the lineItemSchema to include the vendor field
const lineItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  itemNumber: z.string().optional(),
  requiredQuantity: z.number().min(1, "Quantity must be at least 1"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  requiredByDate: z.string().min(1, "Required by date is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  estimatedCost: z.number().min(0.01, "Estimated cost must be greater than 0"),
  itemJustification: z.string().optional(),
  vendor: vendorSchema.nullable().optional(), // Added vendor schema, allowing null or undefined
  receiving_warehouse_id: z.string().min(1, "Receiving warehouse is required"),
  receiving_warehouse_address: z.string().optional(),
});

interface LineItemFormProps {
  onAddItem: (item: LineItemFormData) => void;
}

// Indian currency formatting function (copied from purchase-request-form.tsx)
const formatIndianCurrency = (amount: number | string) => {
  if (amount === null || amount === undefined || amount === "") return "₹0.00";
  const num = parseFloat(amount.toString());
  if (isNaN(num)) return "₹0.00";
  const numStr = num.toFixed(2);
  const [integer, decimal] = numStr.split(".");
  let formatted = "";
  const integerStr = integer;
  if (integerStr.length <= 3) {
    formatted = integerStr;
  } else {
    let result = integerStr.slice(-3);
    let remaining = integerStr.slice(0, -3);
    while (remaining.length > 0) {
      if (remaining.length <= 2) {
        result = remaining + "," + result;
        break;
      } else {
        result = remaining.slice(-2) + "," + result;
        remaining = remaining.slice(0, -2);
      }
    }
    formatted = result;
  }
  return `₹${formatted}.${decimal}`;
};

export function LineItemForm({ onAddItem }: LineItemFormProps) {
  const [open, setOpen] = useState(false); // Controls Dialog open/close
  const [calendarOpen, setCalendarOpen] = useState(false);

  // State for Inventory search/autocomplete
  const [itemSearch, setItemSearch] = useState("");

  // State for Vendor search/autocomplete
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [highlightedVendorIndex, setHighlightedVendorIndex] = useState<number>(-1);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"] });

  useEffect(() => {
    if (user?.entity) {
      fetch(`/api/warehouses?entity=${encodeURIComponent(user.entity)}`)
        .then(res => res.json())
        .then(data => setWarehouses(data));
    }
  }, [user]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    getValues,
  } = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: { // Initialize all fields, especially vendor
      itemName: "",
      requiredQuantity: 0,
      unitOfMeasure: "",
      requiredByDate: "",
      deliveryLocation: "",
      estimatedCost: 0,
      itemJustification: "",
      vendor: null, // Default to null for vendor
    },
  });

  // Reset form and search states when dialog is opened/closed
  useEffect(() => {
    if (!open) {
      reset(); // Resets all react-hook-form fields to defaultValues
      setItemSearch(""); // Reset item search
      setVendorSearchTerm(""); // Reset vendor search
      setHighlightedVendorIndex(-1); // Reset vendor highlight
      setShowVendorDropdown(false); // Close vendor dropdown
    }
  }, [open, reset]);

  // Fetch inventory as user types
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory-autocomplete", itemSearch],
    queryFn: async () => {
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(itemSearch || "")}`);
      return res.json();
    },
    enabled: !!itemSearch, // Only fetch if there's a search term
    staleTime: 30 * 1000,
  });

  // Fetch all vendors (for initial browse or fallback for keyboard nav when search term is empty)
  const { data: allVendors = [] } = useQuery({
    queryKey: ["vendor-searchnames-all"],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/searchnames`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch vendor search results based on vendorSearchTerm
  const { data: vendorSearchResults = [] } = useQuery({
    queryKey: ["vendor-autocomplete", vendorSearchTerm],
    queryFn: async () => {
      if (!vendorSearchTerm) return [];
      const res = await fetch(`/api/vendors/searchnames?search=${encodeURIComponent(vendorSearchTerm)}`);
      return res.json();
    },
    enabled: !!vendorSearchTerm, // Only fetch if there's a search term
    staleTime: 30 * 1000,
  });

  // Helper to filter inventory for dropdown (includes, case-insensitive)
  const filteredInventory = itemSearch
    ? inventory.filter((item: any) =>
        (item.productname && item.productname.toLowerCase().includes(itemSearch.toLowerCase())) ||
        (item.itemnumber && item.itemnumber.toLowerCase().includes(itemSearch.toLowerCase()))
      )
    : [];

  // Helper to parse dd-mm-yyyy string to Date object or undefined
  function parseDDMMYYYYOrUndefined(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts.map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return undefined;
    // Month is 0-indexed in Date constructor
    const date = new Date(year, month - 1, day);
    // Validate if the date components actually match (e.g., 31-02-2023 would become Mar 2)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
        return undefined;
    }
    return date;
  }

  // Helper to format Date object to dd-mm-yyyy string
  function formatToDDMMYYYY(date: Date | null): string {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const onSubmit = (data: LineItemFormData) => {
    onAddItem(data);
    // The useEffect will handle reset when `setOpen(false)` is called
    setOpen(false); 
  };

  // For inventory dropdown auto-scroll
  const inventoryItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // For vendor dropdown auto-scroll
  const vendorItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll for inventory dropdown
  useLayoutEffect(() => {
    if (highlightedInventoryIndex >= 0 && inventoryItemRefs.current[highlightedInventoryIndex]) {
      inventoryItemRefs.current[highlightedInventoryIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedInventoryIndex]);

  // Auto-scroll for vendor dropdown
  useLayoutEffect(() => {
    if (highlightedVendorIndex >= 0 && vendorItemRefs.current[highlightedVendorIndex]) {
      vendorItemRefs.current[highlightedVendorIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedVendorIndex]);

  // Fetch stock available for selected item
  const itemNumber = getValues("itemNumber");
  const {
    data: stockAvailable,
    isLoading: stockLoading,
    isError: stockError,
  } = useQuery({
    queryKey: ["stock-available", itemNumber],
    queryFn: async () => {
      if (!itemNumber) return null;
      const res = await fetch(`/api/stock/${encodeURIComponent(itemNumber)}/availphysical`);
      if (!res.ok) throw new Error("Failed to fetch stock");
      const data = await res.json();
      // If API returns a number directly, return it; else, try to extract
      return typeof data === "number" ? data : data?.stockAvailable ?? data?.available ?? null;
    },
    enabled: !!itemNumber,
    staleTime: 30 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[hsl(32,100%,50%)] hover:bg-[hsl(32,100%,40%)]">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => {
          // Attach warehouse info to form data
          data.receiving_warehouse_id = getValues("receiving_warehouse_id");
          data.receiving_warehouse_address = selectedWarehouse?.deliveryaddress || "";
          onAddItem(data);
          setOpen(false);
        })} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <div className="relative">
                <Input
                  id="itemName"
                  // Let react-hook-form manage the input value
                  {...register("itemName")}
                  placeholder="Search or enter item name"
                  className="pr-10"
                  onChange={e => {
                    // Update itemSearch for the autocomplete query
                    setItemSearch(e.target.value);
                    // No need to call setValue("itemName", e.target.value) here as register handles it
                  }}
                  autoComplete="off"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                {/* Dropdown for inventory search */}
                {itemSearch && filteredInventory.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 bg-white border rounded shadow max-h-48 overflow-y-auto mt-1">
                    {filteredInventory.map((item: any, idx: number) => (
                      <div
                        key={item.itemnumber}
                        ref={el => inventoryItemRefs.current[idx] = el}
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${highlightedInventoryIndex === idx ? "bg-blue-100" : ""}`}
                        onMouseDown={() => { // Use onMouseDown to prevent onBlur from closing dropdown
                          setValue("itemName", item.productname || item.itemnumber, { shouldValidate: true });
                          setValue("itemNumber", item.itemnumber || "", { shouldValidate: true });
                          setValue("unitOfMeasure", item.bomunitsymbol || "", { shouldValidate: true });
                          setItemSearch(item.productname || item.itemnumber); // Update itemSearch to reflect selection
                        }}
                        onMouseEnter={() => setHighlightedInventoryIndex(idx)}
                        onMouseLeave={() => setHighlightedInventoryIndex(-1)}
                      >
                        <div className="font-medium">{item.productname || item.itemnumber}</div>
                        <div className="text-xs text-gray-500">Code: {item.itemnumber}</div>
                        {item.bomunitsymbol && (
                          <div className="text-xs text-gray-400">UOM: {item.bomunitsymbol}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.itemName && (
                <p className="text-sm text-destructive mt-1">{errors.itemName.message}</p>
              )}
            </div>

            {/* Vendor Search Input - Corrected Logic */}
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="vendor"
                  ref={vendorInputRef}
                  placeholder="Search or enter vendor name (optional)"
                  value={vendorSearchTerm} // Input value controlled by vendorSearchTerm state
                  onFocus={() => setShowVendorDropdown(true)}
                  // Delay closing to allow click events on dropdown items to register
                  onBlur={() => setTimeout(() => setShowVendorDropdown(false), 150)}
                  onChange={e => {
                    const newValue = e.target.value;
                    setVendorSearchTerm(newValue);
                    // If the user types and the new value doesn't match the currently selected vendor's name,
                    // clear the selected vendor from react-hook-form state.
                    if (getValues("vendor")?.vendorsearchname !== newValue) {
                      setValue("vendor", null, { shouldValidate: true });
                    }
                    setHighlightedVendorIndex(-1); // Reset highlight when typing
                    setShowVendorDropdown(true); // Ensure dropdown is shown when typing
                  }}
                  onKeyDown={e => {
                    const list = vendorSearchTerm.length > 0 ? vendorSearchResults : allVendors;
                    if (list.length === 0) return; // No items to navigate

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedVendorIndex(idx => (idx + 1) % list.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedVendorIndex(idx => (idx - 1 + list.length) % list.length);
                    } else if (e.key === "Enter") {
                      if (highlightedVendorIndex >= 0 && highlightedVendorIndex < list.length) {
                        const vendor = list[highlightedVendorIndex];
                        setValue("vendor", vendor, { shouldValidate: true });
                        setVendorSearchTerm(vendor.vendorsearchname); // Update input field to selected name
                        setHighlightedVendorIndex(-1);
                        setShowVendorDropdown(false);
                        vendorInputRef.current?.blur(); // Blur the input after selection
                      } else {
                        // If Enter is pressed without a highlighted item
                        // or if no search results for current term, keep form.vendor as null
                        // and just close dropdown.
                        setShowVendorDropdown(false);
                        vendorInputRef.current?.blur();
                      }
                    } else if (e.key === "Escape") {
                      setShowVendorDropdown(false);
                      vendorInputRef.current?.blur();
                    }
                  }}
                  className="pl-10"
                  autoComplete="off"
                />
                {/* Vendor Dropdown */}
                {showVendorDropdown && (
                    (vendorSearchTerm.length > 0 && vendorSearchResults.length > 0) ||
                    (vendorSearchTerm.length === 0 && allVendors.length > 0)
                ) && (
                  <div className="border rounded-md max-h-48 overflow-y-auto mb-2 bg-white shadow-sm absolute z-10 w-full">
                    {(vendorSearchTerm.length > 0 ? vendorSearchResults : allVendors).map((vendor: any, idx: number) => (
                      <div
                        key={vendor.vendoraccountnumber}
                        ref={el => vendorItemRefs.current[idx] = el}
                        className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${highlightedVendorIndex === idx ? "bg-blue-100" : ""}`}
                        onMouseEnter={() => setHighlightedVendorIndex(idx)}
                        onMouseLeave={() => setHighlightedVendorIndex(-1)}
                        onMouseDown={(e) => { // Use onMouseDown to prevent onBlur from closing dialog too early
                          e.preventDefault(); // Prevent input from losing focus immediately
                          setValue("vendor", vendor, { shouldValidate: true });
                          setVendorSearchTerm(vendor.vendorsearchname); // Update input field to selected name
                          setHighlightedVendorIndex(-1);
                          setShowVendorDropdown(false);
                          vendorInputRef.current?.blur(); // Manually blur after selection
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{vendor.vendorsearchname}</span>
                          <span className="text-sm text-gray-500">
                            {vendor.vendororganizationname && `Org: ${vendor.vendororganizationname} `}
                            [{vendor.vendoraccountnumber}]
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Receiving Warehouse Dropdown and Address (after vendor, before item justification) */}
            <div>
              <Label htmlFor="receiving_warehouse_id">Receiving Warehouse *</Label>
              <select
                id="receiving_warehouse_id"
                {...register("receiving_warehouse_id", { required: true })}
                className="border rounded px-3 py-2 w-full"
                onChange={e => {
                  setValue("receiving_warehouse_id", e.target.value, { shouldValidate: true });
                  const wh = warehouses.find(w => w.receiving_warehouse_id === e.target.value);
                  setSelectedWarehouse(wh);
                }}
                value={getValues("receiving_warehouse_id") || ""}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh.receiving_warehouse_id} value={wh.receiving_warehouse_id}>
                    {wh.receiving_warehouse_id}
                  </option>
                ))}
              </select>
              {errors.receiving_warehouse_id && (
                <p className="text-sm text-destructive mt-1">Warehouse is required</p>
              )}
            </div>
            <div>
              <Label>Warehouse Address</Label>
              <input
                type="text"
                value={selectedWarehouse?.formatted_delivery_address || ""}
                readOnly
                className="bg-gray-100 border rounded px-3 py-2 w-full"
                placeholder="Address"
              />
            </div>

            <div>
              <Label htmlFor="requiredQuantity">Required Quantity *</Label>
              <Input
                id="requiredQuantity"
                type="number"
                {...register("requiredQuantity", { valueAsNumber: true })}
                placeholder="0"
                min="1"
              />
              {errors.requiredQuantity && (
                <p className="text-sm text-destructive mt-1">{errors.requiredQuantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
              <Input
                id="unitOfMeasure"
                {...register("unitOfMeasure")}
                placeholder="Unit of measure"
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
              {errors.unitOfMeasure && (
                <p className="text-sm text-destructive mt-1">{errors.unitOfMeasure.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="requiredByDate">Required By Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={() => setCalendarOpen(true)}
                  >
                    {getValues("requiredByDate")
                      ? formatDate(getValues("requiredByDate"))
                      : <span className="text-gray-400">Select date</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 w-auto">
                  <Calendar
                    mode="single"
                    selected={parseDDMMYYYYOrUndefined(getValues("requiredByDate"))}
                    onSelect={(date) => {
                      setValue("requiredByDate", formatToDDMMYYYY(date ?? null), { shouldValidate: true });
                      setCalendarOpen(false);
                    }}
                    fromDate={new Date()} // Prevent selecting past dates
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500 mt-1">Format: dd-mm-yyyy</p>
              {errors.requiredByDate && (
                <p className="text-sm text-destructive mt-1">{errors.requiredByDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="deliveryLocation">Delivery Location *</Label>
              <Select onValueChange={(value) => setValue("deliveryLocation", value, { shouldValidate: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.deliveryLocation && (
                <p className="text-sm text-destructive mt-1">{errors.deliveryLocation.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="estimatedCost">Estimated Cost (₹) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="estimatedCost"
                  type="number"
                  {...register("estimatedCost", { valueAsNumber: true })}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="pl-8"
                />
              </div>
              {errors.estimatedCost && (
                <p className="text-sm text-destructive mt-1">{errors.estimatedCost.message}</p>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="itemJustification">Item Justification</Label>
              <Textarea
                id="itemJustification"
                {...register("itemJustification")}
                rows={3}
                placeholder="Specify why this item is needed..."
                className="resize-none"
              />
              {errors.itemJustification && (
                <p className="text-sm text-destructive mt-1">{errors.itemJustification.message}</p>
              )}
            </div>

            {/* Stock Available Box */}
            <div className="md:col-span-2 lg:col-span-3">
              <Label>Stock Available</Label>
              <div className="bg-gray-100 border rounded px-3 py-2 w-full min-h-[40px] flex items-center">
                {itemNumber ? (
                  stockLoading ? (
                    <span className="text-gray-500">Loading...</span>
                  ) : stockError ? (
                    <span className="text-red-500">Error fetching stock</span>
                  ) : (
                    <span className="font-semibold">{stockAvailable ?? "N/A"}</span>
                  )
                ) : (
                  <span className="text-gray-400">Select an item to view stock</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]">
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}