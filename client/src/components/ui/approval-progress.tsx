import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Circle, XCircle } from "lucide-react";

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

  // Determine stage status
  // 0: not started, 1: approved, 2: rejected, 3: current
  let stages: Array<'approved' | 'pending' | 'rejected' | 'blank'> = ['pending', 'pending', 'pending'];
  if (request.status === 'approved') {
    stages = ['approved', 'approved', 'approved'];
  } else if (request.status === 'rejected') {
    // Mark up to currentApprovalLevel-1 as approved, current as rejected, rest blank
    for (let i = 0; i < 3; i++) {
      if (i < (request.currentApprovalLevel ?? 1) - 1) {
        stages[i] = 'approved';
      } else if (i === (request.currentApprovalLevel ?? 1) - 1) {
        stages[i] = 'rejected';
      } else {
        stages[i] = 'blank';
      }
    }
  } else if (request.status === 'returned') {
    stages = ['blank', 'blank', 'blank'];
  } else {
    // Pending: mark up to currentApprovalLevel-1 as approved, current as pending, rest as pending
    for (let i = 0; i < 3; i++) {
      if (i < (request.currentApprovalLevel ?? 1) - 1) {
        stages[i] = 'approved';
      } else if (i === (request.currentApprovalLevel ?? 1) - 1) {
        stages[i] = 'pending';
      } else {
        stages[i] = 'pending';
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center mt-2">
        <div className="flex items-center justify-center gap-x-4">
          {stages.map((status, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="flex items-center">
                {status === 'approved' && <CheckCircle className="h-8 w-8 text-green-500" />}
                {status === 'pending' && <Circle className="h-8 w-8 text-gray-400" />}
                {status === 'rejected' && <XCircle className="h-8 w-8 text-red-500" />}
                {status === 'blank' && <Circle className="h-8 w-8 text-gray-200" />}
                {idx < 2 && (
                  <div className={`h-1 w-8 ${status === 'approved' && stages[idx+1] === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'} mx-1 rounded-full`} />
                )}
              </div>
              <span className="text-xs text-gray-500 mt-1">Level {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        {request.status === 'approved'
          ? "Request approved - Procurement in progress"
          : request.status === "rejected"
          ? "Request has been rejected"
          : request.status === "returned"
          ? "Request has been returned"
          : "Awaiting approval from next level"}
      </p>
    </div>
  );
} 