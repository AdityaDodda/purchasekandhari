import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Clock, User, Send, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ApprovalHistory } from "@/lib/types";

interface CommentsAuditLogProps {
  purchaseRequestId: number;
  canComment?: boolean;
}

interface Comment {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  comment: string;
  createdAt: string;
  type: "comment" | "status_change" | "approval" | "rejection";
}

interface AuditEntry {
  id: number;
  userId: number;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
}

export function CommentsAuditLog({ purchaseRequestId, canComment = true }: CommentsAuditLogProps) {
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "audit">("comments");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Only fetch when either section is open
  const shouldFetch = openSections.includes("comments") || openSections.includes("audit");

  const { data: history, isLoading } = useQuery({
    queryKey: [`/api/approval-history/${purchaseRequestId}`],
    enabled: shouldFetch && !!purchaseRequestId,
  });

  // Comments for next approver/requester: approvalLevel === 2, has comments
  const comments = Array.isArray(history)
    ? (history as ApprovalHistory[]).filter(
        (h) =>
          h.comments &&
          h.comments.trim() !== ""
      )
    : [];
  // Audit log: only 'approved' actions
  const auditLog = Array.isArray(history)
    ? (history as ApprovalHistory[]).filter((h) => h.action === "approved")
    : [];
  const safeHistory = Array.isArray(history) ? (history as ApprovalHistory[]) : [];

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "approved":
      case "approve":
        return "bg-green-100 text-green-800";
      case "rejected":
      case "reject":
        return "bg-red-100 text-red-800";
      case "submitted":
      case "submit":
        return "bg-blue-100 text-blue-800";
      case "returned":
      case "return":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Comments & Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion
          type="multiple"
          className="w-full"
          value={openSections}
          onValueChange={setOpenSections}
        >
          <AccordionItem value="comments">
          <AccordionTrigger>Comments Section</AccordionTrigger>
<AccordionContent>
  {isLoading ? (
    <div>Loading...</div>
  ) : comments.length === 0 ? (
    <div className="text-gray-500">No comments yet.</div>
  ) : (
    comments.map((c: ApprovalHistory) => (
      <div key={c.id} className="mb-4">
        <div className="font-medium">
          {c.approver?.fullName || "Approver"}
        </div>
        <div className="text-xs text-gray-500 mb-1">
          {c.action} on {c.actionDate ? formatDate(c.actionDate) : ""}
        </div>
        <div className="bg-gray-50 border rounded p-2">{c.comments}</div>
      </div>
    ))
  )}
</AccordionContent>

          </AccordionItem>
          {/* <AccordionItem value="audit">
            <AccordionTrigger>Audit Log</AccordionTrigger>
            <AccordionContent>
              {isLoading ? (
                <div>Loading...</div>
              ) : auditLog.length === 0 ? (
                <div className="text-gray-500">No audit log yet.</div>
              ) : (
                auditLog.map((h: ApprovalHistory) => (
                  <div key={h.id} className="mb-3">
                    <div>
                      <span className="font-medium">{h.approver?.employeeNumber || h.approverEmployeeNumber} - {h.approver?.fullName || "Approver"}</span>{" "}
                      <span className="text-xs text-gray-500">
                        (approved at level {h.approvalLevel} on {h.actionDate ? formatDate(h.actionDate) : ""})
                      </span>
                    </div>
                  </div>
                ))
              )}
            </AccordionContent>
          </AccordionItem> */}
        </Accordion>
      </CardContent>
    </Card>
  );
}