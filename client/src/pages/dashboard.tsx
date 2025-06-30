import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, CheckCircle, XCircle, Package, Calendar, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/navbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { LineItemsGrid } from "@/components/ui/line-items-grid";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery as useUserQuery } from "@tanstack/react-query";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { CommentsAuditLog } from "@/components/ui/comments-audit-log";

type User = {
  id: string;
  role: string;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeView, setActiveView] = useState<'my' | 'approver' | 'pending' | 'all'>('my');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: user } = useUserQuery<User>({ queryKey: ["/api/auth/user"] });

  let queryParams: Record<string, any> = {};
  if (activeView === 'approver' && user) {
    queryParams = { currentApproverId: user.id, status: 'pending' };
  } else if (activeView === 'pending') {
    if (user?.role === 'approver') {
      queryParams = { currentApproverId: user.id, status: 'pending' };
    } else {
      queryParams = { status: 'pending' };
    }
  } else if (activeView === 'my') {
    queryParams = { createdBy: user?.id };
  }

  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/purchase-requests", queryParams],
  });

  const { data: requestDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: [`/api/purchase-requests/${selectedRequest?.id}/details`],
    enabled: !!selectedRequest?.id,
  });

  // Reset page to 1 when requests data changes
  useEffect(() => {
    setPage(1);
  }, [requests]);

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Request Dashboard</h1>
          <p className="text-gray-600">Manage and track your purchase requests efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-[hsl(207,90%,54%)]">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-[hsl(207,90%,54%)]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalRequests ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[hsl(32,100%,50%)]">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-[hsl(32,100%,50%)]" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.pendingRequests ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.approvedRequests ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.rejectedRequests ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Requests Table */}
        <Card>
          <CardContent>
            <div className="flex space-x-2 mt-6 mb-4">
              {user?.role === 'approver' ? (
                <>
                  <Button variant={activeView === 'my' ? 'default' : 'outline'} onClick={() => setActiveView('my')}>My Requests</Button>
                  <Button variant={activeView === 'pending' ? 'default' : 'outline'} onClick={() => setActiveView('pending')}>Pending Requests</Button>
                </>
              ) : (
                <>
                  <Button variant={activeView === 'my' ? 'default' : 'outline'} onClick={() => setActiveView('my')}>My Requests</Button>
                  {user?.role === 'approver' && (
                    <Button variant={activeView === 'approver' ? 'default' : 'outline'} onClick={() => setActiveView('approver')}>Approver Inbox</Button>
                  )}
                  <Button variant={activeView === 'pending' ? 'default' : 'outline'} onClick={() => setActiveView('pending')}>Pending Requests</Button>
                </>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingRequests ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Loading requests...
                      </td>
                    </tr>
                  ) : Array.isArray(requests) && requests.length > 0 ? (
                    requests
                      .slice((page - 1) * pageSize, page * pageSize)
                      .map((request: any) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.requisitionNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.requestDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[hsl(207,90%,54%)]"
                                onClick={() => handleViewDetails(request)}
                              >
                                View
                              </Button>
                              {request.status === 'returned' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-orange-600"
                                >
                                  Resubmit
                                </Button>
                              )}
                              {(request.status === 'submitted' || request.status === 'returned') && (
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No requests found for this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {Array.isArray(requests) && requests.length > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        aria-disabled={page === 1}
                      />
                    </PaginationItem>
                    {[...Array(Math.ceil(requests.length / pageSize))].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={page === i + 1}
                          onClick={() => setPage(i + 1)}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(Math.ceil(requests.length / pageSize), p + 1))}
                        aria-disabled={page === Math.ceil(requests.length / pageSize)}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed View Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {selectedRequest?.title}
                  </DialogTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedRequest?.requisitionNumber}
                  </p>
                </div>
                <StatusBadge status={selectedRequest?.status} />
              </div>
            </DialogHeader>

            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <div className="animate-pulse space-y-4 w-full">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Request Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Package className="h-5 w-5 mr-2 text-blue-600" />
                        Request Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">Submitted:</span>
                        <span className="ml-2 font-medium">
                          {selectedRequest && formatDate(selectedRequest.requestDate)}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">Department:</span>
                        <span className="ml-2 font-medium">{selectedRequest?.department}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 font-medium">{selectedRequest?.location}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">Total Cost:</span>
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(selectedRequest?.totalEstimatedCost)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Business Justification</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="outline">{selectedRequest?.businessJustificationCode}</Badge>
                        <p className="text-sm text-gray-700">
                          {selectedRequest?.businessJustificationDetails}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Line Items Grid */}
                <LineItemsGrid 
                  items={requestDetails?.lineItems || []} 
                  onItemsChange={() => {}} 
                  editable={false}
                />

                <Separator />

                {/* Comments and Audit Log */}
                <CommentsAuditLog purchaseRequestId={selectedRequest?.id} />

                {/* Progress Information */}
                {selectedRequest && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Approval Progress</h3>
                    <ApprovalProgress request={selectedRequest} />
                    <ApprovalAuditLog requestId={selectedRequest.id} />
                    {/* Approve button for current approver only */}
                    {user && selectedRequest.status === 'pending' && selectedRequest.currentApproverId === user.id && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={async () => {
                            const comments = prompt("Enter approval comments (optional):");
                            try {
                              await fetch(`/api/purchase-requests/${selectedRequest.id}/approve`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ comments }),
                                credentials: 'include',
                              });
                              alert('Request approved!');
                              setShowDetailsModal(false);
                            } catch (e) {
                              alert('Failed to approve request.');
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          className="bg-blue-500 text-white"
                          onClick={() => alert('Dummy Return action')}
                        >
                          Return
                        </Button>
                        <Button
                          className="bg-orange-600 text-white"
                          onClick={() => alert('Dummy Reject action')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ApprovalProgress({ request }) {
  const { data: workflow } = useQuery({
    queryKey: ["/api/approval-workflow", request.department, request.location],
    enabled: !!request,
  });
  const maxLevel = Array.isArray(workflow) ? workflow.length : 2;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          Level {request.currentApprovalLevel} of {maxLevel}
        </span>
        <span className="text-sm text-gray-500">
          {((request.currentApprovalLevel / maxLevel) * 100).toFixed(0)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${(request.currentApprovalLevel / maxLevel) * 100}%` }}
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
        {request.status === "approved" 
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

function ApprovalAuditLog({ requestId }: { requestId: number }) {
  const { data: history } = useQuery({
    queryKey: ["/api/approval-history", requestId],
    enabled: !!requestId,
  });
  const safeHistory = Array.isArray(history) ? history : [];
  if (!history) return null;
  return (
    <div className="mt-6">
      <h4 className="font-semibold text-gray-800 mb-2">Approval Audit Log</h4>
      <div className="bg-white border rounded p-2 text-sm">
        {safeHistory.length === 0 ? (
          <div className="text-gray-500">No actions yet.</div>
        ) : (
          safeHistory.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between border-b last:border-b-0 py-1">
              <span>{entry.action} by {entry.approver?.fullName || 'User'} (Level {entry.approvalLevel})</span>
              <span className="text-gray-500">{formatDate(entry.actionDate)}</span>
              {entry.comments && <span className="ml-2 text-gray-700">{entry.comments}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}