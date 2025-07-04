import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { PurchaseRequestForm } from "@/components/forms/purchase-request-form";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function EditRequest() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [initialData, setInitialData] = useState<any>(null);

  const steps = [
    { number: 1, title: "Request Details", completed: false },
    { number: 2, title: "Line Items", completed: false },
    { number: 3, title: "Attachments", completed: false },
    { number: 4, title: "Review", completed: false },
  ];

  // Fetch the request details
  const { data, isLoading } = useQuery({
    queryKey: ["/api/purchase-requests/" + id + "/details"],
    enabled: !!id,
  });

  useEffect(() => {
    if (data) {
      setInitialData(data);
    }
  }, [data]);

  const handleRequestSubmit = async (formData: any, lineItems: any[], attachments: File[]) => {
    try {
      await apiRequest("PUT", `/api/purchase-requests/${id}`, formData);
      setLocation("/");
    } catch (error: any) {
      alert("Failed to resubmit request: " + (error?.message || error));
    }
  };

  if (isLoading || !initialData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Edit & Resubmit Request</CardTitle>
            <ProgressStepper steps={steps} currentStep={currentStep} />
          </CardHeader>
        </Card>
        {/* Review & Edit Section */}
        <PurchaseRequestForm
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onSubmit={handleRequestSubmit}
          initialData={initialData}
          isEditMode={true}
        />
      </div>
    </div>
  );
} 