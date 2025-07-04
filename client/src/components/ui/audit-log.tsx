import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ApprovalHistory } from "@/lib/types";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface AuditLogProps {
  purchaseRequestId: number;
  createdAt?: string;
  requester?: any;
}

const actionLabels: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
  submitted: "Submitted",
  admin_approved: "Admin Approved",
};

export function AuditLog({ purchaseRequestId, createdAt, requester }: AuditLogProps) {
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

  // Add initial submission entry if createdAt is available
  const submissionEntry = createdAt ? [{
    id: 'submitted',
    action: 'submitted',
    users: requester || { name: 'User' },
    approval_level: 0,
    acted_at: createdAt,
    comments: '',
  }] : [];

  // Combine and reverse order
  const fullLog = [...submissionEntry, ...auditLog].reverse();

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="audit">
        <AccordionTrigger>Audit History</AccordionTrigger>
        <AccordionContent>
          <Card className="mt-2">
            <CardContent className="p-4">
              {isLoading ? (
                <div>Loading...</div>
              ) : fullLog.length === 0 ? (
                <div className="text-gray-500">No audit log yet.</div>
              ) : (
                <div className="flex flex-col gap-y-3">
                  {fullLog.map((h: any) => (
                    <div key={h.id}>
                    <div>
                      <span className="font-medium">
                        {h.users?.name || h.users?.fullName || h.users?.username || h.users?.emp_code || (h.action === 'submitted' ? 'User' : 'Approver')}
                      </span>{" "}
                      <span className="text-xs text-gray-500">
                        ({actionLabels[h.action?.toLowerCase() || ""] || h.action} at level {h.approval_level} on {h.acted_at ? formatDateTime(h.acted_at) : ""})
                      </span>
                      {h.comments && (
                        <div className="text-xs text-gray-700 mt-1">Comment: {h.comments}</div>
                      )}
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
} 