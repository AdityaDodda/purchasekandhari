import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Package, AlertCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface LineItem {
  id?: number;
  itemName: string;
  requiredQuantity: number;
  unitOfMeasure: string;
  requiredByDate: string;
  deliveryLocation: string;
  estimatedCost: number;
  itemJustification?: string;
  stockAvailable?: number;
  stockLocation?: string;
}

interface LineItemsGridProps {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  editable?: boolean;
}

export function LineItemsGrid({ items, onItemsChange, editable = true }: LineItemsGridProps) {
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
  const [formData, setFormData] = useState<LineItem>({
    itemName: "",
    requiredQuantity: 1,
    unitOfMeasure: "",
    requiredByDate: "",
    deliveryLocation: "",
    estimatedCost: 0,
    itemJustification: "",
    stockAvailable: 0,
    stockLocation: "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Fetch inventory as user types (autocomplete)
  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory-autocomplete", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(searchTerm)}`);
      return res.json();
    },
    enabled: !!searchTerm && editable,
  });

  // Helper to filter inventory for dropdown (includes, case-insensitive)
  const filteredInventory = searchTerm
    ? inventory.filter((item: any) =>
        (item.productname && item.productname.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.itemnumber && item.itemnumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const checkStock = (itemName: string) => {
    return inventory.find((item: any) => 
      item.name.toLowerCase().includes(itemName.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(itemName.toLowerCase())
    );
  };

  // Helper to get required - stock
  const getRequiredMinusStock = () => {
    if (!formData.requiredQuantity || !selectedInventoryItem) return null;
    return formData.requiredQuantity - selectedInventoryItem.quantity;
  };

  // Add Item handler
  const handleAddItem = () => {
    const stockInfo = checkStock(formData.itemName);
    const requiredMinusStock = getRequiredMinusStock();
    if (requiredMinusStock === null || requiredMinusStock <= 0) {
      toast({
        title: "Stock Error",
        description: "Required - Stock must be positive. Item already in stock or invalid quantity.",
        variant: "destructive"
      });
      return;
    }
    const newItem = {
      ...formData,
      requiredQuantity: requiredMinusStock, // Use Required - Stock for DB and cost
      stockAvailable: stockInfo?.quantity || 0,
      stockLocation: stockInfo?.location || "",
    };
    onItemsChange([...items, newItem]);
    setFormData({
      itemName: "",
      requiredQuantity: 1,
      unitOfMeasure: "",
      requiredByDate: "",
      deliveryLocation: "",
      estimatedCost: 0,
      itemJustification: "",
      stockAvailable: 0,
      stockLocation: "",
    });
    setShowAddDialog(false);
  };

  // Edit Item handler
  const handleUpdateItem = () => {
    const stockInfo = checkStock(formData.itemName);
    const requiredMinusStock = getRequiredMinusStock();
    if (requiredMinusStock === null || requiredMinusStock <= 0) {
      toast({
        title: "Stock Error",
        description: "Required - Item already in stock or invalid quantity.",
        variant: "destructive"
      });
      return;
    }
    const updatedItem = {
      ...formData,
      requiredQuantity: requiredMinusStock, // Use Required - Stock for DB and cost
      stockAvailable: stockInfo?.quantity || 0,
      stockLocation: stockInfo?.location || "",
    };
    const updatedItems = items.map(item =>
      item.id === editingItem?.id ? updatedItem : item
    );
    onItemsChange(updatedItems);
    setEditingItem(null);
    setShowAddDialog(false);
  };

  const handleEditItem = (item: LineItem) => {
    setEditingItem(item);
    setFormData(item);
    setShowAddDialog(true);
  };

  const handleDeleteItem = (itemId: number | undefined) => {
    const filteredItems = items.filter(item => item.id !== itemId);
    onItemsChange(filteredItems);
  };

  const getStockStatus = (item: LineItem) => {
    if (!item.stockAvailable) return "out-of-stock";
    if (item.stockAvailable < item.requiredQuantity) return "low-stock";
    return "in-stock";
  };

  const getStockBadge = (item: LineItem) => {
    const status = getStockStatus(item);
    const colors = {
      "in-stock": "bg-green-100 text-green-800",
      "low-stock": "bg-yellow-100 text-yellow-800",
      "out-of-stock": "bg-red-100 text-red-800"
    };
    const labels = {
      "in-stock": "In Stock",
      "low-stock": "Low Stock",
      "out-of-stock": "Out of Stock"
    };

    return (
      <Badge className={colors[status]}>
        {labels[status]} ({item.stockAvailable || 0})
      </Badge>
    );
  };

  // Calculate total cost (Quantity × Cost per unit for each item)
  const totalCost = items.reduce((sum, item) => {
    const itemTotal = (item.requiredQuantity || 0) * (parseFloat(item.estimatedCost?.toString() || '0'));
    return sum + itemTotal;
  }, 0);

  // Indian currency formatting function (copied from purchase-request-form.tsx)
  const formatIndianCurrency = (amount: number | string) => {
    if (!amount && amount !== 0) return "₹0.00";
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

  // Helper to parse dd-mm-yyyy to Date or undefined
  function parseDDMMYYYYOrUndefined(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    const [day, month, year] = dateStr.split("-");
    if (!day || !month || !year) return undefined;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  function formatToDDMMYYYY(date: Date | null): string {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

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
                  {/* Unified Search/Input */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="itemName"
                      ref={inputRef}
                      placeholder="Search or enter item name"
                      value={formData.itemName || searchTerm}
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setFormData({ ...formData, itemName: e.target.value });
                        setSelectedInventoryItem(null);
                        setFormData(f => ({ ...f, unitOfMeasure: "" }));
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
                              requiredQuantity: 1,
                              estimatedCost: item.unitcost || 0,
                              unitOfMeasure: item.bomunitsymbol || "",
                              stockAvailable: item.stockavailable || 0,
                              stockLocation: item.stocklocation || ""
                            });
                            setSearchTerm("");
                            setHighlightedIndex(-1);
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
                            className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${highlightedIndex === idx ? "bg-blue-100" : ""}`}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseLeave={() => setHighlightedIndex(-1)}
                            onClick={() => {
                              setSelectedInventoryItem(item);
                              setFormData({
                                ...formData,
                                itemName: item.productname || item.itemnumber,
                                requiredQuantity: 1,
                                estimatedCost: item.unitcost || 0,
                                unitOfMeasure: item.bomunitsymbol || "",
                                stockAvailable: item.stockavailable || 0,
                                stockLocation: item.stocklocation || ""
                              });
                              setSearchTerm("");
                              setHighlightedIndex(-1);
                              // Refocus input after click
                              setTimeout(() => inputRef.current?.focus(), 0);
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
                  <Label htmlFor="requiredQuantity">Required Quantity</Label>
                  <Input
                    id="requiredQuantity"
                    type="number"
                    value={formData.requiredQuantity}
                    onChange={(e) => {
                      const requestedQty = parseInt(e.target.value) || 1;
                      setFormData({...formData, requiredQuantity: requestedQty});
                    }}
                    min="1"
                  />
                  {selectedInventoryItem && formData.requiredQuantity > selectedInventoryItem.quantity && (
                    <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <p className="text-yellow-800">
                        <strong>Stock Alert:</strong> Only {selectedInventoryItem.quantity} available in stock.
                      </p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Requesting {formData.requiredQuantity - selectedInventoryItem.quantity} additional units beyond stock.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                  <Input
                    id="unitOfMeasure"
                    value={formData.unitOfMeasure}
                    readOnly={!!selectedInventoryItem}
                    placeholder="Unit of measure"
                    className={selectedInventoryItem ? "bg-gray-100 cursor-not-allowed" : ""}
                    onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="requiredByDate">Required By Date</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={() => setCalendarOpen(true)}
                      >
                        {formData.requiredByDate
                          ? formatDate(formData.requiredByDate)
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
                        fromDate={new Date()}
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
                    type="number"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({...formData, estimatedCost: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="md:col-span-2">
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
                  setEditingItem(null);
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
                    <th className="text-left p-3 font-semibold text-sm border-r">#</th>
                    {/* MODIFICATION: Removed min-w-[200px] to allow column to be flexible */}
                    <th className="text-left p-3 font-semibold text-sm border-r">Item Name</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Qty</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Unit</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Required By</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Location</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Unit Cost (₹)</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Total Cost (₹)</th>
                    <th className="text-left p-3 font-semibold text-sm border-r">Stock Status</th>
                    {editable && <th className="text-center p-3 font-semibold text-sm">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || index} className="border-b hover:bg-gray-50">
                      <td className="p-3 border-r text-sm font-medium">{index + 1}</td>
                      {/* MODIFICATION: Added break-words and whitespace-normal to allow text to wrap */}
                      <td className="p-3 border-r">
                        <div className="font-medium text-sm break-words">{item.itemName}</div>
                        {item.itemJustification && (
                          <div className="text-xs text-gray-500 mt-1 whitespace-normal" title={item.itemJustification}>
                            {item.itemJustification}
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
                      <td className="p-3 border-r text-sm font-semibold text-green-600">
                        {formatCurrency((item.requiredQuantity || 0) * (parseFloat(item.estimatedCost?.toString() || '0')))}
                      </td>
                      <td className="p-3 border-r text-sm">
                        {getStockBadge(item)}
                        {getStockStatus(item) !== "in-stock" && (
                          <div className="flex items-center text-xs text-amber-600 mt-1">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {getStockStatus(item) === "low-stock" 
                              ? `Only ${item.stockAvailable} left` 
                              : "Out of stock"}
                          </div>
                        )}
                      </td>
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
                    <td className="p-3 border-r font-bold text-lg text-green-700">
                      {formatIndianCurrency(totalCost)}
                    </td>
                    <td className="p-3 border-r"></td>
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