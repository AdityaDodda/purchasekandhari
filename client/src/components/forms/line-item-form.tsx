import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOCATIONS, UNITS_OF_MEASURE } from "@/lib/constants";
import type { LineItemFormData } from "@/lib/types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { formatDate } from "@/lib/utils";

const lineItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  requiredQuantity: z.number().min(1, "Quantity must be at least 1"),
  unitOfMeasure: z.string().min(1, "Unit of measure is required"),
  requiredByDate: z.string().min(1, "Required by date is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  estimatedCost: z.number().min(0.01, "Estimated cost must be greater than 0"),
  itemJustification: z.string().optional(),
});

interface LineItemFormProps {
  onAddItem: (item: LineItemFormData) => void;
}

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

export function LineItemForm({ onAddItem }: LineItemFormProps) {
  const [open, setOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<number | null>(null);
  const [quantityDiff, setQuantityDiff] = useState<number | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    getValues,
  } = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
  });

  const { data: inventory } = useQuery({ queryKey: ["/api/inventory"] });

  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("itemName", name);
    const stock = inventory?.find((item: any) => item.name === name)?.quantity ?? null;
    setSelectedStock(stock);
    const reqQty = Number(getValues("requiredQuantity"));
    if (stock !== null && reqQty) {
      setQuantityDiff(reqQty - stock);
      if (reqQty - stock <= 0) {
        setStockError("Required quantity of item is already in stock. Select another item.");
      } else {
        setStockError(null);
      }
    } else {
      setQuantityDiff(null);
      setStockError(null);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = Number(e.target.value);
    setValue("requiredQuantity", qty);
    const name = getValues("itemName");
    const stock = inventory?.find((item: any) => item.name === name)?.quantity ?? null;
    setSelectedStock(stock);
    if (stock !== null && qty) {
      setQuantityDiff(qty - stock);
      if (qty - stock <= 0) {
        setStockError("Required quantity of item is already in stock. Select another item.");
      } else {
        setStockError(null);
      }
    } else {
      setQuantityDiff(null);
      setStockError(null);
    }
  };

  // Helper to parse dd-mm-yyyy to Date
  function parseDDMMYYYY(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split("-");
    if (!day || !month || !year) return null;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Helper to format Date to dd-mm-yyyy
  function formatToDDMMYYYY(date: Date | null): string {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const onSubmit = (data: LineItemFormData) => {
    if (quantityDiff !== null && quantityDiff <= 0) {
      setStockError("Required quantity of item is already in stock. Select another item.");
      return;
    }
    const finalData = {
      ...data,
      requiredQuantity: quantityDiff ?? data.requiredQuantity,
    };
    onAddItem(finalData);
    reset();
    setOpen(false);
    setSelectedStock(null);
    setQuantityDiff(null);
    setStockError(null);
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="itemName">Item Name *</Label>
              <div className="relative">
                <Input
                  id="itemName"
                  {...register("itemName")}
                  placeholder="Search or enter item name"
                  className="pr-10"
                  onChange={handleItemNameChange}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
              {errors.itemName && (
                <p className="text-sm text-destructive mt-1">{errors.itemName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="requiredQuantity">Required Quantity *</Label>
              <Input
                id="requiredQuantity"
                type="number"
                {...register("requiredQuantity", { valueAsNumber: true })}
                placeholder="0"
                min="1"
                onChange={handleQuantityChange}
              />
              {errors.requiredQuantity && (
                <p className="text-sm text-destructive mt-1">{errors.requiredQuantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unitOfMeasure">Unit of Measure *</Label>
              <Select onValueChange={(value) => setValue("unitOfMeasure", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OF_MEASURE.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    selected={parseDDMMYYYY(getValues("requiredByDate"))}
                    onSelect={(date) => {
                      setValue("requiredByDate", formatToDDMMYYYY(date));
                      setCalendarOpen(false);
                    }}
                    fromDate={new Date()}
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
              <Select onValueChange={(value) => setValue("deliveryLocation", value)}>
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
          </div>

          {/* Always visible stock fields below the grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            <div>
              <Label>Current Stock</Label>
              <Input value={selectedStock ?? ""} readOnly className="bg-gray-100" />
            </div>
            <div>
              <Label>Required - Stock</Label>
              <Input value={quantityDiff ?? ""} readOnly className="bg-gray-100" />
            </div>
            <div className="flex items-end">{/* Error message if any */}
              {stockError && (
                <p className="text-sm text-destructive mt-1">{stockError}</p>
              )}
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
