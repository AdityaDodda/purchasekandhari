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
  // Fetch audit history for this request
  const { data: auditHistory } = useQuery({
    queryKey: ["/api/purchase-requests", request.id, "audit-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-requests/${request.id}/audit-logs`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    enabled: !!request?.id,
  });

  const levels = [1, 2, 3];
  // Find the latest action for each level
  const stageStatus: Array<'approved' | 'pending' | 'rejected' | 'blank'> = levels.map((level) => {
    if (!Array.isArray(auditHistory)) return 'pending';
    // Find the latest action for this level
    const actions = auditHistory.filter((h: any) => h.approval_level === level);
    if (actions.length === 0) return 'pending';
    // Find the last action for this level
    const last = actions[actions.length - 1];
    if (last.action === 'approved' || last.action === 'admin_approved') return 'approved';
    if (last.action === 'rejected') return 'rejected';
    if (last.action === 'returned') return 'blank';
    return 'pending';
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-col items-center mt-2">
        <div className="flex items-center justify-center gap-x-4">
          {stageStatus.map((status, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="flex items-center">
                {status === 'approved' && <CheckCircle className="h-8 w-8 text-green-500" />}
                {status === 'pending' && <Circle className="h-8 w-8 text-gray-400" />}
                {status === 'rejected' && <XCircle className="h-8 w-8 text-red-500" />}
                {status === 'blank' && <Circle className="h-8 w-8 text-gray-200" />}
                {idx < 2 && (
                  <div className={`h-1 w-8 ${status === 'approved' && stageStatus[idx+1] === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'} mx-1 rounded-full`} />
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