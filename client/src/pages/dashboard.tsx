import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Clock, CheckCircle, XCircle, Package, Calendar, MapPin, Users, DollarSign, Paperclip } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@/lib/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Comments } from "@/components/ui/comments";
import { AuditLog } from "@/components/ui/audit-log";
import { ApprovalProgress } from "@/components/ui/approval-progress";

// type User = {
//   id: string;
//   role: string;
//   emp_code: string;
// };

// Add types for stats and requests
interface DashboardStats {
  totalRequests?: number;
  pendingRequests?: number;
  approvedRequests?: number;
  rejectedRequests?: number;
}

interface PurchaseRequest {
  id: string;
  requisitionNumber: string;
  title: string;
  department: string;
  status: string;
  requestDate: string;
  lineItems?: any[];
  [key: string]: any;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeView, setActiveView] = useState<'my' | 'approver' | 'pending' | 'all'>('my');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedRequester, setSelectedRequester] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [editMode, setEditMode] = useState<null | 'approve' | 'reject' | 'return'>(null);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"] });

  const { data: users } = useQuery({ queryKey: ["/api/users"] });

  let queryParams: Record<string, any> = {};
  if (activeView === 'approver' && user) {
    queryParams = { currentApproverId: user.emp_code, status: 'pending', userEmpCode: user.emp_code };
  } else if (activeView === 'pending') {
    queryParams = { currentApproverId: user?.emp_code, status: 'pending', userEmpCode: user?.emp_code };
  } else if (activeView === 'my') {
    queryParams = { createdBy: user?.emp_code, userEmpCode: user?.emp_code };
  }

  const { data: requests, isLoading: isLoadingRequests } = useQuery<PurchaseRequest[]>({
    queryKey: ["/api/purchase-requests", queryParams],
  });

  const { data: requestDetails, isLoading: isLoadingDetails } = useQuery<PurchaseRequest>({
    queryKey: [`/api/purchase-requests/${selectedRequest?.id}/details`],
    enabled: !!selectedRequest?.id,
  });

  const { data: attachments = [], isLoading: isLoadingAttachments } = useQuery({
    queryKey: [selectedRequest?.requisitionNumber, 'attachments'],
    queryFn: async () => {
      if (!selectedRequest?.requisitionNumber) return [];
      const res = await fetch(`/api/purchase-requests/${selectedRequest.requisitionNumber}/attachments`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedRequest?.requisitionNumber && showDetailsModal,
  });

  // Reset page to 1 when requests data changes
  useEffect(() => {
    setPage(1);
  }, [requests]);

  // Fetch requester user info when selectedRequest changes
  useEffect(() => {
    async function fetchRequester() {
      if (selectedRequest?.requesterId) {
        const res = await fetch(`/api/users/${selectedRequest.requesterId}`, { credentials: 'include' });
        if (res.ok) {
          const user = await res.json();
          setSelectedRequester(user);
        } else {
          setSelectedRequester(null);
        }
      } else {
        setSelectedRequester(null);
      }
    }
    fetchRequester();
  }, [selectedRequest]);

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
                      Current Approver
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
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Loading requests...
                      </td>
                    </tr>
                  ) : Array.isArray(requests) && requests.length > 0 ? (
                    requests
                      .slice((page - 1) * pageSize, page * pageSize)
                      .map((request: PurchaseRequest) => (
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
                            <StatusBadge
                              status={request.status}
                              daysPending={request.status === 'pending'
                                ? Math.floor((Date.now() - new Date(request.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                                : undefined}
                              approverLevel={request.status === 'pending' ? request.currentApprovalLevel : undefined}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.status === 'pending' ? (() => {
                              if (request.currentApprovalLevel === 3 && request.approvalMatrix) {
                                const approver3aId = request.approvalMatrix.approver_3a_emp_code;
                                const approver3bId = request.approvalMatrix.approver_3b_emp_code;
                                const approver3a = Array.isArray(users) && users.find((u: any) => u.emp_code === approver3aId);
                                const approver3b = Array.isArray(users) && users.find((u: any) => u.emp_code === approver3bId);
                                const names = [approver3a?.name || approver3aId, approver3b?.name || approver3bId].filter(Boolean).join(' / ');
                                return names || '-';
                              } else {
                                const approverId = request.currentApproverId;
                                const approver = Array.isArray(users) && users.find((u: any) => u.emp_code === approverId);
                                return approver?.name || approverId || '-';
                              }
                            })() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.requestDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button variant="ghost" size="sm"
                                className="text-[hsl(207,90%,54%)]"
                                onClick={() => handleViewDetails(request)}>View</Button>
                              {request.status === 'returned' && request.requesterId === user?.emp_code && (
                                <Button variant="ghost" size="sm"
                                  className="text-orange-600"
                                  onClick={() => setLocation(`/edit-request/${request.id}`)}>Edit</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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
                <StatusBadge status={selectedRequest?.status} className="mr-4" />
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
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-500">Requester:</span>
                          <span className="ml-2 font-medium">{selectedRequest?.requesterId}</span>
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
                      {/* Current Approver row, only for pending requests */}
                      {selectedRequest?.status === 'pending' && (
                        <div className="flex items-center text-sm">
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-gray-500">Current Approver:</span>
                          <span className="ml-2 font-medium">{(() => {
                            if (selectedRequest.currentApprovalLevel === 3 && selectedRequest.approvalMatrix) {
                              const approver3aId = selectedRequest.approvalMatrix.approver_3a_emp_code;
                              const approver3bId = selectedRequest.approvalMatrix.approver_3b_emp_code;
                              const approver3a = Array.isArray(users) && users.find((u: any) => u.emp_code === approver3aId);
                              const approver3b = Array.isArray(users) && users.find((u: any) => u.emp_code === approver3bId);
                              const names = [approver3a?.name || approver3aId, approver3b?.name || approver3bId].filter(Boolean).join(' / ');
                              return names || '-';
                            } else {
                              const approverId = selectedRequest.currentApproverId;
                              const approver = Array.isArray(users) && users.find((u: any) => u.emp_code === approverId);
                              return approver?.name || approverId || '-';
                            }
                          })()}</span>
                        </div>
                      )}
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

                {/* Attachments */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Paperclip className="h-5 w-5 mr-2 text-blue-600" />
                    Attachments
                  </h3>
                  {isLoadingAttachments ? (
                    <div className="text-gray-500">Loading attachments...</div>
                  ) : attachments.length > 0 ? (
                    <ul className="space-y-2">
                      {attachments.map((file: any) => (
                        <li key={file.id} className="flex items-center space-x-2">
                          <a
                            href={`/${file.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {file.original_name}
                          </a>
                          <span className="text-xs text-gray-400">({(file.file_size / 1024).toFixed(1)} KB)</span>
                          <button
                            className="ml-2 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                            onClick={() => {
                              window.open(`/api/attachments/${file.id}/download`, '_blank');
                            }}
                          >
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No attachments uploaded for this request.</div>
                  )}
                </div>

                <Separator />

                {/* Comments and Audit Log */}
                {selectedRequest?.id && (
                  <>
                    <Comments purchaseRequestId={selectedRequest.id} />
                    <AuditLog 
                      purchaseRequestId={selectedRequest.id}
                      createdAt={selectedRequest.createdAt}
                      requester={selectedRequester}
                    />
                  </>
                )}

                {/* Progress Information */}
                {selectedRequest && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Approval Progress</h3>
                    <ApprovalProgress request={selectedRequest} />
                    <ApprovalAuditLog requestId={selectedRequest.id} />
                    {/* Approve button for current approver, manager, or escalation approver (using escalation_matrix) */}
                    {user && selectedRequest.status === 'pending' && (() => {
                      // Get escalation matrix from selectedRequest or requestDetails
                      const escalation = selectedRequest.escalation_matrix || requestDetails?.escalation_matrix;
                      if (!escalation) return false;
                      const userEmpCode = user.emp_code;
                      // List all possible approver/manager codes
                      const approverCodes = [
                        escalation.approver_1_code,
                        escalation.approver_2_code,
                        escalation.approver_3a_code,
                        escalation.approver_3b_code,
                        escalation.manager_1_code,
                        escalation.manager_2_code
                      ];
                      // Only show if user is in the escalation matrix as approver or manager
                      if (!approverCodes.includes(userEmpCode)) return false;
                      console.log(approverCodes);
                      return (
                        <div className="mt-6">
                          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                          <Textarea
                            id="comment"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Enter your comment here..."
                            disabled={!editMode}
                            className="mb-4"
                          />
                          {editMode === null ? (
                            <div className="flex gap-2">
                              <Button
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setEditMode('approve')}
                                disabled={selectedRequest.status !== 'pending'}
                              >
                                Approve
                              </Button>
                              <Button
                                className="bg-blue-500 text-white"
                                onClick={() => setEditMode('return')}
                                disabled={selectedRequest.status !== 'pending'}
                              >
                                Return
                              </Button>
                              <Button
                                className="bg-orange-600 text-white"
                                onClick={() => setEditMode('reject')}
                                disabled={selectedRequest.status !== 'pending'}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              {editMode === 'approve' && (
                                <Button
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={async () => {
                                    // Approve logic
                                    if (!comment.trim()) {
                                      setEditMode('approve');
                                      return;
                                    }
                                    try {
                                      await fetch(`/api/purchase-requests/${selectedRequest.id}/approve`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ comment }),
                                        credentials: 'include',
                                      });
                                      setShowDetailsModal(false);
                                      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                                    } catch (e) {}
                                    setEditMode(null);
                                  }}
                                  disabled={selectedRequest.status !== 'pending'}
                                >
                                  Submit Approve
                                </Button>
                              )}
                              {editMode === 'return' && (
                                <Button
                                  className="bg-blue-500 text-white"
                                  onClick={async () => {
                                    if (!comment.trim()) {
                                      setEditMode('return');
                                      return;
                                    }
                                    try {
                                      await fetch(`/api/purchase-requests/${selectedRequest.id}/return`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ comment }),
                                        credentials: 'include',
                                      });
                                      setShowDetailsModal(false);
                                      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                                    } catch (e) {}
                                    setEditMode(null);
                                  }}
                                  disabled={selectedRequest.status !== 'pending'}
                                >
                                  Submit Return
                                </Button>
                              )}
                              {editMode === 'reject' && (
                                <Button
                                  className="bg-orange-600 text-white"
                                  onClick={async () => {
                                    if (!comment.trim()) {
                                      setEditMode('reject');
                                      return;
                                    }
                                    try {
                                      await fetch(`/api/purchase-requests/${selectedRequest.id}/reject`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ comment }),
                                        credentials: 'include',
                                      });
                                      setShowDetailsModal(false);
                                      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
                                    } catch (e) {}
                                    setEditMode(null);
                                  }}
                                  disabled={selectedRequest.status !== 'pending'}
                                >
                                  Submit Reject
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                onClick={() => setEditMode(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
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