import { useQuery } from "@tanstack/react-query";

interface PurchaseRequest {
  id: string;
  requisitionNumber: string;
  title: string;
  department: string;
  status: string;
  requestDate: string;
  lineItems?: any[];
  currentApprovalLevel?: number;
  [key: string]: any;
}

export function ApprovalProgress({ request }: { request: PurchaseRequest }) {
  const { data: workflow } = useQuery({
    queryKey: ["/api/approval-workflow", request.department, request.location],
    enabled: !!request,
  });
  // Calculate display level for progress bar
  let displayLevel = 0;
  if (request.status === 'approved') {
    displayLevel = 3;
  } else if (request.currentApprovalLevel === 3) {
    displayLevel = 2;
  } else if (request.currentApprovalLevel === 2) {
    displayLevel = 1;
  } else if (request.currentApprovalLevel === 1) {
    displayLevel = 0;
  }
  // If the request is rejected, keep percent at the last stage reached (optional: could set to 0 or a special value)
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          Level {displayLevel} of 3
        </span>
        <span className="text-sm text-gray-500">
          {((displayLevel / 3) * 100).toFixed(2)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${((displayLevel / 3) * 100).toFixed(2)}%` }}
        />
      </div>
      {Array.isArray(workflow) && (
        <div className="mt-2 space-y-1">
          {workflow.map((level: any, idx: number) => (
            <div key={level.approvalLevel} className="flex items-center text-sm">
              <span className="font-medium mr-2">Level {level.approvalLevel}:</span>
              <span>{level.approver.fullName} ({level.approver.email})</span>
              {request.currentApprovalLevel === level.approvalLevel && request.status === 'pending' && (
                <span className="ml-2 text-blue-600">(Current)</span>
              )}
              {request.currentApprovalLevel > level.approvalLevel && (
                <span className="ml-2 text-green-600">(Approved)</span>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">
        {displayLevel === 3
          ? "Request approved - Procurement in progress"
          : request.status === "rejected"
          ? "Request has been rejected"
          : request.status === "pending"
          ? "Awaiting approval from next level"
          : "Under review"}
      </p>
    </div>
  );
} 