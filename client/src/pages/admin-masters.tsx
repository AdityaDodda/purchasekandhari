import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Building, MapPin, Shield, Settings, Package, Truck, Plus, Edit, Trash2, Save, X, Search, Download } from "lucide-react";
import { useForm } from 'react-hook-form';
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest1 } from "@/lib/queryClient";
import {Pagination,PaginationContent,PaginationItem,PaginationLink,PaginationPrevious,PaginationNext,} from "@/components/ui/pagination";
import * as XLSX from 'xlsx';

// Utility function to export data to an XLSX file.
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

type MasterType = 'users' | 'entities' | 'departments' | 'locations' | /*'roles' |*/ 'approval-matrix' | 'escalation-matrix' | 'inventory' | 'vendors';

// Added missing properties to the interface
interface MasterTableProps {
  title: string;
  description: string;
  columns: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
  data: any[];
  isLoading: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  totalItems: number;
}

export default function AdminMasters() {
  const [activeTab, setActiveTab] = useState<MasterType>('users');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentPage(1); 
  }, [activeTab, searchQuery]);

  const { data: apiResponse, isLoading } = useQuery<{ data: any[]; totalCount: number }>({
    queryKey: ['adminMasters', activeTab, searchQuery, currentPage, pageSize], 
    queryFn: async ({ queryKey }) => {
      const [_queryName, type, search, page, size] = queryKey;
      
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search.toString());
      }
      params.append('page', page.toString());
      params.append('pageSize', size.toString());

      const url = `/api/admin/masters/${type}?${params.toString()}`;
      return await apiRequest1('GET', url); 
    },
    placeholderData: (previousData) => previousData, 
    select: (data) => ({
      data: data?.data || [],
      totalCount: data?.totalCount ?? 0,
    }),
  });

  const masterData = apiResponse?.data || [];
  const totalItems = apiResponse?.totalCount || 0;

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: MasterType; id: number }) => {
      await apiRequest1('DELETE', `/api/admin/masters/${type}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMasters', activeTab] });
      toast({ title: "Success", description: "Record deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate({ type: activeTab, id });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowAddDialog(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowAddDialog(true);
  };

  const masterTabs = [
    { id: 'users', label: 'Users Master', icon: Users },
    { id: 'entities', label: 'Entity Master', icon: Building },
    { id: 'departments', label: 'Department Master', icon: Building },
    { id: 'locations', label: 'Location Master', icon: MapPin },
    // { id: 'roles', label: 'Role Master', icon: Shield },
    { id: 'approval-matrix', label: 'Approval Matrix', icon: Settings },
    { id: 'escalation-matrix', label: 'Escalation Matrix', icon: Settings },
    { id: 'inventory', label: 'Inventory Master', icon: Package },
    { id: 'vendors', label: 'Vendor Master', icon: Truck },
  ];

  const renderMasterTable = (type: MasterType, title: string, description: string, columns: any[]) => (
    <TabsContent value={type} key={type}>
      <MasterTable 
        title={title}
        description={description}
        data={masterData}
        isLoading={isLoading}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageSize={pageSize}
        totalItems={totalItems}
      />
    </TabsContent>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Masters</h1>
          <p className="text-gray-600">Manage system master data and configurations</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MasterType)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-1">
            {masterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center justify-center p-2 text-xs"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <span className="hidden lg:inline">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
            
          {/* NOTE: The `key` in each column definition MUST EXACTLY MATCH the property name in the JSON object from your API for that record type. */}
          {renderMasterTable('users', 'Users Master', 'Manage system users and their access permissions', [
            { key: 'emp_code', label: 'Emp Code' },
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email ID' },
            { key: 'mobile_no', label: 'Mobile No' },
            { key: 'department', label: 'Department' },
            { key: 'manager_name', label: 'Manager name' },
            { key: 'manager_email', label: 'Manager email'},
            { key: 'entity', label: 'Entity' },
            { key: 'location', label: 'Location' },
            { key: 'site', label: 'Site' },
            // { key: 'role', label: 'Role' },
            { key: 'description', label: 'Description'},
            { key: 'erp_id', label: 'ERP ID'},
          ])}

          {renderMasterTable('entities', 'Entity Master', 'Manage business entities and organizational units', [
            { key: 'code', label: 'Entity Code' },
            { key: 'name', label: 'Entity Name' },
            { key: 'description', label: 'Description' },
            { key: 'parentEntity', label: 'Parent Entity' },
            { key: 'isActive', label: 'Status', render: (value: boolean) => (
              <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
            )},
          ])}

          {renderMasterTable('departments', 'Department Master', 'Manage organizational departments and their hierarchies', [
            { key: 'dept_number', label: 'Dept Number' },
            { key: 'dept_name', label: 'Department Name' },
          ])}

          {renderMasterTable('locations', 'Location Master', 'Manage office locations and geographical sites', [
            { key: 'code', label: 'Location Code' },
            { key: 'name', label: 'Location Name' },
            { key: 'address', label: 'Address' },
            { key: 'city', label: 'City' },
            { key: 'state', label: 'State' },
            { key: 'country', label: 'Country' },
            { key: 'isActive', label: 'Status', render: (value: boolean) => (
              <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
            )},
          ])}

          {/* {renderMasterTable('roles', 'Role Master', 'Manage user roles and permission levels', [
            { key: 'code', label: 'Role Code' },
            { key: 'name', label: 'Role Name' },
            { key: 'description', label: 'Description' },
            { key: 'level', label: 'Authority Level' },
            { key: 'permissions', label: 'Permissions', render: (value: string[]) => (
              <div className="flex flex-wrap gap-1">
                {value?.slice(0, 2).map((perm: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">{perm}</Badge>
                ))}
                {value?.length > 2 && <Badge variant="outline" className="text-xs">+{value.length - 2}</Badge>}
              </div>
            )},
            { key: 'isActive', label: 'Status', render: (value: boolean) => (
              <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
            )},
          ])} */}

          {renderMasterTable('approval-matrix', 'Approval Matrix', 'Defines the approval chain for specific requesters.', [
            { key: 'emp_code', label: 'Requester Code' },
            { key: 'name', label: 'Requester Name' },
            { key: 'department', label: 'Department' },
            { key: 'site', label: 'Site' },
            { key: 'approver_1_name', label: 'Approver 1 Name' },
            { key: 'approver_1_email', label: 'Approver 1 Email' },
            { key: 'approver_1_emp_code', label: 'Approver 1 Code' },
            { key: 'approver_2_name', label: 'Approver 2 Name' },
            { key: 'approver_2_email', label: 'Approver 2 Email' },
            { key: 'approver_2_emp_code', label: 'Approver 2 Code' },
            { key: 'approver_3a_name', label: 'Approver 3A Name' },
            { key: 'approver_3a_email', label: 'Approver 3A Email' },
            { key: 'approver_3a_emp_code', label: 'Approver 3A Code' },
            { key: 'approver_3b_name', label: 'Approver 3B Name' },
            { key: 'approver_3b_email', label: 'Approver 3B Email' },
            { key: 'approver_3b_emp_code', label: 'Approver 3B Code' },
          ])}

          {renderMasterTable('escalation-matrix', 'Escalation Matrix', 'Configure escalation rules and timeframes', [
            { key: 'site', label: 'Site/Entity' },
            { key: 'location', label: 'Location' },
            { key: 'escalationDays', label: 'Days to Escalate' },
            { key: 'escalationLevel', label: 'Escalation Level' },
            { key: 'approverName', label: 'Escalation Approver' },
            { key: 'approverEmail', label: 'Approver Email' },
            { key: 'isActive', label: 'Status', render: (value: boolean) => (
              <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
            )},
          ])}

          {renderMasterTable('inventory', 'Inventory Master', 'Manage inventory items and stock levels', [
            { key: 'itemCode', label: 'Item Code' },
            { key: 'type', label: 'Type' },
            { key: 'name', label: 'Item Name' },
            { key: 'quantity', label: 'Available Qty' },
            { key: 'unitOfMeasure', label: 'UOM' },
            { key: 'location', label: 'Storage Location' },
            { key: 'isActive', label: 'Status', render: (value: boolean) => (
              <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
            )},
          ])}

          {renderMasterTable('vendors', 'Vendor Master', 'Manage vendor information and details', [
            { key: 'vendorCode', label: 'Vendor Code' },
            { key: 'name', label: 'Vendor Name' },
            { key: 'contactPerson', label: 'Contact Person' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'category', label: 'Category' },
            { key: 'paymentTerms', label: 'Payment Terms' },
            { key: 'isActive', label: 'Status', render: (value: boolean) => (
              <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
            )},
          ])}
        </Tabs>

        {showAddDialog && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? `Edit ${activeTab.replace(/-/g, ' ')}` : `Add New ${activeTab.replace(/-/g, ' ')}`}</DialogTitle>
              </DialogHeader>
              <MasterForm 
                type={activeTab}
                editingItem={editingItem}
                onClose={() => setShowAddDialog(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// REMOVED: Unused wrapper components (UsersMaster, EntityMaster, etc.) for simplicity.
// The `renderMasterTable` function handles this more efficiently.

// Generic Master Table Component
function MasterTable({ 
  title, 
  description, 
  data, 
  isLoading, 
  columns, 
  onEdit, 
  onDelete, 
  onAdd, 
  searchQuery, 
  setSearchQuery,
  currentPage,
  setCurrentPage,
  pageSize,
  totalItems,
}: MasterTableProps) {
  
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
            <Button variant="outline" onClick={() => exportToXLSX(data, `${title.replace(/\s+/g, '_').toLowerCase()}_export.xlsx`)}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
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
                  {columns.map((column) => (
                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.length > 0 ? (
                  data.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {columns.map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* IMPORTANT: This relies on `item[column.key]` existing. Ensure API response keys match column keys. */}
                          {column.render ? column.render(item[column.key]) : item[column.key] ?? '-'}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="text-blue-600">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-6 py-4 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalItems > 0 && totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(p => p - 1)} aria-disabled={!hasPrevious} className={!hasPrevious ? "pointer-events-none opacity-50" : ""}/>
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink isActive={currentPage === pageNum} onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(p => p + 1)} aria-disabled={!hasNext} className={!hasNext ? "pointer-events-none opacity-50" : ""}/>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// MasterForm now has a fieldMap that is consistent with the table columns
function MasterForm({ type, editingItem, onClose }: { type: MasterType, editingItem: any, onClose: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: editingItem || {},
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = Boolean(editingItem);

  // This field map is now synchronized with the `columns` definitions in AdminMasters
  const fieldMap: Record<string, { key: string; label: string; type?: string }[]> = {
    users: [
      { key: 'emp_code', label: 'Emp Code' },
      { key: 'name', label: 'Full Name' },
      { key: 'email', label: 'Email ID', type: 'email' },
      { key: 'mobile_no', label: 'Mobile No' },
      { key: 'department', label: 'Department' },
      { key: 'manager_name', label: 'Manager Name' },
      { key: 'manager_email', label: 'Manager Email', type: 'email'},
      { key: 'entity', label: 'Entity' },
      { key: 'location', label: 'Location' },
      { key: 'site', label: 'Site' },
      // { key: 'role', label: 'Role' },
      { key: 'description', label: 'Description'},
      { key: 'erp_id', label: 'ERP ID'},
    ],
    entities: [
      { key: 'code', label: 'Entity Code' },
      { key: 'name', label: 'Entity Name' },
      { key: 'description', label: 'Description' },
      { key: 'parentEntity', label: 'Parent Entity' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    departments: [
      { key: 'dept_number', label: 'Dept Number' },
      { key: 'dept_name', label: 'Department Name' },
    ],
    locations: [
      { key: 'code', label: 'Location Code' },
      { key: 'name', label: 'Location Name' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    // roles: [
    //   { key: 'code', label: 'Role Code' },
    //   { key: 'name', label: 'Role Name' },
    //   { key: 'description', label: 'Description' },
    //   { key: 'level', label: 'Authority Level', type: 'number' },
    //   { key: 'permissions', label: 'Permissions (comma separated)' },
    //   { key: 'isActive', label: 'Active', type: 'checkbox' },
    // ],
    'approval-matrix': [
      { key: 'emp_code', label: 'Requester Code' },
      { key: 'name', label: 'Requester Name' },
      { key: 'department', label: 'Department' },
      { key: 'site', label: 'Site' },
      { key: 'approver_1_name', label: 'Approver 1 Name' },
      { key: 'approver_1_email', label: 'Approver 1 Email', type: 'email' },
      { key: 'approver_1_emp_code', label: 'Approver 1 Code' },
      { key: 'approver_2_name', label: 'Approver 2 Name' },
      { key: 'approver_2_email', label: 'Approver 2 Email', type: 'email' },
      { key: 'approver_2_emp_code', label: 'Approver 2 Code' },
    ],
    'escalation-matrix': [
      { key: 'site', label: 'Site/Entity' },
      { key: 'location', label: 'Location' },
      { key: 'escalationDays', label: 'Days to Escalate', type: 'number' },
      { key: 'escalationLevel', label: 'Escalation Level', type: 'number' },
      { key: 'approverName', label: 'Escalation Approver' },
      { key: 'approverEmail', label: 'Approver Email', type: 'email' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    inventory: [
      { key: 'itemCode', label: 'Item Code' },
      { key: 'type', label: 'Type' },
      { key: 'name', label: 'Item Name' },
      { key: 'quantity', label: 'Available Qty', type: 'number' },
      { key: 'unitOfMeasure', label: 'UOM' },
      { key: 'location', label: 'Storage Location' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    vendors: [
      { key: 'vendorCode', label: 'Vendor Code' },
      { key: 'name', label: 'Vendor Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'category', label: 'Category' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  const fields = fieldMap[type] || [];

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // For editing, permissions are often handled as an array. If it's a string, split it.
      if (data.permissions && typeof data.permissions === 'string') {
        data.permissions = data.permissions.split(',').map(s => s.trim());
      }
      if (isEdit) {
        return await apiRequest1('PUT', `/api/admin/masters/${type}/${editingItem.id}`, data);
      } else {
        return await apiRequest1('POST', `/api/admin/masters/${type}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMasters', type] }); 
      toast({ title: "Success", description: `Record ${isEdit ? 'updated' : 'created'} successfully.` });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field.key} className={field.type === 'checkbox' ? 'md:col-span-2 flex items-center' : ''}>
          <label htmlFor={field.key} className={`block text-sm font-medium text-gray-700 mb-1 ${field.type === 'checkbox' ? 'mr-4' : ''}`}>
            {field.label}
          </label>
          {field.type === 'checkbox' ? (
            <input
              id={field.key}
              type="checkbox"
              {...register(field.key)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          ) : (
            <Input
              id={field.key}
              type={field.type || 'text'}
              {...register(field.key, { valueAsNumber: field.type === 'number' })}
              className="w-full"
            />
          )}
        </div>
      ))}
      <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
        <Button variant="outline" type="button" onClick={onClose} disabled={mutation.isPending}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> {isEdit ? 'Update' : 'Save'}</>}
        </Button>
      </div>
    </form>
  );
}