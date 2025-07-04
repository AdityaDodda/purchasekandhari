import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Filter, Calendar, FileText, Eye, Users, Building, MapPin, Paperclip } from "lucide-react";
import * as XLSX from 'xlsx';
import { formatCurrency, formatDate } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { REQUEST_STATUSES } from "@/lib/constants";
import { Calendar as UiCalendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ApprovalProgress } from "@/components/ui/approval-progress";
import { Comments } from "@/components/ui/comments";
import { AuditLog } from "@/components/ui/audit-log";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineItemsGrid } from "@/components/ui/line-items-grid";

export default function UserReports() {
  const [filters, setFilters] = useState({
    status: "all",
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
  const [selectedRequester, setSelectedRequester] = useState<any>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/reports/purchase-requests", filters],
  });
  const { data: requestDetails, isLoading: isLoadingDetails } = useQuery<any>({
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };
  function exportToXLSX(data: any[], filename: string) {
    if (!data || data.length === 0) return;
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Requests');
    XLSX.writeFile(workbook, filename);
  }
  const handleExporttoXlsx = () => {
    if (!filteredRequests.length) return;
    const simplifiedData = filteredRequests.map(req => ({
      RequisitionNumber: req.requisitionNumber,
      Title: req.title,
      Department: req.department,
      Location: req.location,
      Status: req.status,
      RequestDate: formatDate(req.requestDate),
    }));
    exportToXLSX(simplifiedData, "purchase-request-report.xlsx");
  };
  const filteredRequests = Array.isArray(requests)
    ? requests.filter((req: any) => {
        if (filters.status !== "all" && req.status !== filters.status) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          const matches =
            req.title?.toLowerCase().includes(search) ||
            req.requisitionNumber?.toLowerCase().includes(search);
          if (!matches) return false;
        }
        // Date range filter
        if (filters.startDate) {
          const reqDate = new Date(req.requestDate);
          // Parse dd-mm-yyyy to yyyy-mm-dd for reliable Date object creation
          const [day, month, year] = filters.startDate.split("-");
          const start = new Date(Number(year), Number(month) - 1, Number(day));
          if (start && reqDate < start) return false;
        }
        if (filters.endDate) {
          const reqDate = new Date(req.requestDate);
          // Parse dd-mm-yyyy to yyyy-mm-dd for reliable Date object creation
          const [day, month, year] = filters.endDate.split("-");
          const end = new Date(Number(year), Number(month) - 1, Number(day));
          end.setDate(end.getDate() + 1); // Make end date inclusive for filtering
          if (reqDate >= end) return false;
        }
        return true;
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Request Reports</h1>
          <p className="text-gray-600">Generate reports with basic filtering options</p>
        </div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* IMPORTANT: Removed items-end from the grid container itself */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Start Date Filter */}
              {/* Added flex flex-col justify-end to this div */}
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <Popover open={calendarOpenStart} onOpenChange={setCalendarOpenStart}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => setCalendarOpenStart(true)}>
                      {filters.startDate ? formatDate(filters.startDate) : <span className="text-gray-400">Select date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-auto">
                    <UiCalendar
                      mode="single"
                      selected={filters.startDate ? new Date(filters.startDate.split('-').reverse().join('-')) : undefined}
                      onSelect={(date) => {
                        if (date) handleFilterChange("startDate", `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`);
                        setCalendarOpenStart(false);
                      }}
                      fromDate={new Date(2000, 0, 1)}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">Format: dd-mm-yyyy</p>
              </div>
              {/* End Date Filter */}
              {/* Added flex flex-col justify-end to this div */}
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <Popover open={calendarOpenEnd} onOpenChange={setCalendarOpenEnd}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full border rounded px-3 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" onClick={() => setCalendarOpenEnd(true)}>
                      {filters.endDate ? formatDate(filters.endDate) : <span className="text-gray-400">Select date</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 w-auto">
                    <UiCalendar
                      mode="single"
                      selected={filters.endDate ? new Date(filters.endDate.split('-').reverse().join('-')) : undefined}
                      onSelect={(date) => {
                        if (date) handleFilterChange("endDate", `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`);
                        setCalendarOpenEnd(false);
                      }}
                      // MODIFICATION HERE: Set fromDate based on selected startDate
                      fromDate={
                        filters.startDate
                          ? new Date(filters.startDate.split('-').reverse().join('-'))
                          : new Date(2000, 0, 1) // Default if no start date selected
                      }
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">Format: dd-mm-yyyy</p>
              </div>
              {/* Status Filter */}
              {/* Added flex flex-col justify-end to this div */}
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {REQUEST_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Invisible spacer to match height of date format text */}
                <p className="text-xs text-gray-500 mt-1 invisible">Format: dd-mm-yyyy</p>
              </div>
              {/* Search Filter */}
              {/* Added flex flex-col justify-end to this div */}
              <div className="flex flex-col justify-end">
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search requests..." value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} className="pl-10" />
                </div>
                {/* Invisible spacer to match height of date format text */}
                <p className="text-xs text-gray-500 mt-1 invisible">Format: dd-mm-yyyy</p>
              </div>
              {/* Export Button */}
              <div className="flex flex-col justify-end items-end mr-8">
                {/* Invisible label to align with other labels at the top */}
                <label className="text-sm font-medium text-gray-700 invisible"> </label>
                <Button onClick={handleExporttoXlsx} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                {/* Invisible spacer to match height of date format text and push button up */}
                <p className="text-xs text-gray-500 mt-1 invisible">Format: dd-mm-yyyy</p>
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
              {/* <span>Submitted: {filteredRequests.filter((r: any) => r.status === 'submitted').length}</span> */}
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
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
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
                            {request.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.location}
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
                {/* Added mr-4 to status badge to prevent overlap with dialog close button */}
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
                        <span className="ml-2 font-medium">{selectedRequester?.name || selectedRequest?.requesterId}</span>
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
                    items={requestDetails?.lineItems || []}
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
                        <AuditLog purchaseRequestId={selectedRequest.id} requester={selectedRequester} createdAt={selectedRequest.createdAt} />
                      </>
                    )}
                    <h3 className="text-lg font-semibold mb-4">Approval Progress</h3>
                    <ApprovalProgress request={selectedRequest} />
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