import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Download, Filter, X, Calendar, MapPin, Package, DollarSign, Paperclip } from "lucide-react";
import { CommentsAuditLog } from "@/components/ui/comments-audit-log";

import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

export default function MyRequests() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    status: "all",
    department: "all",
    dateRange: "30",
  });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/purchase-requests", filters],
  });

  const { data: requestDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: [`/api/purchase-requests/${selectedRequest?.id}/details`],
    enabled: !!selectedRequest,
  });

  const { data: attachments, isLoading: isLoadingAttachments } = useQuery({
    queryKey: [selectedRequest?.pr_number, 'attachments'],
    queryFn: async () => {
      if (!selectedRequest?.pr_number) return [];
      const res = await fetch(`/api/purchase-requests/${selectedRequest.pr_number}/attachments`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedRequest?.pr_number && showDetailsModal,
  });

  useEffect(() => {
    setPage(1);
  }, [requests]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleEditResubmit = (request: any) => {
    setLocation(`/edit-request/${request.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Requests</h1>
            <p className="text-gray-600">Track and manage your purchase requests</p>
          </div>
          <Button
            onClick={() => setLocation("/new-request")}
            className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Alert for Returned/Rejected Requests */}
        {requests && requests.filter((r: any) => r.status === 'returned' || r.status === 'rejected').length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Action Required</h3>
                  <p className="text-red-700 mb-3">
                    You have {requests.filter((r: any) => r.status === 'returned').length} returned and {requests.filter((r: any) => r.status === 'rejected').length} rejected requests that need your attention.
                  </p>
                  <div className="space-y-2">
                    {requests.filter((r: any) => r.status === 'returned' || r.status === 'rejected').slice(0, 3).map((request: any) => (
                      <div key={request.id} className="bg-white rounded p-3 border border-red-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-red-800">{request.title}</span>
                            <Badge className={`ml-2 ${request.status === 'returned' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {request.status.toUpperCase()}
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-300 hover:bg-red-100"
                            onClick={() => handleViewDetails(request)}
                          >
                            View Comments
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 mt-3">
                    Click "View Comments" to see admin feedback and take necessary action.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange("dateRange", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Last 30 days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 6 months</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <Select value={filters.department} onValueChange={(value) => handleFilterChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Quality Control">Quality Control</SelectItem>
                    <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button className="w-full bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Your Purchase Requests</CardTitle>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(requests) && requests.length > 0 ? (
                requests.slice((page - 1) * pageSize, page * pageSize).map((request: any) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{request.title}</h3>
                        <p className="text-sm text-gray-500">{request.requisitionNumber}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>

                    {/* Show current approver */}
                    {request.currentApprover && (
                      <div className="text-xs text-gray-700 mb-2">
                        <span className="font-medium">Current Approver: </span>
                        <span>{request.currentApprover.fullName} ({request.currentApprover.email})</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Department:</span>
                        <p className="font-medium">{request.department}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Location:</span>
                        <p className="font-medium">{request.location}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Cost:</span>
                        <p className="font-medium">{formatCurrency(request.totalEstimatedCost)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Submitted:</span>
                        <p className="font-medium">{formatDate(request.requestDate)}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">Progress</span>
                        <span className="text-xs font-medium text-gray-700">
                          {request.currentApprovalLevel}/4
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[hsl(207,90%,54%)] h-2 rounded-full"
                          style={{ width: `${(request.currentApprovalLevel / 4) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-[hsl(207,90%,54%)]"
                          onClick={() => handleViewDetails(request)}
                        >
                          View Details
                        </Button>
                        {request.status === 'returned' && request.requesterId === user?.id && (
                          <Button variant="ghost" size="sm" className="text-orange-600" onClick={() => handleEditResubmit(request)}>
                            Edit & Resubmit
                          </Button>
                        )}
                        {request.status !== 'returned' && (
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-red-500">
                          Cancel
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.status === "approved" ? "Procurement in progress" : "Next: Finance Approval"}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No purchase requests found</p>
                  <Button
                    className="mt-4 bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]"
                    onClick={() => setLocation("/new-request")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Request
                  </Button>
                </div>
              )}

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
            </div>
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
                        <span className="ml-2 font-medium text-green-600">
                          {formatCurrency(selectedRequest?.totalEstimatedCost)}
                        </span>
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

                {/* Line Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-600" />
                    Line Items ({requestDetails?.lineItems?.length || 0})
                  </h3>
                  
                  <div className="space-y-3">
                    {requestDetails?.lineItems && requestDetails.lineItems.length > 0 ? (
                      requestDetails.lineItems.map((item: any, index: number) => (
                        <Card key={item.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  {index + 1}. {item.itemName}
                                </h4>
                                {item.itemJustification && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    {item.itemJustification}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <span>Quantity: <strong>{item.requiredQuantity} {item.unitOfMeasure}</strong></span>
                                  <span>Required by: <strong>{formatDate(item.requiredByDate)}</strong></span>
                                  <span>Delivery: <strong>{item.deliveryLocation}</strong></span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency((item.requiredQuantity || 0) * (parseFloat(item.estimatedCost?.toString() || '0')))}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {formatCurrency(item.estimatedCost)} per {item.unitOfMeasure}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No line items found for this request</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Attachments */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Paperclip className="h-5 w-5 mr-2 text-blue-600" />
                    Attachments
                  </h3>
                  {isLoadingAttachments ? (
                    <div className="text-gray-500">Loading attachments...</div>
                  ) : attachments && attachments.length > 0 ? (
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
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No attachments uploaded for this request.</div>
                  )}
                </div>

                <Separator />

                {/* Comments and Audit Log - THIS IS WHERE ADMIN COMMENTS APPEAR */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Comments & Audit Trail</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>This section shows:</strong>
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 ml-4">
                    <li>• <strong>Comments Tab:</strong> All admin feedback when they approve, reject, or return your request</li>
                    <li>• <strong>Audit Tab:</strong> Complete timeline of all actions taken on your request</li>
                    <li>• You can also add your own comments to communicate with approvers</li>
                  </ul>
                  {selectedRequest?.status === 'returned' && (
                    <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                      <p className="text-sm text-yellow-800 font-medium">
                        ⚠️ Your request was returned - Check the comments below to see what needs to be changed!
                      </p>
                    </div>
                  )}
                  {selectedRequest?.status === 'rejected' && (
                    <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                      <p className="text-sm text-red-800 font-medium">
                        ❌ Your request was rejected - Check the comments below to see the reason!
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Progress Information */}
                {selectedRequest && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Approval Progress</h3>
                    <ApprovalProgress request={selectedRequest} />
                    {/* Show Comments & Audit Log below approval progress only when viewing details */}
                    <CommentsAuditLog purchaseRequestId={selectedRequest.id} />
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

export function ApprovalProgress({ request }) {
  const { data: workflow } = useQuery({
    queryKey: ["/api/approval-workflow", request.department, request.location],
    enabled: !!request,
  });
  const maxLevel = workflow?.length || 2;
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
      {workflow && (
        <div className="mt-2 space-y-1">
          {workflow.map((level, idx) => (
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
      <p className="text-sm text-gray-600 mt-2">
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

function ApprovalAuditLog({ requestId }) {
  const { data: history } = useQuery({
    queryKey: ["/api/approval-history", requestId],
    enabled: !!requestId,
  });
  if (!history) return null;
  return (
    <div className="mt-6">
      <h4 className="font-semibold text-gray-800 mb-2">Approval Audit Log</h4>
      <div className="bg-white border rounded p-2 text-sm">
        {history.length === 0 ? (
          <div className="text-gray-500">No actions yet.</div>
        ) : (
          history.map((entry, idx) => (
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
