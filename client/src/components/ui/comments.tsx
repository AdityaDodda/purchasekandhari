import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ApprovalHistory } from "@/lib/types";

interface CommentsProps {
  purchaseRequestId: number;
  canComment?: boolean;
}

export function Comments({ purchaseRequestId, canComment = true }: CommentsProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: [`/api/purchase-requests/${purchaseRequestId}/audit-logs`],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-requests/${purchaseRequestId}/audit-logs`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    enabled: !!purchaseRequestId,
  });

  const comments = Array.isArray(history)
    ? (history as ApprovalHistory[]).filter(
        (h) => h.comment && h.comment.trim() !== ""
      )
    : [];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Comments</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : comments.length === 0 ? (
          <div className="text-gray-500">No comments yet.</div>
        ) : (
          comments.map((c: any) => (
            <div key={c.id} className="mb-4">
              <div className="font-medium">
                {c.users?.name || "Approver"}
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {c.action} on {c.acted_at ? formatDate(c.acted_at) : ""}
              </div>
              <div className="bg-gray-50 border rounded p-2">{c.comment}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
} 