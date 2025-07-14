import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react"; // Added useEffect
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Package, AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// Define a type for Vendor
interface Vendor {
  vendoraccountnumber: string;
  vendorsearchname: string;
  vendororganizationname?: string;
  // Add other vendor properties if needed, e.g., vendorid, etc.
}

interface LineItem {
  id?: number; // Optional ID for existing items
  itemName: string;
  itemNumber?: string;
  requiredQuantity: string | number;
  unitOfMeasure: string;
  requiredByDate: string;
  deliveryLocation: string;
  estimatedCost: string | number;
  itemJustification?: string;
  vendor?: Vendor | null; // Changed from 'any' to specific Vendor type or null
  receiving_warehouse_id?: string;
  receiving_warehouse_address?: string;
}

interface LineItemsGridProps {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  editable?: boolean;
}

export function LineItemsGrid({ items, onItemsChange, editable = true }: LineItemsGridProps) {
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  // State for Inventory search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null); // To store selected inventory item data
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1); // For inventory dropdown
  const inputRef = useRef<HTMLInputElement>(null); // For inventory input
  // State for Vendor search
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [highlightedVendorIndex, setHighlightedVendorIndex] = useState<number>(-1); // For vendor dropdown
  const vendorInputRef = useRef<HTMLInputElement>(null); // For vendor input
  const [showVendorDropdown, setShowVendorDropdown] = useState(false); // For vendor dropdown visibility
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);

  useEffect(() => {
    fetch("/api/warehouses")
      .then(res => res.json())
      .then(data => setWarehouses(data));
  }, []);

  // Form data for the current item being added/edited
  const [formData, setFormData] = useState<LineItem>({
    itemName: "",
    requiredQuantity: "",
    unitOfMeasure: "",
    requiredByDate: "",
    deliveryLocation: "",
    estimatedCost: "",
    itemJustification: "",
    vendor: null, // Initialize vendor as null
  });

  const [calendarOpen, setCalendarOpen] = useState(false); // For date picker visibility
  const { toast } = useToast();
  // Fetch all vendors (potentially for initial browse or fallback for keyboard nav)
  const { data: allVendors = [] } = useQuery<Vendor[]>({ // Specify type for better safety
    queryKey: ["vendor-searchnames-all"],
    queryFn: async () => {
      const res = await fetch("/api/vendors/searchnames");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch inventory as user types (autocomplete)
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory-autocomplete", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(searchTerm)}`);
      return res.json();
    },
    enabled: !!searchTerm && editable,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Helper to filter inventory for dropdown (includes, case-insensitive)
  const filteredInventory = searchTerm
    ? inventory.filter((item: any) =>
        (item.productname && item.productname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.itemnumber && item.itemnumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  // Fetch vendor search results based on vendorSearchTerm
  const { data: vendorSearchResults = [] } = useQuery<Vendor[]>({ // Specify type
    queryKey: ["vendor-autocomplete", vendorSearchTerm],
    queryFn: async () => {
      if (!vendorSearchTerm) return [];
      const res = await fetch(`/api/vendors/searchnames?search=${encodeURIComponent(vendorSearchTerm)}`);
      return res.json();
    },
    enabled: !!vendorSearchTerm && editable,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Effect to pre-fill formData and search terms when editing an item or reset for new item
  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
      // Pre-fill inventory search term if it's not from an inventory item
      // Or if the item name is directly set (not necessarily from search)
      setSearchTerm(editingItem.itemName);
      setSelectedInventoryItem(null); // Assume it's not a live selection from inventory data unless re-selected

      // Pre-fill vendor search term if a vendor is associated
      setVendorSearchTerm(editingItem.vendor?.vendorsearchname || "");
    } else {
      // Reset form data and search terms when adding a new item
      setFormData({
        itemName: "",
        requiredQuantity: "",
        unitOfMeasure: "",
        requiredByDate: "",
        deliveryLocation: "",
        estimatedCost: "",
        itemJustification: "",
        vendor: null,
      });
      setSearchTerm("");
      setSelectedInventoryItem(null);
      setVendorSearchTerm("");
    }
    // Reset highlighted indices
    setHighlightedIndex(-1);
    setHighlightedVendorIndex(-1);
  }, [editingItem, showAddDialog]); // showAddDialog dependency ensures reset when dialog is closed

  // Add Item handler
  const handleAddItem = () => {
    if (!formData.requiredQuantity || isNaN(Number(formData.requiredQuantity)) || Number(formData.requiredQuantity) <= 0) {
      toast({ title: "Required Quantity is mandatory", description: "Please enter a valid quantity.", variant: "destructive" });
      return;
    }
    if (!formData.requiredByDate || formData.requiredByDate.trim() === "") {
      toast({ title: "Required By Date is mandatory", description: "Please select a required by date.", variant: "destructive" });
      return;
    }
    const newItem: LineItem = { 
      ...formData,
      requiredQuantity: parseFloat(formData.requiredQuantity as string) || 0, // Convert to number
      estimatedCost: parseFloat(formData.estimatedCost as string) || 0,       // Convert to number
      // Assign a temporary ID for new items for consistent key management in UI
      // In a real app, this ID would come from the backend upon saving.
      id: items.length > 0 ? Math.max(...items.map(i => i.id || 0)) + 1 : 1
    };
    onItemsChange([...items, newItem]);
    setShowAddDialog(false); // Close dialog and trigger useEffect reset
  };

  // Edit Item handler
  const handleUpdateItem = () => {
    if (!formData.requiredQuantity || isNaN(Number(formData.requiredQuantity)) || Number(formData.requiredQuantity) <= 0) {
      toast({ title: "Required Quantity is mandatory", description: "Please enter a valid quantity.", variant: "destructive" });
      return;
    }
    if (!formData.requiredByDate || formData.requiredByDate.trim() === "") {
      toast({ title: "Required By Date is mandatory", description: "Please select a required by date.", variant: "destructive" });
      return;
    }
    const updatedItem: LineItem = { 
      ...formData,
      requiredQuantity: parseFloat(formData.requiredQuantity as string) || 0,
      estimatedCost: parseFloat(formData.estimatedCost as string) || 0,
      id: editingItem?.id, // Preserve existing ID
    };
    const updatedItems = items.map(item =>
      item.id === editingItem?.id ? updatedItem : item
    );
    onItemsChange(updatedItems);
    setEditingItem(null); // Clear editing state
    setShowAddDialog(false); // Close dialog and trigger useEffect reset
  };

  const handleEditItem = (item: LineItem) => {
    setEditingItem(item);
    setShowAddDialog(true); // Open dialog, useEffect will pre-fill form
  };

  const handleDeleteItem = (itemId: number | undefined) => {
    if (itemId === undefined) return;
    const filteredItems = items.filter(item => item.id !== itemId);
    onItemsChange(filteredItems);
  };

  // Calculate total cost
   const totalCost = items.reduce((sum, item) => {
    // Ensure estimatedCost is treated as a number
    return sum + (parseFloat(item.estimatedCost?.toString() || '0'));
  }, 0);

  // Indian currency formatting function
  const formatIndianCurrency = (amount: number | string) => {
    if (amount === null || amount === undefined || amount === "") return "₹0.00";
    const num = parseFloat(amount.toString());
    if (isNaN(num)) return "₹0.00";
    const numStr = num.toFixed(2);
    const [integer, decimal] = numStr.split('.');
    let formatted = '';
    const integerStr = integer;
    if (integerStr.length <= 3) {
      formatted = integerStr;
    } else {
      let result = integerStr.slice(-3);
      let remaining = integerStr.slice(0, -3);
      while (remaining.length > 0) {
        if (remaining.length <= 2) {
          result = remaining + ',' + result;
          break;
        } else {
          result = remaining.slice(-2) + ',' + result;
          remaining = remaining.slice(0, -2);
        }
      }
      formatted = result;
    }
    return `₹${formatted}.${decimal}`;
  };

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
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // For inventory dropdown auto-scroll
  const inventoryItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // For vendor dropdown auto-scroll
  const vendorItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll for inventory dropdown
  useLayoutEffect(() => {
    if (highlightedIndex >= 0 && inventoryItemRefs.current[highlightedIndex]) {
      inventoryItemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Auto-scroll for vendor dropdown
  useLayoutEffect(() => {
    if (highlightedVendorIndex >= 0 && vendorItemRefs.current[highlightedVendorIndex]) {
      vendorItemRefs.current[highlightedVendorIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedVendorIndex]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Line Items ({items.length})
        </h3>
        {editable && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Line Item" : "Add Line Item"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  {/* Unified Search/Input for Inventory */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="itemName"
                      ref={inputRef}
                      placeholder="Search or enter item name"
                      value={formData.itemName} // Controlled by formData
                      onChange={e => {
                        const newName = e.target.value;
                        setFormData({ ...formData, itemName: newName });
                        setSearchTerm(newName); // Keep searchTerm in sync for autocomplete
                        setSelectedInventoryItem(null); // Clear selected if user types over it
                        setFormData(f => ({ ...f, unitOfMeasure: "" })); // Clear UOM if item name changes
                        setHighlightedIndex(-1);
                      }}
                      onKeyDown={e => {
                        if (filteredInventory.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setHighlightedIndex(idx => (idx + 1) % filteredInventory.length);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setHighlightedIndex(idx => (idx - 1 + filteredInventory.length) % filteredInventory.length);
                        } else if (e.key === "Enter") {
                          if (highlightedIndex >= 0 && highlightedIndex < filteredInventory.length) {
                            const item = filteredInventory[highlightedIndex];
                            setSelectedInventoryItem(item);
                            setFormData({
                              ...formData,
                              itemName: item.productname || item.itemnumber,
                              requiredQuantity: "", // Reset quantity as per original logic
                              estimatedCost: item.unitcost || "",
                              unitOfMeasure: item.bomunitsymbol || "",
                            });
                            setSearchTerm(""); // Clear search term after selection
                            setHighlightedIndex(-1);
                            e.currentTarget.blur(); // Blur the input after selection
                          }
                        }
                      }}
                      className="pl-10"
                      autoComplete="off"
                    />
                    {/* Inventory Dropdown */}
                    {searchTerm && filteredInventory.length > 0 && (
                      <div className="border rounded-md max-h-48 overflow-y-auto mb-2 bg-white shadow-sm absolute z-10 w-full">
                        {filteredInventory.map((item: any, idx: number) => (
                          <div
                            key={item.itemnumber}
                            ref={el => inventoryItemRefs.current[idx] = el}
                            className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${highlightedIndex === idx ? "bg-blue-100" : ""}`}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseLeave={() => setHighlightedIndex(-1)}
                            onClick={() => {
                              setSelectedInventoryItem(item);
                              setFormData({
                                ...formData,
                                itemName: item.productname || item.itemnumber,
                                requiredQuantity: "",
                                estimatedCost: item.unitcost || "",
                                unitOfMeasure: item.bomunitsymbol || "",
                              });
                              setSearchTerm("");
                              setHighlightedIndex(-1);
                              inputRef.current?.blur(); // Blur after selection
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{item.productname || item.itemnumber}</span>
                              <span className="text-sm text-gray-500">
                                Code: {item.itemnumber} {item.bomunitsymbol ? `| UOM: ${item.bomunitsymbol}` : ""}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="requiredQuantity">Required Quantity *</Label>
                  <Input
                    id="requiredQuantity"
                    type="text" // Use text to allow partial input like "1." before final number
                    value={formData.requiredQuantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string, or numbers (integers/decimals)
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, requiredQuantity: value});
                      }
                    }}
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                  <Input
                    id="unitOfMeasure"
                    value={formData.unitOfMeasure}
                    readOnly={!!selectedInventoryItem} // Make read-only if selected from inventory
                    placeholder="Unit of measure"
                    className={selectedInventoryItem ? "bg-gray-100 cursor-not-allowed" : ""}
                    onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                  />
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
                        {/* Ensure formatDate receives a Date object or a valid string */}
                        {formData.requiredByDate
                          ? formatDate(parseDDMMYYYYOrUndefined(formData.requiredByDate) || formData.requiredByDate)
                          : <span className="text-gray-400">Select date</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0 w-auto">
                      <Calendar
                        mode="single"
                        selected={parseDDMMYYYYOrUndefined(formData.requiredByDate)}
                        onSelect={(date) => {
                          setFormData({ ...formData, requiredByDate: formatToDDMMYYYY(date ?? null) });
                          setCalendarOpen(false);
                        }}
                        fromDate={new Date()} // Prevent selecting past dates
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-gray-500 mt-1">Format: dd-mm-yyyy</p>
                </div>
                <div>
                  <Label htmlFor="deliveryLocation">Delivery Location</Label>
                  <Input
                    id="deliveryLocation"
                    value={formData.deliveryLocation}
                    onChange={(e) => setFormData({...formData, deliveryLocation: e.target.value})}
                    placeholder="Enter delivery location"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                  <Input
                    id="estimatedCost"
                    type="text"
                    value={formData.estimatedCost}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string, or numbers (integers/decimals)
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, estimatedCost: value});
                      }
                    }}
                    placeholder="Enter cost"
                  />
                </div>
                {/* Vendor Search Input */}
                <div>
                  <Label htmlFor="vendor">Vendor</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="vendor"
                      ref={vendorInputRef}
                      placeholder="Search or enter vendor name (optional)"
                      value={vendorSearchTerm} // Always control input by vendorSearchTerm
                      onFocus={() => setShowVendorDropdown(true)}
                      // Delay closing to allow click events on dropdown items to register
                      onBlur={() => setTimeout(() => setShowVendorDropdown(false), 150)}
                      onChange={e => {
                        const newValue = e.target.value;
                        setVendorSearchTerm(newValue);
                        // If the user types and the new value doesn't match the current selected vendor's name,
                        // clear the selected vendor from formData.
                        if (formData.vendor && formData.vendor.vendorsearchname !== newValue) {
                          setFormData({ ...formData, vendor: null });
                        }
                        // Ensure dropdown opens if user starts typing
                        setShowVendorDropdown(true);
                        setHighlightedVendorIndex(-1); // Reset highlight when typing
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
                            setFormData({ ...formData, vendor });
                            setVendorSearchTerm(vendor.vendorsearchname); // Update input field to selected name
                            setHighlightedVendorIndex(-1);
                            setShowVendorDropdown(false);
                            e.currentTarget.blur(); // Blur the input after selection
                          } else {
                            // If Enter is pressed without a highlighted item,
                            // and there's a search term, assume manual entry.
                            // Ensure formData.vendor is null if no official selection was made.
                            if (vendorSearchTerm.length > 0 && formData.vendor === null) {
                              setFormData({ ...formData, vendor: null });
                            }
                            setShowVendorDropdown(false);
                            e.currentTarget.blur();
                          }
                        } else if (e.key === "Escape") {
                          setShowVendorDropdown(false);
                          e.currentTarget.blur();
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
                        {(vendorSearchTerm.length > 0 ? vendorSearchResults : allVendors).map((vendor: Vendor, idx: number) => (
                          <div
                            key={vendor.vendoraccountnumber}
                            ref={el => vendorItemRefs.current[idx] = el}
                            className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${highlightedVendorIndex === idx ? "bg-blue-100" : ""}`}
                            onMouseEnter={() => setHighlightedVendorIndex(idx)}
                            onMouseLeave={() => setHighlightedVendorIndex(-1)}
                            onClick={() => {
                              setFormData({ ...formData, vendor });
                              setVendorSearchTerm(vendor.vendorsearchname); // Update input field to selected name
                              setHighlightedVendorIndex(-1);
                              setShowVendorDropdown(false);
                              vendorInputRef.current?.blur(); // Blur after selection
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
                    value={formData.receiving_warehouse_id || ""}
                    onChange={e => {
                      setFormData({ ...formData, receiving_warehouse_id: e.target.value });
                      const wh = warehouses.find(w => w.receiving_warehouse_id === e.target.value);
                      setSelectedWarehouse(wh);
                    }}
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh.receiving_warehouse_id} value={wh.receiving_warehouse_id}>
                        {wh.receiving_warehouse_id}
                      </option>
                    ))}
                  </select>
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
                  <Label htmlFor="itemJustification">Item Justification</Label>
                  <Textarea
                    id="itemJustification"
                    value={formData.itemJustification}
                    onChange={(e) => setFormData({...formData, itemJustification: e.target.value})}
                    placeholder="Explain why this item is needed"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setEditingItem(null); // Clear editing state and trigger useEffect reset
                }}>
                  Cancel
                </Button>
                <Button onClick={editingItem ? handleUpdateItem : handleAddItem}>
                  {editingItem ? "Update Item" : "Add Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No line items added yet</p>
            {editable && (
              <p className="text-sm text-gray-400 mt-2">Click "Add Item" to get started</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* The overflow-x-auto is kept for responsiveness on very small screens */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-semibold text-sm border-r">S.No</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Item Name</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Qty</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Unit</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Required By</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Location</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Item Cost (₹)</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Warehouse ID</th>
                    {/* <th className="text-left p-3 font-semibold text-sm">Warehouse Address</th> */}
                    {editable && <th className="text-center p-3 font-semibold text-sm">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="border-b hover:bg-gray-50">
                      <td className="p-3 border-r text-sm font-medium">{index + 1}</td>
                      <td className="p-3 border-r">
                        <div className="font-medium text-sm break-words">{item.itemName}</div>
                        {item.itemJustification && (
                          <div className="text-xs text-gray-500 mt-1 whitespace-normal" title={item.itemJustification}>
                            {item.itemJustification}
                          </div>
                        )}
                        {item.vendor && (
                          <div className="text-xs text-blue-600 mt-1 whitespace-normal" title={item.vendor.vendorsearchname}>
                            Vendor: {item.vendor.vendorsearchname}
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-r text-sm">{item.requiredQuantity}</td>
                      <td className="p-3 border-r text-sm">{item.unitOfMeasure}</td>
                      <td className="p-3 border-r text-sm">{formatDate(item.requiredByDate)}</td>
                      <td className="p-3 border-r text-sm">{item.deliveryLocation}</td>
                      <td className="p-3 border-r text-sm text-gray-600">
                        {formatCurrency(item.estimatedCost)}
                      </td>
                      <td className="p-3 border-r text-sm">{item.receiving_warehouse_id}</td>
                      {/* <td className="p-3 border-r text-sm">{item.receiving_warehouse_address}</td> */}
                      {editable && (
                        <td className="p-3 text-center">
                          <div className="flex justify-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-8 w-8 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2 bg-blue-50">
                    <td colSpan={editable ? 7 : 6} className="p-3 text-right font-semibold text-sm">
                      Total Estimated Cost:
                    </td>
                    <td className="p-3 font-bold text-lg text-green-700">
                      {formatIndianCurrency(totalCost)}
                    </td>
                    {editable && <td className="p-3"></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}