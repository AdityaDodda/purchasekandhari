import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Download, Filter, TrendingUp, Clock, DollarSign, BarChart3, Package, Calendar, MapPin, Database } from "lucide-react";
import qs from "query-string";

import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { LineItemsGrid } from "@/components/ui/line-items-grid";
import { CommentsAuditLog } from "@/components/ui/comments-audit-log";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
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
  
  const handleExportToCSV = (dataToExport: any[]) => {
    if (!dataToExport || dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "There is no data to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Requisition Number", "Title", "Status", "Total Cost", 
      "Requester Name", "Requester Employee #", "Department", 
      "Location", "Request Date"
    ];

    const csvRows = dataToExport.map(req => {
      const formatCell = (value: any) => {
        const str = String(value ?? '');
        return str.includes(',') ? `"${str}"` : str;
      };

      return [
        formatCell(req.requisitionNumber),
        formatCell(req.title),
        formatCell(req.status),
        formatCell(req.totalEstimatedCost),
        formatCell(req.requester?.fullName),
        formatCell(req.requester?.employeeNumber),
        formatCell(req.department),
        formatCell(req.location),
        formatCell(formatDate(req.requestDate)),
      ].join(',');
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `purchase-requests-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBulkExport = () => {
    if (!requests) return;
    const selectedData = requests.filter((req: any) => selectedRequests.includes(req.id));
    handleExportToCSV(selectedData);
  };

  // Action mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) => {
      return apiRequest("POST", `/api/purchase-requests/${id}/approve`, { comments });
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
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) => {
      return apiRequest("POST", `/api/purchase-requests/${id}/reject`, { comments });
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
    mutationFn: async ({ id, comments }: { id: number; comments?: string }) => {
      return apiRequest("POST", `/api/purchase-requests/${id}/return`, { comments });
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
    const comments = prompt("Enter approval comments (optional):");
    approveMutation.mutate({ id, comments: comments || undefined });
  };

  const handleRejectRequest = (id: number) => {
    const comments = prompt("Enter rejection reason:");
    if (comments) {
      rejectMutation.mutate({ id, comments });
    }
  };

  const handleReturnRequest = (id: number) => {
    const comments = prompt("Enter return comments (required for user to understand what needs to be changed):");
    if (comments) {
      returnMutation.mutate({ id, comments });
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
          {/* ...cards... */}
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
                    <SelectItem value="submitted">Submitted</SelectItem>
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
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Quality Control">Quality Control</SelectItem>
                    <SelectItem value="Sales & Marketing">Sales & Marketing</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
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
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Delhi">Delhi</SelectItem>
                    <SelectItem value="Bangalore">Bangalore</SelectItem>
                    <SelectItem value="Chennai">Chennai</SelectItem>
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
                  onClick={() => handleExportToCSV(requests || [])}>
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
                {/* ...table headers and body... */}
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <Checkbox
                        checked={Array.isArray(requests) && requests.length > 0 && selectedRequests.length === requests.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
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
                          <Checkbox
                            checked={selectedRequests.includes(request.id)}
                            onCheckedChange={() => handleSelectRequest(request.id)}
                          />
                        </td>
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
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-[hsl(207,90%,54%)] rounded-full flex items-center justify-center mr-3">
                              <span className="text-white text-xs font-semibold">
                                {request.requester?.fullName?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {request.requester?.fullName || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {request.requester?.employeeNumber || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{request.department}</div>
                          <div className="text-sm text-gray-500">{request.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(request.totalEstimatedCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={request.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            {/* <Button variant="ghost" size="sm" className="text-[hsl(207,90%,54%)]"
                            onClick={() => handleViewDetails(request)}>View</Button> */}
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
          {/* ...dialog content... */}
          {selectedRequest && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Approval Progress</h3>
              <ApprovalProgress request={selectedRequest} />
              {/* Show Comments & Audit Log below approval progress only when viewing details */}
              <CommentsAuditLog purchaseRequestId={selectedRequest.id} />
            </div>
          )}
        </Dialog>
      </div>
    </div>
  );
}