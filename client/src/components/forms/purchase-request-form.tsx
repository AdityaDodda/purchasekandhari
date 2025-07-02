import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { useLocation } from "wouter";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DEPARTMENTS, LOCATIONS, BUSINESS_JUSTIFICATION_CODES } from "@/lib/constants";
import { LineItemsGrid } from "@/components/ui/line-items-grid";
import { FileUpload } from "@/components/ui/file-upload";
import type { LineItemFormData, User } from "@/lib/types";
import { formatDate } from "@/lib/utils";

// Indian currency formatting function
const formatIndianCurrency = (amount: number | string) => {
  if (!amount && amount !== 0) return "₹0.00";
  
  const num = parseFloat(amount.toString());
  if (isNaN(num)) return "₹0.00";
  
  // Convert to string with 2 decimal places
  const numStr = num.toFixed(2);
  const [integer, decimal] = numStr.split('.');
  
  // Indian number system formatting
  let formatted = '';
  const integerStr = integer;
  
  if (integerStr.length <= 3) {
    formatted = integerStr;
  } else {
    // First 3 digits from right
    let result = integerStr.slice(-3);
    let remaining = integerStr.slice(0, -3);
    
    // Add commas every 2 digits for the remaining part
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

const requestDetailsSchema = z.object({
  title: z.string().min(1, "Request title is required"),
  requestDate: z.string().min(1, "Request date is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  businessJustificationCode: z.string().min(1, "Business justification code is required"),
  businessJustificationDetails: z.string().min(50, "Business justification must be at least 50 characters"),
});

type RequestDetailsFormData = z.infer<typeof requestDetailsSchema>;

interface PurchaseRequestFormProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onSubmit: (formData: any, lineItems: any[], attachments: File[]) => void;
  initialData?: any;
  isEditMode?: boolean;
}

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

export function PurchaseRequestForm({ currentStep, onStepChange, onSubmit, initialData, isEditMode }: PurchaseRequestFormProps) {
  const [lineItems, setLineItems] = useState<LineItemFormData[]>(initialData?.lineItems || []);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"] });

  // Set up form with user department/location autofill
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    control,
    reset,
  } = useForm<RequestDetailsFormData>({
    resolver: zodResolver(requestDetailsSchema),
    defaultValues: initialData
      ? {
          title: initialData.title,
          requestDate: initialData.requestDate ? formatToDDMMYYYY(new Date(initialData.requestDate)) : formatToDDMMYYYY(new Date()),
          department: initialData.department,
          location: initialData.location,
          businessJustificationCode: initialData.businessJustificationCode,
          businessJustificationDetails: initialData.businessJustificationDetails,
        }
      : user
      ? {
          requestDate: formatToDDMMYYYY(new Date()),
          department: user.department || "",
          location: user.location || "",
        }
      : {
          requestDate: formatToDDMMYYYY(new Date()),
        },
  });

  // If user data loads after mount and no initialData, update department/location
  useEffect(() => {
    if (!initialData && user) {
      setValue("department", user.department || "");
      setValue("location", user.location || "");
    }
  }, [user, initialData, setValue]);

  const handleNextStep = () => {
    if (currentStep < 4) {
      onStepChange(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  const handleAddLineItem = (item: LineItemFormData) => {
    setLineItems([...lineItems, item]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = () => {
    if (!confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that all information is accurate.",
        variant: "destructive",
      });
      return;
    }

    const formData = getValues();
    const totalCost = lineItems.reduce((sum, item) => {
      const itemTotal = (item.requiredQuantity || 0) * (parseFloat(item.estimatedCost?.toString() || '0'));
      return sum + itemTotal;
    }, 0);

    const requestData = {
      ...formData,
      requestDate: parseDDMMYYYY(formData.requestDate),
      totalEstimatedCost: totalCost.toFixed(2),
    };

    onSubmit(requestData, lineItems, attachments);
  };

  const onRequestDetailsSubmit = (data: RequestDetailsFormData) => {
    handleNextStep();
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Request Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onRequestDetailsSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title">Request Title *</Label>
                    <Input
                      id="title"
                      {...register("title")}
                      placeholder="Enter request title"
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="entity">Entity</Label>
                    <Input
                      id="entity"
                      value={user?.entity || ""}
                      readOnly
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="requestDate">Request Date</Label>
                  <Input
                    id="requestDate"
                    {...register("requestDate")}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  {errors.requestDate && (
                    <p className="text-sm text-destructive mt-1">{errors.requestDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    value={DEPARTMENTS.find((dept) => dept.value === getValues("department"))?.label || getValues("department") || ""}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  {errors.department && (
                    <p className="text-sm text-destructive mt-1">{errors.department.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={LOCATIONS.find((loc) => loc.value === getValues("location"))?.label || getValues("location") || ""}
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  {errors.location && (
                    <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="businessJustificationCode">Business Justification Code *</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Select the appropriate business justification for this purchase</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Controller
                    name="businessJustificationCode"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Justification" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_JUSTIFICATION_CODES.map((code) => (
                            <SelectItem key={code.value} value={code.value}>
                              {code.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.businessJustificationCode && (
                    <p className="text-sm text-destructive mt-1">{errors.businessJustificationCode.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="businessJustificationDetails">Business Justification Details *</Label>
                  <Textarea
                    id="businessJustificationDetails"
                    {...register("businessJustificationDetails")}
                    rows={4}
                    placeholder="Provide detailed business justification..."
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 50 characters required</p>
                  {errors.businessJustificationDetails && (
                    <p className="text-sm text-destructive mt-1">{errors.businessJustificationDetails.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]"
                >
                  Next Step
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Line Items */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="p-6">
            <LineItemsGrid 
              items={lineItems} 
              onItemsChange={setLineItems}
              editable={true}
            />

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePrevStep}>
                Previous
              </Button>
              <Button
                onClick={handleNextStep}
                className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]"
                disabled={lineItems.length === 0}
              >
                Next Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Attachments */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              files={attachments}
              onFilesChange={setAttachments}
              maxFiles={10}
              maxFileSize={10 * 1024 * 1024} // 10MB
              acceptedFileTypes={[
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg',
                'image/png',
                'image/gif'
              ]}
            />

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePrevStep}>
                Previous
              </Button>
              <Button
                onClick={handleNextStep}
                className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]"
              >
                Review & Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Request Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Request Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-500">Title</span>
                    <span className="font-medium text-gray-900">{getValues("title")}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Request Date</span>
                    <span className="font-medium text-gray-900">{getValues("requestDate")}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Department</span>
                    <span className="font-medium text-gray-900">{getValues("department")}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Location</span>
                    <span className="font-medium text-gray-900">{getValues("location")}</span>
                  </div>
                </div>
              </div>

              {/* Line Items Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Items Summary</h3>
                <div className="text-sm">
                  <div className="grid grid-cols-5 gap-4 font-medium text-gray-700 mb-2">
                    <span>Item</span>
                    <span>Quantity</span>
                    <span>Unit</span>
                    <span>Unit Cost</span>
                    <span>Total Cost</span>
                  </div>
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-5 gap-4 text-gray-900 py-1">
                      <span>{item.itemName}</span>
                      <span>{item.requiredQuantity}</span>
                      <span>{item.unitOfMeasure}</span>
                      <span>{formatIndianCurrency(item.estimatedCost)}</span>
                      <span className="font-semibold text-green-600">
                        {formatIndianCurrency((item.requiredQuantity || 0) * (parseFloat(item.estimatedCost?.toString() || '0')))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Cost Display */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Estimated Cost</h3>
                  <div className="text-3xl font-bold text-green-700">
                    {formatIndianCurrency(lineItems.reduce((sum, item) => {
                      const itemTotal = (item.requiredQuantity || 0) * (parseFloat(item.estimatedCost?.toString() || '0'));
                      return sum + itemTotal;
                    }, 0))}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {lineItems.length} item{lineItems.length !== 1 ? 's' : ''} total
                  </p>
                </div>
              </div>

              {/* Attachments Summary */}
              {attachments.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Attachments ({attachments.length})</h3>
                  <div className="space-y-1 text-sm">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{file.name}</span>
                        <span className="text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation */}
              <div className="bg-[hsl(207,75%,95%)] rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirmation"
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked === true)}
                  />
                  <Label htmlFor="confirmation" className="text-sm text-gray-700">
                    I confirm that all information provided is accurate and complete. I understand that this request will be routed for approval based on company policies.
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handlePrevStep}>
                Previous
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={!confirmed}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}