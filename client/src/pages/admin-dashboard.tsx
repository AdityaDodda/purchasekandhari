import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Filter, TrendingUp, Clock, DollarSign, BarChart3, Package, Calendar, MapPin, Database, Paperclip, FileText, Users, Building } from "lucide-react";
import qs from "query-string";
import * as XLSX from 'xlsx';
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
import { LineItemsGrid } from "@/components/ui/line-items-grid";
import { Comments } from "@/components/ui/comments";
import { AuditLog } from "@/components/ui/audit-log";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import {Pagination,PaginationContent,PaginationItem,PaginationLink,PaginationPrevious,PaginationNext,} from "@/components/ui/pagination";
import { ApprovalProgress } from "@/components/ui/approval-progress";

// Added the exportToXLSX utility function outside the component
function exportToXLSX(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn("No data to export.");
    return;
  }

  // 1. Create a new workbook
  const workbook = XLSX.utils.book_new();

  // 2. Convert the array of JSON objects to a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 3. Add the worksheet to the workbook, giving it a name (e.g., "Data")
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // 4. Trigger the download of the XLSX file.
  // The library handles the Blob creation and download link automatically.
  XLSX.writeFile(workbook, filename);
}


export default function AdminDashboard() {
  const [location , setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterForm, setFilterForm] = useState({
    status: "pending",
    department: "all",
    location: "all",
    search: "",
  });
  const [filters, setFilters] = useState({
    status: "pending",
    department: "all",
    location: "all",
    search: "",
  });
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });
   const { data: departments } = useQuery({
    queryKey: ["/api/admin/masters/departments"],
  });
  const { data: locations } = useQuery<string[]>({
    queryKey: ["/api/admin/reports/locations"],
  });
  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // Create a clean set of active filters for the API call.
  // This removes any filters that are set to 'all' or are empty strings.
  const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
    if (value && value !== 'all') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  // This query correctly uses the /api/purchase-requests route with filters.
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/purchase-requests", activeFilters],
    queryFn: async () => {
      const query = qs.stringify(activeFilters);
      const url = `/api/purchase-requests${query ? `?${query}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  // This query correctly uses the /api/purchase-requests/:id/details route for the modal.
  const { data: requestDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: [`/api/purchase-requests/${selectedRequest?.id}/details`],
    enabled: !!selectedRequest,
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

  useEffect(() => {
    setPage(1);
  }, [requests]);

  const handleFilterChange = (key: string, value: string) => {
    setFilterForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setFilters({ ...filterForm });
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleSelectRequest = (requestId: number) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (Array.isArray(requests) && requests.length > 0 && selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(Array.isArray(requests) ? requests.map((r: any) => r.id) : []);
    }
  };
  
  // HandleExportToXLSX Function
  const handleExportToXLSX = (dataToExport: any[]) => {
    if (!dataToExport || dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = dataToExport.map(req => {
      const r = req.requester;
      const requesterId = r?.id || r?.emp_code || req.requesterId || r;
      const user = Array.isArray(users) && users.find(
        (u: any) => u.id === requesterId || u.emp_code === requesterId
      );
      return {
        "Title": req.title,
      "Requisition Number": req.requisitionNumber,
        "Request Date": formatDate(req.requestDate),
        "Requester": user?.fullName || user?.name || r?.fullName || r?.name || r?.emp_code || req.requesterId || r || '',
      "Department": req.department,
      "Location": req.location,
        "Value": formatCurrency(req.totalEstimatedCost),
        "Status": req.status,
      };
    });

    const date = new Date().toISOString().split('T')[0];
    const filename = `purchase-requests-${date}.xlsx`;

    exportToXLSX(formattedData, filename);
  };

  // Action mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      return apiRequest("POST", `/api/purchase-requests/${id}/approve`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      toast({ title: "Success", description: "Request approved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      return apiRequest("POST", `/api/purchase-requests/${id}/reject`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      toast({ title: "Success", description: "Request rejected successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      return apiRequest("POST", `/api/purchase-requests/${id}/return`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
      toast({ title: "Success", description: "Request returned successfully for revision." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleApproveRequest = (id: number) => {
    const comment = prompt("Enter approval comments (optional):");
    approveMutation.mutate({ id, comment: comment || undefined });
  };

  const handleRejectRequest = (id: number) => {
    const comment = prompt("Enter rejection reason:");
    if (comment) {
      rejectMutation.mutate({ id, comment });
    }
  };

  const handleReturnRequest = (id: number) => {
    const comment = prompt("Enter return comments (required for user to understand what needs to be changed):");
    if (comment) {
      returnMutation.mutate({ id, comment });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Review, manage, and monitor all purchase requests across the organization.
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select value={filterForm.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <Select value={filterForm.department} onValueChange={(value) => handleFilterChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {Array.isArray(departments) && departments.map((dept: any) => (
                      <SelectItem key={dept.dept_number || dept.id || dept.value} value={dept.dept_name || dept.value}>{dept.dept_name || dept.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <Select value={filterForm.location} onValueChange={(value) => handleFilterChange("location", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {Array.isArray(locations) && locations.map((loc: string) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search requests..."
                    value={filterForm.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button className="bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]" onClick={handleApplyFilters}>
                  Filter
                </Button>
                <Button 
                  variant="outline" 
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => handleExportToXLSX(requests || [])}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <div className="flex space-x-2">
              <Button
                variant={filters.status === "pending" ? "default" : "outline"}
                className={filters.status === "pending" ? "bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]" : ""}
                onClick={() => {
                  setFilters({ status: "pending", department: "all", location: "all", search: "" });
                  setFilterForm({ status: "pending", department: "all", location: "all", search: "" });
                }}>
                Pending Requests
              </Button>
              <Button
                variant={filters.status === "all" ? "default" : "outline"}
                className={filters.status === "all" ? "bg-[hsl(207,90%,54%)] hover:bg-[hsl(211,100%,29%)]" : ""}
                onClick={() => {
                  setFilters({ status: "all", department: "all", location: "all", search: "" });
                  setFilterForm({ status: "all", department: "all", location: "all", search: "" });
                }}>
                All Purchase Requests
              </Button>
               
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(requests) && requests.length > 0 ? (
                    requests.slice((page - 1) * pageSize, page * pageSize).map((request: any) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.title}</div>
                            <div className="text-sm text-gray-500">{request.requisitionNumber}</div>
                            <div className="text-xs text-gray-400">
                              {formatDate(request.requestDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const r = request.requester;
                            const requesterId = r?.id || r?.emp_code || request.requesterId || r;
                            const user = Array.isArray(users) && users.find(
                              (u: any) => u.id === requesterId || u.emp_code === requesterId
                            );
                            return user?.fullName || user?.name || r?.fullName || r?.name || r?.emp_code || request.requesterId || r || '';
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{request.department}</div>
                          <div className="text-sm text-gray-500">{request.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(request.totalEstimatedCost)}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" className="text-[hsl(207,90%,54%)]"
                              onClick={() => handleViewDetails(request)}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-600" 
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={request.status === 'approved' || request.status === 'rejected' || request.status === 'returned'}>Approve</Button>
                            <Button variant="ghost" size="sm" className="text-yellow-600"
                              onClick={() => handleReturnRequest(request.id)}
                              disabled={request.status === 'approved' || request.status === 'rejected'}>Return</Button>
                            <Button variant="ghost" size="sm" className="text-red-600"
                              onClick={() => handleRejectRequest(request.id)}
                              disabled={request.status === 'approved' || request.status === 'rejected'}>Reject</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No purchase requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bulk Actions */}
            {selectedRequests.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                {/* ...bulk actions... */}
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
                <StatusBadge
                  status={selectedRequest?.status}
                  className="mr-4"
                  daysPending={selectedRequest?.status === 'pending'
                    ? Math.floor((Date.now() - new Date(selectedRequest?.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                    : undefined}
                  approverLevel={selectedRequest?.status === 'pending' ? selectedRequest?.currentApprovalLevel : undefined}
                />
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
                        <FileText className="h-5 w-5 mr-2 text-blue-600" />
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
                        <span className="ml-2 font-medium">{(() => {
                          const r = selectedRequest?.requester;
                          const requesterId = r?.id || r?.emp_code || selectedRequest?.requesterId || r;
                          const user = Array.isArray(users) && users.find(
                            (u: any) => u.id === requesterId || u.emp_code === requesterId
                          );
                          return user?.fullName || user?.name || r?.fullName || r?.name || r?.emp_code || selectedRequest?.requesterId || r || '';
                        })()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">Department:</span>
                        <span className="ml-2 font-medium">{selectedRequest?.department}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-500">Location:</span>
                        <span className="ml-2 font-medium">{selectedRequest?.location}</span>
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
                  <LineItemsGrid
                    items={typeof requestDetails === 'object' && requestDetails !== null && 'lineItems' in requestDetails && Array.isArray((requestDetails as any).lineItems) ? (requestDetails as any).lineItems : []}
                    onItemsChange={() => {}}
                    editable={false}
                  />
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

                {selectedRequest && (
                  <div>
                    {selectedRequest.id && (
                      <>
                        <Comments purchaseRequestId={selectedRequest.id} />
                        <AuditLog 
                          purchaseRequestId={selectedRequest.id}
                          requester={(() => {
                            const r = selectedRequest?.requester;
                            const requesterId = r?.id || r?.emp_code || selectedRequest?.requesterId || r;
                            const user = Array.isArray(users) && users.find(
                              (u: any) => u.id === requesterId || u.emp_code === requesterId
                            );
                            return user || r || null;
                          })()}
                          createdAt={selectedRequest?.createdAt}
                        />
                      </>
                    )}
                    <h3 className="text-lg font-semibold mb-4">Approval Progress</h3>
                    <ApprovalProgress request={typeof requestDetails === 'object' && requestDetails !== null && Object.keys(requestDetails).length > 0 ? requestDetails : selectedRequest} />
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