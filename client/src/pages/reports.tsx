import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Filter, Calendar, Users, MapPin, Building, FileText, Eye } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { CommentsAuditLog } from "@/components/ui/comments-audit-log";
import { ApprovalProgress } from "./my-requests";

import { DEPARTMENTS, LOCATIONS, REQUEST_STATUSES } from "@/lib/constants";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export default function Reports() {
  const [filters, setFilters] = useState({
    status: "all",
    department: "all",
    location: "all",
    requester: "all",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [calendarOpenStart, setCalendarOpenStart] = useState(false);
  const [calendarOpenEnd, setCalendarOpenEnd] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/reports/purchase-requests", filters],
  });

  const { data: requestDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/purchase-requests", selectedRequest?.id, "details"],
    enabled: !!selectedRequest?.id,
  });

  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // For converting to csv format
  const convertToCSV = (data: any[]) => {
  if (!data.length) return "";

  const headers = Object.keys(data[0]).filter(key => typeof data[0][key] !== "object");
  const rows = data.map(row =>
    headers.map(fieldName => {
      let value = row[fieldName];
      if (typeof value === "string") {
        value = value.replace(/"/g, '""');
      }
      return `"${value ?? ""}"`;
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\r\n");
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
};

 const handleExport = () => {
  if (!filteredRequests.length) {
    alert("No data available to export.");
    return;
  }

  const simplifiedData = filteredRequests.map(req => ({
    RequisitionNumber: req.requisitionNumber,
    Title: req.title,
    Requester: req.requester?.fullName,
    Department: req.department,
    Location: req.location,
    Amount: req.totalEstimatedCost,
    Status: req.status,
    RequestDate: formatDate(req.requestDate),
  }));

  const csv = convertToCSV(simplifiedData);
  downloadCSV(csv, "purchase-request-report.csv");
};

const filteredRequests = Array.isArray(requests)
  ? requests.filter((req: any) => {
      if (filters.status !== "all" && req.status !== filters.status) return false;
      if (filters.department !== "all" && req.department !== filters.department) return false;
      if (filters.location !== "all" && req.location !== filters.location) return false;
      if (filters.requester !== "all" && req.requester?.id?.toString() !== filters.requester) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          req.title?.toLowerCase().includes(search) ||
          req.requisitionNumber?.toLowerCase().includes(search) ||
          req.requester?.fullName?.toLowerCase().includes(search);
        if (!matches) return false;
      }
      // Date range filter
      if (filters.startDate) {
        const reqDate = new Date(req.requestDate);
        const start = new Date(filters.startDate);
        if (reqDate < start) return false;
      }
      if (filters.endDate) {
        const reqDate = new Date(req.requestDate);
        const end = new Date(filters.endDate);
        // Add 1 day to endDate to make it inclusive
        end.setDate(end.getDate() + 1);
        if (reqDate >= end) return false;
      }
      return true;
    })
  : [];

  useEffect(() => {
    setPage(1);
  }, [filteredRequests]);

  // Helper to parse dd-mm-yyyy to Date
  function parseDDMMYYYY(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split("-");
    if (!day || !month || !year) return null;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  // Helper to format Date to dd-mm-yyyy
  function formatToDDMMYYYY(date: Date | null): string {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Request Reports</h1>
          <p className="text-gray-600">Generate comprehensive reports with advanced filtering options</p>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <Popover open={calendarOpenStart} onOpenChange={setCalendarOpenStart}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => setCalendarOpenStart(true)}
                    >
                      {filters.startDate
                        ? formatDate(filters.startDate)
                        : <span className="text-gray-400">Select date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-auto">
                    <UiCalendar
                      mode="single"
                      selected={parseDDMMYYYY(filters.startDate)}
                      onSelect={(date) => {
                        handleFilterChange("startDate", formatToDDMMYYYY(date));
                        setCalendarOpenStart(false);
                      }}
                      fromDate={new Date(2000, 0, 1)}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">Format: dd-mm-yyyy</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <Popover open={calendarOpenEnd} onOpenChange={setCalendarOpenEnd}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => setCalendarOpenEnd(true)}
                    >
                      {filters.endDate
                        ? formatDate(filters.endDate)
                        : <span className="text-gray-400">Select date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-auto">
                    <UiCalendar
                      mode="single"
                      selected={parseDDMMYYYY(filters.endDate)}
                      onSelect={(date) => {
                        handleFilterChange("endDate", formatToDDMMYYYY(date));
                        setCalendarOpenEnd(false);
                      }}
                      fromDate={new Date(2000, 0, 1)}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">Format: dd-mm-yyyy</p>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {REQUEST_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Select value={filters.department} onValueChange={(value) => handleFilterChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <Select value={filters.location} onValueChange={(value) => handleFilterChange("location", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {LOCATIONS.map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Requester</label>
                <Select value={filters.requester} onValueChange={(value) => handleFilterChange("requester", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {Array.isArray(users) && users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search requests..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange("search", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Export Button */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">&nbsp;</label>
                <Button 
                  onClick={handleExport}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Total Records: <span className="font-bold text-gray-900">{filteredRequests.length}</span>
                </span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Submitted: {filteredRequests.filter((r: any) => r.status === 'submitted').length}</span>
                <span>Pending: {filteredRequests.filter((r: any) => r.status === 'pending').length}</span>
                <span>Approved: {filteredRequests.filter((r: any) => r.status === 'approved').length}</span>
                <span>Rejected: {filteredRequests.filter((r: any) => r.status === 'rejected').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Request Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
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
                        Requester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
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
                    {filteredRequests.length > 0 ? (
                      filteredRequests.slice((page - 1) * pageSize, page * pageSize).map((request: any) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.requisitionNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.requester?.fullName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(request.totalEstimatedCost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.requestDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-[hsl(207,90%,54%)]"
                              onClick={() => handleViewDetails(request)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                          No records found matching the selected criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {filteredRequests.length > pageSize && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    aria-disabled={page === 1}
                  />
                </PaginationItem>
                {[...Array(Math.ceil(filteredRequests.length / pageSize))].map((_, i) => (
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
                    onClick={() => setPage(p => Math.min(Math.ceil(filteredRequests.length / pageSize), p + 1))}
                    aria-disabled={page === Math.ceil(filteredRequests.length / pageSize)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

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
                        <span className="ml-2 font-medium">{selectedRequest?.requester?.fullName}</span>
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
                  <h3 className="text-lg font-semibold mb-4">
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
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No line items found for this request</p>
                      </div>
                    )}
                  </div>
                </div>

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