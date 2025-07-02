import { useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { PurchaseRequestForm } from "@/components/forms/purchase-request-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function NewRequest() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const queryClient = useQueryClient();

  const steps = [
    { number: 1, title: "Request Details", completed: false },
    { number: 2, title: "Line Items", completed: false },
    { number: 3, title: "Attachments", completed: false },
    { number: 4, title: "Review", completed: false },
  ];

  const createRequestMutation = useMutation({
    mutationFn: async ({ requestData, lineItems, attachments }: any) => {
      // Send all data in one request, backend will generate PR number
      const response = await apiRequest("POST", "/api/purchase-requests", {
        ...requestData,
        lineItems,
      });
      const request = await response.json();
      // Upload attachments if any
      if (attachments && attachments.length > 0 && request.pr_number) {
        const formData = new FormData();
        attachments.forEach((file: File) => formData.append('files', file));
        await fetch(`/api/purchase-requests/${request.pr_number}/attachments`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      }
      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      setCurrentStep(1);
      setLocation("/");
    },
    onError: (error: any) => {
      alert(error.message || "Failed to create request");
    },
  });

  const handleRequestSubmit = (requestData: any, lineItems: any[], attachments: File[]) => {
    createRequestMutation.mutate({ requestData, lineItems, attachments });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">New Purchase Request</CardTitle>
            <ProgressStepper steps={steps} currentStep={currentStep} />
          </CardHeader>
        </Card>

        {/* Form */}
        <PurchaseRequestForm
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onSubmit={handleRequestSubmit}
        />
      </div>
    </div>
  );
}
