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
  const [resubmissionComment, setResubmissionComment] = useState("");

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
      const body = { ...formData };
      if (initialData?.status === "returned") {
        body.resubmissionComment = resubmissionComment;
      }
      await apiRequest("PUT", `/api/purchase-requests/${id}`, body);
      setLocation("/my-requests");
    } catch (error) {
      alert("Failed to resubmit request: " + (error.message || error));
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
        {initialData?.status === "returned" && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50">
            <CardContent className="p-4">
              <div className="mb-2 text-yellow-900 font-semibold">
                This request was returned. Please review the comments, make necessary changes, and provide a resubmission comment below. The approval flow will restart from the first approver.
              </div>
              <Label htmlFor="resubmissionComment">Resubmission Comment *</Label>
              <Input
                id="resubmissionComment"
                value={resubmissionComment}
                onChange={e => setResubmissionComment(e.target.value)}
                placeholder="Explain what you changed or why you are resubmitting"
                required
              />
            </CardContent>
          </Card>
        )}
        {/* Review & Edit Section */}
        {initialData?.status === "returned" && currentStep === 4 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Review & Submit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Request Details Summary */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Request Details</div>
                    <div className="text-sm text-gray-600">{initialData.title}</div>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>Edit</Button>
                </div>
                <Separator />
                {/* Line Items Summary */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Line Items</div>
                    <div className="text-sm text-gray-600">{initialData.lineItems?.length || 0} items</div>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>Edit</Button>
                </div>
                <Separator />
                {/* Attachments Summary */}
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">Attachments</div>
                    <div className="text-sm text-gray-600">{initialData.attachments?.length || 0} files</div>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>Edit</Button>
                </div>
                <Separator />
                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button className="bg-green-600 text-white" onClick={() => setCurrentStep(4)}>Submit for Approval</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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