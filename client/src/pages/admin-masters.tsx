import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Building, MapPin, Shield, Settings, Package, Truck, 
  Plus, Edit, Trash2, Save, X, Search, Download 
} from "lucide-react";
import { useForm } from 'react-hook-form';

import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest1 } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

type MasterType = 'users' | 'entities' | 'departments' | 'locations' | 'roles' | 'approval-matrix' | 'escalation-matrix' | 'inventory' | 'vendors';

export default function AdminMasters() {
  const [activeTab, setActiveTab] = useState<MasterType>('users');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generic queries for all master data
  const { data: masterData, isLoading } = useQuery({
    queryKey: ['/api/admin/masters/users', activeTab],
    queryFn: async () => {
      return await apiRequest1('GET', `/api/admin/masters/${activeTab}`);
    },
  });

  const filteredData = Array.isArray(masterData) 
    ? masterData.filter((item: any) => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : [];

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: MasterType; id: number }) => {
      await apiRequest1('DELETE', `/api/admin/masters/${type}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/masters', activeTab] });
      toast({ title: "Success", description: "Record deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    { id: 'roles', label: 'Role Master', icon: Shield },
    { id: 'approval-matrix', label: 'Approval Matrix', icon: Settings },
    { id: 'escalation-matrix', label: 'Escalation Matrix', icon: Settings },
    { id: 'inventory', label: 'Inventory Master', icon: Package },
    { id: 'vendors', label: 'Vendor Master', icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Masters</h1>
          <p className="text-gray-600">Manage system master data and configurations</p>
        </div>

        {/* Master Data Tabs */}
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

          {/* Users Master */}
          <TabsContent value="users">
            <UsersMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Entity Master */}
          <TabsContent value="entities">
            <EntityMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Department Master */}
          <TabsContent value="departments">
            <DepartmentMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Location Master */}
          <TabsContent value="locations">
            <LocationMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Role Master */}
          <TabsContent value="roles">
            <RoleMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Approval Matrix */}
          <TabsContent value="approval-matrix">
            <ApprovalMatrix 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Escalation Matrix */}
          <TabsContent value="escalation-matrix">
            <EscalationMatrix 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Inventory Master */}
          <TabsContent value="inventory">
            <InventoryMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>

          {/* Vendor Master */}
          <TabsContent value="vendors">
            <VendorMaster 
              data={filteredData}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
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

// Master Table Components
function UsersMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Users Master"
      description="Manage system users and their access permissions"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'employeeNumber', label: 'Emp Number' },
        { key: 'fullName', label: 'Full Name' },
        { key: 'email', label: 'Email ID' },
        { key: 'department', label: 'Department' },
        { key: 'manager', label: 'Manager' },
        { key: 'entity', label: 'Entity' },
        { key: 'location', label: 'Location' },
        { key: 'site', label: 'Site' },
        { key: 'role', label: 'Role' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function EntityMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Entity Master"
      description="Manage business entities and organizational units"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'code', label: 'Entity Code' },
        { key: 'name', label: 'Entity Name' },
        { key: 'description', label: 'Description' },
        { key: 'parentEntity', label: 'Parent Entity' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function DepartmentMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Department Master"
      description="Manage organizational departments and their hierarchies"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'code', label: 'Dept Code' },
        { key: 'name', label: 'Department Name' },
        { key: 'description', label: 'Description' },
        { key: 'headOfDepartment', label: 'HOD' },
        { key: 'costCenter', label: 'Cost Center' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function LocationMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Location Master"
      description="Manage office locations and geographical sites"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'code', label: 'Location Code' },
        { key: 'name', label: 'Location Name' },
        { key: 'address', label: 'Address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'country', label: 'Country' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function RoleMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Role Master"
      description="Manage user roles and permission levels"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'code', label: 'Role Code' },
        { key: 'name', label: 'Role Name' },
        { key: 'description', label: 'Description' },
        { key: 'level', label: 'Authority Level' },
        { key: 'permissions', label: 'Permissions', render: (value: string[]) => (
          <div className="flex flex-wrap gap-1">
            {value?.slice(0, 2).map((perm: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {perm}
              </Badge>
            ))}
            {value?.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{value.length - 2}
              </Badge>
            )}
          </div>
        )},
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function ApprovalMatrix({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Approval Matrix"
      description="Define approval workflows and authorization limits"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'department', label: 'Department' },
        { key: 'location', label: 'Location' },
        { key: 'level', label: 'Approval Level' },
        { key: 'role', label: 'Approver Role' },
        { key: 'minAmount', label: 'Min Amount', render: (value: number) => formatCurrency(value) },
        { key: 'maxAmount', label: 'Max Amount', render: (value: number) => formatCurrency(value) },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function EscalationMatrix({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Escalation Matrix"
      description="Configure escalation rules and timeframes"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'site', label: 'Site/Entity' },
        { key: 'location', label: 'Location' },
        { key: 'escalationDays', label: 'Days to Escalate' },
        { key: 'escalationLevel', label: 'Escalation Level' },
        { key: 'approverName', label: 'Escalation Approver' },
        { key: 'approverEmail', label: 'Approver Email' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function InventoryMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Inventory Master"
      description="Manage inventory items and stock levels"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'itemCode', label: 'Item Code' },
        { key: 'type', label: 'Type' },
        { key: 'name', label: 'Item Name' },
        { key: 'quantity', label: 'Available Qty' },
        { key: 'unitOfMeasure', label: 'UOM' },
        { key: 'location', label: 'Storage Location' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

function VendorMaster({ data, isLoading, onEdit, onDelete, onAdd, searchQuery, setSearchQuery }: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <MasterTable
      title="Vendor Master"
      description="Manage vendor information and details"
      data={data}
      isLoading={isLoading}
      columns={[
        { key: 'vendorCode', label: 'Vendor Code' },
        { key: 'name', label: 'Vendor Name' },
        { key: 'contactPerson', label: 'Contact Person' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'category', label: 'Category' },
        { key: 'paymentTerms', label: 'Payment Terms' },
        { key: 'isActive', label: 'Status', render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
        )},
      ]}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

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
  setSearchQuery 
}: any) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [data]);

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
            <Button variant="outline" onClick={() => exportToCSV(data, `${title.replace(/\s+/g, '_').toLowerCase()}_export.csv`)}>
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
                  {columns.map((column: any) => (
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
                  data.slice((page - 1) * pageSize, page * pageSize).map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {columns.map((column: any) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {column.render ? column.render(item[column.key]) : item[column.key] || '-'}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onEdit(item)}
                            className="text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onDelete(item.id)}
                            className="text-red-600"
                          >
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
            {/* Pagination Controls */}
            {data.length > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        aria-disabled={page === 1}
                      />
                    </PaginationItem>
                    {[...Array(Math.ceil(data.length / pageSize))].map((_, i) => (
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
                        onClick={() => setPage(p => Math.min(Math.ceil(data.length / pageSize), p + 1))}
                        aria-disabled={page === Math.ceil(data.length / pageSize)}
                      />
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

// Form Component for Add/Edit
function MasterForm({ type, editingItem, onClose }: any) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: editingItem || {},
  });
  const queryClient = useQueryClient();
  const isEdit = Boolean(editingItem);

  // Define fields for each master type
  const fieldMap: Record<string, { key: string; label: string; type?: string }[]> = {
    users: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'employeeNumber', label: 'Employee Number' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'department', label: 'Department' },
      { key: 'location', label: 'Location' },
      { key: 'role', label: 'Role' },
    ],
    entities: [
      { key: 'code', label: 'Entity Code' },
      { key: 'name', label: 'Entity Name' },
      { key: 'description', label: 'Description' },
      { key: 'parentEntityId', label: 'Parent Entity ID', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    departments: [
      { key: 'code', label: 'Department Code' },
      { key: 'name', label: 'Department Name' },
      { key: 'description', label: 'Description' },
      { key: 'headOfDepartment', label: 'Head of Department' },
      { key: 'costCenter', label: 'Cost Center' },
      { key: 'entityId', label: 'Entity ID', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    locations: [
      { key: 'code', label: 'Location Code' },
      { key: 'name', label: 'Location Name' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'postalCode', label: 'Postal Code' },
      { key: 'entityId', label: 'Entity ID', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    roles: [
      { key: 'code', label: 'Role Code' },
      { key: 'name', label: 'Role Name' },
      { key: 'description', label: 'Description' },
      { key: 'level', label: 'Level', type: 'number' },
      { key: 'permissions', label: 'Permissions (comma separated)' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    'approval-matrix': [
      { key: 'department', label: 'Department' },
      { key: 'location', label: 'Location' },
      { key: 'level', label: 'Approval Level', type: 'number' },
      { key: 'role', label: 'Role' },
      { key: 'minAmount', label: 'Min Amount', type: 'number' },
      { key: 'maxAmount', label: 'Max Amount', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    'escalation-matrix': [
      { key: 'site', label: 'Site' },
      { key: 'location', label: 'Location' },
      { key: 'escalationDays', label: 'Escalation Days', type: 'number' },
      { key: 'escalationLevel', label: 'Escalation Level', type: 'number' },
      { key: 'approverName', label: 'Approver Name' },
      { key: 'approverEmail', label: 'Approver Email', type: 'email' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    inventory: [
      { key: 'itemCode', label: 'Item Code' },
      { key: 'type', label: 'Type' },
      { key: 'name', label: 'Item Name' },
      { key: 'description', label: 'Description' },
      { key: 'quantity', label: 'Available Qty', type: 'number' },
      { key: 'unitOfMeasure', label: 'UOM' },
      { key: 'location', label: 'Storage Location' },
      { key: 'minStockLevel', label: 'Min Stock Level', type: 'number' },
      { key: 'maxStockLevel', label: 'Max Stock Level', type: 'number' },
      { key: 'unitCost', label: 'Unit Cost', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
    vendors: [
      { key: 'vendorCode', label: 'Vendor Code' },
      { key: 'name', label: 'Vendor Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'country', label: 'Country' },
      { key: 'postalCode', label: 'Postal Code' },
      { key: 'category', label: 'Category' },
      { key: 'paymentTerms', label: 'Payment Terms' },
      { key: 'taxId', label: 'Tax ID' },
      { key: 'bankDetails', label: 'Bank Details' },
      { key: 'isActive', label: 'Active', type: 'checkbox' },
    ],
  };

  const fields = fieldMap[type] || [];

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return await apiRequest1('PUT', `/api/admin/masters/${type}/${editingItem.id}`, data);
      } else {
        return await apiRequest1('POST', `/api/admin/masters/${type}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/masters', type] });
      onClose();
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
          <Input
            type={field.type || 'text'}
            {...register(field.key)}
            defaultValue={editingItem ? editingItem[field.key] : ''}
            className="w-full"
          />
        </div>
      ))}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button" onClick={onClose} disabled={mutation.isPending}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isEdit ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

// Add this utility function at the top (after imports):
function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = data.map(row =>
    headers.map(field => {
      let value = row[field];
      if (typeof value === 'string') value = value.replace(/"/g, '""');
      return `"${value ?? ''}"`;
    }).join(',')
  );
  const csv = [headers.join(','), ...csvRows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}