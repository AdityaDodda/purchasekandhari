import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ApprovalHistory } from "@/lib/types";

interface AuditLogProps {
  purchaseRequestId: number;
}

const actionLabels: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
  submitted: "Submitted",
  admin_approved: "Admin Approved",
};

export function AuditLog({ purchaseRequestId }: AuditLogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: [`/api/purchase-requests/${purchaseRequestId}/audit-logs`],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-requests/${purchaseRequestId}/audit-logs`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    enabled: !!purchaseRequestId,
  });

  const auditLog = Array.isArray(history)
    ? (history as ApprovalHistory[]).filter(
        (h) => ["approved", "rejected", "returned", "admin_approved", "submitted"].includes((h.action || "").toLowerCase())
      )
    : [];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : auditLog.length === 0 ? (
          <div className="text-gray-500">No audit log yet.</div>
        ) : (
          auditLog.map((h: any) => (
            <div key={h.id} className="mb-3">
              <div>
                <span className="font-medium">{h.users?.name || "Approver"}</span>{" "}
                <span className="text-xs text-gray-500">
                  ({actionLabels[h.action?.toLowerCase() || ""] || h.action} at level {h.approvalLevel} on {h.acted_at ? formatDateTime(h.acted_at) : ""})
                </span>
                {h.comments && (
                  <div className="text-xs text-gray-700 mt-1">Comment: {h.comments}</div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
} 